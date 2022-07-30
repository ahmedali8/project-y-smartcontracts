import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";

import { toWei } from "../../../../utils/format";
import { BIDDING_PERIOD, InstallmentPlan } from "../../../shared/constants";
import { ProjectYErrors } from "../../../shared/errors";
import { getDownPayment } from "../../../shared/utils";

export function shouldBehaveLikeWithdrawBid(): void {
  context("when bidId is invalid", function () {
    it("reverts", async function () {
      await expect(this.contracts.projecty.withdrawBid(45)).to.be.revertedWith(
        ProjectYErrors.InvalidBidId
      );
    });
  });

  context("when bidId is valid", function () {
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
    let buyer: SignerWithAddress;

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

    context("when caller is not buyer", function () {
      it("reverts", async function () {
        const bidId = bidIds[2];

        await expect(
          this.contracts.projecty.connect(this.signers.accounts[9]).withdrawBid(bidId)
        ).to.be.revertedWith(ProjectYErrors.CallerNotBuyer);
      });
    });

    context("when bidding period is not over", function () {
      it("reverts", async function () {
        const bidId = bidIds[2];
        buyer = buyers[2];

        await expect(this.contracts.projecty.connect(buyer).withdrawBid(bidId)).to.be.revertedWith(
          ProjectYErrors.BiddingPeriodNotOver
        );
      });
    });

    context("when bidding period is over", function () {
      beforeEach(async function () {
        // bidding period over
        await time.increase(BIDDING_PERIOD + time.duration.days(1));
      });

      context("when bidId is selected", function () {
        const bidId = bidIds[2];
        buyer = buyers[2];

        beforeEach(async function () {
          await this.contracts.projecty.connect(seller).selectBid(bidId);
        });

        it("reverts", async function () {
          await expect(
            this.contracts.projecty.connect(buyer).withdrawBid(bidId)
          ).to.be.revertedWith(ProjectYErrors.BidderShouldNotBeSelected);
        });
      });

      context("when bidId is not selected", function () {
        const selectedBidId = bidIds[2];

        beforeEach(async function () {
          await this.contracts.projecty.connect(seller).selectBid(selectedBidId);
        });

        it("deletes buyer info", async function () {
          for (let i = 0; i < bidIds.length; i++) {
            const bidId = bidIds[i];
            buyer = buyers[i];

            if (bidId == selectedBidId) return;

            await this.contracts.projecty.connect(buyer).withdrawBid(bidId);

            await expect(this.contracts.projecty.getBuyerInfo(bidId)).to.revertedWith(
              ProjectYErrors.InvalidBidId
            );
          }
        });

        it("returns price paid to buyer", async function () {
          for (let i = 0; i < bidIds.length; i++) {
            const bidId = bidIds[i];
            const pricePaid = (await this.contracts.projecty.getBuyerInfo(bidId)).pricePaid;
            buyer = buyers[i];

            if (bidId == selectedBidId) continue;

            await expect(
              this.contracts.projecty.connect(buyer).withdrawBid(bidId)
            ).to.changeEtherBalance(buyer, pricePaid);
          }
        });

        it("emits 'BidWithdrawn' event", async function () {
          for (let i = 0; i < bidIds.length; i++) {
            const bidId = bidIds[i];
            const pricePaid = (await this.contracts.projecty.getBuyerInfo(bidId)).pricePaid;
            buyer = buyers[i];

            if (bidId == selectedBidId) continue;

            await expect(this.contracts.projecty.connect(buyer).withdrawBid(bidId))
              .to.emit(this.contracts.projecty, "BidWithdrawn")
              .withArgs(bidId, entryId, pricePaid);
          }
        });
      });
    });
  });
}
