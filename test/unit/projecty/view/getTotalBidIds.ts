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

export default function shouldBehaveLikeGetTotalBidIds(): void {
  context("when bidId does not exist", function () {
    it("retrieves zero", async function () {
      expect(await this.contracts.projecty.getTotalBidIds()).to.be.equal(Zero);
    });
  });

  context("when bidId exists", function () {
    const tokenId = 1 as const;

    const entryId = 1;
    const sellingPrice = toWei("23");
    const sellingInstallment = InstallmentPlan.ThreeMonths;

    const bidIds = [1, 2, 3, 4];
    const bidPrices = [toWei("10"), toWei("105"), toWei("7"), toWei("3")];
    const bidInstallments = [
      InstallmentPlan.None,
      InstallmentPlan.NineMonths,
      InstallmentPlan.SixMonths,
      InstallmentPlan.ThreeMonths,
    ];
    const NONE_INDEX = 0;

    const buyers: SignerWithAddress[] = [] as Array<SignerWithAddress>;

    let erc721Address: string;
    let seller: SignerWithAddress;

    before(async function () {
      erc721Address = this.mocks.erc721.address;
      seller = this.signers.accounts[0];

      for (let i = 1; i <= 4; i++) {
        buyers.push(this.signers.accounts[i]);
      }
    });

    beforeEach(async function () {
      // create mock erc721 token
      await this.mocks.erc721.mint(seller.address, tokenId);
      await this.mocks.erc721.connect(seller).approve(this.contracts.projecty.address, tokenId);

      // list for selling
      await this.contracts.projecty
        .connect(seller)
        .sell(erc721Address, tokenId, sellingPrice, sellingInstallment);

      // buyers bid
      for (let i = 0; i < buyers.length; i++) {
        const bidPrice = bidPrices[i];
        const bidInstallment = bidInstallments[i];

        await this.contracts.projecty.connect(buyers[i]).bid(entryId, bidPrice, bidInstallment, {
          value: getDownPayment(bidInstallment, bidPrice),
        });
      }
    });

    context("when bid is withdrawn after bidding period is over", function () {
      beforeEach(async function () {
        // bidding period over
        await time.increase(BIDDING_PERIOD);

        const index = 1;
        await this.contracts.projecty.connect(buyers[index]).withdrawBid(bidIds[index]);
      });

      it("decreases total bidIds", async function () {
        expect(await this.contracts.projecty.getTotalBidIds()).to.be.equal(bidIds.length - 1);
      });
    });

    context("when bid is selected", function () {
      context("when InstallmentPlan.None is selected", function () {
        beforeEach(async function () {
          // bidding period over
          await time.increase(BIDDING_PERIOD);
          await this.contracts.projecty.connect(seller).selectBid(bidIds[NONE_INDEX]);
        });

        it("decreases total bidIds", async function () {
          expect(await this.contracts.projecty.getTotalBidIds()).to.be.equal(bidIds.length - 1);
        });
      });

      context(
        "when InstallmentPlan.ThreeMonths is selected and last payment of installments is claimed",
        function () {
          beforeEach(async function () {
            const buyer = buyers[3];
            const bidId = bidIds[3];
            const bidPrice = bidPrices[3];
            const bidInstallment = bidInstallments[3];
            const totalInstallments = getTotalInstallments(bidInstallment);
            const installmentPerMonth = getInstallmentPerMonth(bidInstallment, bidPrice);
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

          it("decreases total bidIds", async function () {
            expect(await this.contracts.projecty.getTotalBidIds()).to.be.equal(bidIds.length - 1);
          });
        }
      );
    });

    context("when bid is neither withdrawn nor selected", function () {
      const totalBidIds = bidIds.length;

      it("retrieves correct value", async function () {
        expect(await this.contracts.projecty.getTotalBidIds()).to.be.equal(totalBidIds);
      });
    });
  });
}
