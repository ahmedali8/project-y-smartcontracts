import { Zero } from "@ethersproject/constants";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";

import { toWei } from "../../../../utils/format";
import {
  BIDDING_PERIOD,
  GRACE_PERIOD,
  InstallmentPlan,
  ONE_MONTH,
} from "../../../shared/constants";
import {
  getDownPayment,
  getInstallmentPerMonth,
  getTotalInstallments,
} from "../../../shared/utils";

export default function shouldBehaveLikeGetTotalEntryIds(): void {
  context("when entryId doesn't exist", function () {
    it("retrieves zero", async function () {
      expect(await this.contracts.projecty.getTotalEntryIds()).to.be.equal(Zero);
    });
  });

  context("when entryId exists", function () {
    const tokenId = 1 as const;

    const entryId = 1;
    const sellingPrice = toWei("23");
    const sellingInstallment = InstallmentPlan.ThreeMonths;

    let erc721Address: string;
    let seller: SignerWithAddress;
    let buyer: SignerWithAddress;

    before(async function () {
      erc721Address = this.mocks.erc721.address;
      seller = this.signers.accounts[0];
      buyer = this.signers.accounts[1];
    });

    beforeEach(async function () {
      // create mock erc721 token
      await this.mocks.erc721.mint(seller.address, tokenId);
      await this.mocks.erc721.connect(seller).approve(this.contracts.projecty.address, tokenId);

      // list for selling
      await this.contracts.projecty
        .connect(seller)
        .sell(erc721Address, tokenId, sellingPrice, sellingInstallment);
    });

    context("when seller selects a bid", function () {
      context("when InstallmentPlan.None bid is selected", function () {
        const bidInstallment = InstallmentPlan.None;

        const bidId = 1;
        const bidPrice = toWei("34");
        const downPayment = getDownPayment(bidInstallment, bidPrice);

        beforeEach(async function () {
          // bid
          await this.contracts.projecty.connect(buyer).bid(entryId, bidPrice, bidInstallment, {
            value: downPayment,
          });

          // bidding period over
          await time.increase(BIDDING_PERIOD);

          // select bid (down payment/first installment)
          // in our case InstallmentPlan.None so full payment done
          await this.contracts.projecty.connect(seller).selectBid(bidId);
        });

        it("decreases total entryIds", async function () {
          expect(await this.contracts.projecty.getTotalEntryIds()).to.be.equal(Zero);
        });
      });

      context(
        "when InstallmentPlan.ThreeMonths is selected and last payment of installments is claimed",
        function () {
          const bidInstallment = InstallmentPlan.ThreeMonths;

          const bidId = 1;
          const bidPrice = toWei("34");
          const totalInstallments = getTotalInstallments(bidInstallment);
          const downPayment = getDownPayment(bidInstallment, bidPrice);
          const installmentPerMonth = getInstallmentPerMonth(bidInstallment, bidPrice);

          beforeEach(async function () {
            // bid
            await this.contracts.projecty.connect(buyer).bid(entryId, bidPrice, bidInstallment, {
              value: downPayment,
            });

            // bidding period over
            await time.increase(BIDDING_PERIOD);

            // select bid (down payment/first installment)
            // in our case InstallmentPlan.None so full payment done
            await this.contracts.projecty.connect(seller).selectBid(bidId);

            await time.increase(ONE_MONTH);

            // second installment
            await this.contracts.projecty
              .connect(buyer)
              .payInstallment(entryId, { value: installmentPerMonth });

            await time.increase(ONE_MONTH + (GRACE_PERIOD - time.duration.days(1)));

            // third installment (1 day before grace period ends)
            await this.contracts.projecty
              .connect(buyer)
              .payInstallment(entryId, { value: installmentPerMonth });

            expect(
              (await this.contracts.projecty.getSellerInfo(entryId)).installmentsPaid
            ).to.equal(totalInstallments);

            await this.contracts.projecty.connect(seller).withdrawPayment(entryId);
          });

          it("decreases total entryIds", async function () {
            expect(await this.contracts.projecty.getTotalEntryIds()).to.be.equal(Zero);
          });
        }
      );
    });

    context("when seller withdraws entry after bidding period", function () {
      beforeEach(async function () {
        await time.increase(BIDDING_PERIOD);

        await this.contracts.projecty.connect(seller).withdrawSell(entryId);
      });

      it("retrieves zero", async function () {
        expect(await this.contracts.projecty.getTotalEntryIds()).to.be.equal(Zero);
      });
    });

    context("when seller doesn't withdraw entry", function () {
      const totalEntryIds = 1;

      it("retrieves correct value", async function () {
        expect(await this.contracts.projecty.getTotalEntryIds()).to.be.equal(totalEntryIds);
      });
    });
  });
}
