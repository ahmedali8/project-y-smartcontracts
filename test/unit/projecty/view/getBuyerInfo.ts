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
import { ProjectYErrors } from "../../../shared/errors";
import { getDownPayment, getInstallmentPerMonth } from "../../../shared/utils";

export default function shouldBehaveLikeGetBuyerInfo(): void {
  context("when bidId is invalid", function () {
    it("reverts", async function () {
      await expect(this.contracts.projecty.getBuyerInfo(78)).to.be.revertedWith(
        ProjectYErrors.InvalidBidId
      );
    });
  });

  context("when bidId is valid", function () {
    const tokenId = 1 as const;

    const entryId = 1;
    const sellingPrice = toWei("23");
    const sellingInstallment = InstallmentPlan.ThreeMonths;

    let biddingTimestamp: number;
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

        it("reverts because buyerInfo gets deleted", async function () {
          await expect(this.contracts.projecty.getBuyerInfo(bidId)).to.be.revertedWith(
            ProjectYErrors.InvalidBidId
          );
        });
      });

      context(
        "when InstallmentPlan.ThreeMonths is selected and last payment of installments is claimed",
        function () {
          const bidInstallment = InstallmentPlan.ThreeMonths;

          const bidId = 1;
          const bidPrice = toWei("34");
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

            await this.contracts.projecty.connect(seller).withdrawPayment(entryId);
          });

          it("reverts because buyerInfo gets deleted", async function () {
            await expect(this.contracts.projecty.getBuyerInfo(bidId)).to.be.revertedWith(
              ProjectYErrors.InvalidBidId
            );
          });
        }
      );
    });

    context("when buyer withdraws bid after bidding period", function () {
      const bidInstallment = InstallmentPlan.ThreeMonths;

      const bidId = 1;
      const bidPrice = toWei("34");
      const downPayment = getDownPayment(bidInstallment, bidPrice);

      beforeEach(async function () {
        // bid
        await this.contracts.projecty.connect(buyer).bid(entryId, bidPrice, bidInstallment, {
          value: downPayment,
        });

        await time.increase(BIDDING_PERIOD);

        await this.contracts.projecty.connect(buyer).withdrawBid(bidId);
      });

      it("reverts because buyerInfo gets deleted", async function () {
        await expect(this.contracts.projecty.getBuyerInfo(bidId)).to.be.revertedWith(
          ProjectYErrors.InvalidBidId
        );
      });
    });

    context("when buyer neither withdraws nor installments are done", function () {
      const bidInstallment = InstallmentPlan.ThreeMonths;

      const bidId = 1;
      const bidPrice = toWei("34");
      const downPayment = getDownPayment(bidInstallment, bidPrice);

      beforeEach(async function () {
        // bid
        biddingTimestamp = await time.latest();
        await this.contracts.projecty.connect(buyer).bid(entryId, bidPrice, bidInstallment, {
          value: downPayment,
        });
      });

      it("retrieves correct values", async function () {
        expect(await this.contracts.projecty.getBuyerInfo(bidId)).to.deep.equal([
          false,
          buyer.address,
          biddingTimestamp + 1,
          bidPrice,
          entryId,
          downPayment,
          bidInstallment,
        ]);
      });
    });
  });
}
