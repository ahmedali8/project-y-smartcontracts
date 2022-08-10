import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";

import { toWei } from "../../../../utils/format";
import { BIDDING_PERIOD, InstallmentPlan } from "../../../shared/constants";
import { ProjectYErrors } from "../../../shared/errors";
import { getDownPayment } from "../../../shared/utils";

export default function shouldBehaveLikeWithdrawSell(): void {
  context("when entryIs in invalid", function () {
    it("reverts", async function () {
      await expect(this.contracts.projecty.withdrawSell(3453)).to.be.revertedWith(
        ProjectYErrors.InvalidEntryId
      );
    });
  });

  context("when entryId is valid", function () {
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

    context("when caller is not seller", function () {
      it("reverts", async function () {
        await expect(
          this.contracts.projecty.connect(this.signers.accounts[9]).withdrawSell(entryId)
        ).to.be.revertedWith(ProjectYErrors.CallerNotSeller);
      });
    });

    context("when caller is seller", function () {
      context("when seller selects a bid", function () {
        beforeEach(async function () {
          const bidInstallment = InstallmentPlan.ThreeMonths;

          const bidId = 1;
          const bidPrice = toWei("34");
          const downPayment = getDownPayment(bidInstallment, bidPrice);

          // bid
          await this.contracts.projecty.connect(buyer).bid(entryId, bidPrice, bidInstallment, {
            value: downPayment,
          });

          // bidding period over
          await time.increase(BIDDING_PERIOD);

          // select bid (down payment/first installment)
          await this.contracts.projecty.connect(seller).selectBid(bidId);
        });

        it("reverts", async function () {
          await expect(
            this.contracts.projecty.connect(seller).withdrawSell(entryId)
          ).to.be.revertedWith(ProjectYErrors.BidderShouldNotBeSelected);
        });
      });

      describe("when seller withdraws entry", function () {
        context("when bidding period is not over", function () {
          it("reverts", async function () {
            await expect(
              this.contracts.projecty.connect(seller).withdrawSell(entryId)
            ).to.be.revertedWith(ProjectYErrors.BiddingPeriodNotOver);
          });
        });

        context("when bidding period is over", function () {
          beforeEach(async function () {
            // bidding period over
            await time.increase(BIDDING_PERIOD);
          });

          it("deletes sellerInfo and deletes entryIds", async function () {
            expect(await this.contracts.projecty.getIsEntryIdValid(entryId)).to.be.equal(true);
            expect(await this.contracts.projecty.getTotalEntryIds()).to.be.equal(1);

            await this.contracts.projecty.connect(seller).withdrawSell(entryId);

            expect(await this.contracts.projecty.getIsEntryIdValid(entryId)).to.be.equal(false);
            expect(await this.contracts.projecty.getTotalEntryIds()).to.be.equal(0);
          });

          it("emits 'SellWithdrawn' event", async function () {
            await expect(this.contracts.projecty.connect(seller).withdrawSell(entryId))
              .to.emit(this.contracts.projecty, "SellWithdrawn")
              .withArgs(seller.address, entryId);
          });

          it("transfers nft back to seller", async function () {
            expect(await this.mocks.erc721.ownerOf(tokenId)).to.equal(
              this.contracts.projecty.address
            );

            await this.contracts.projecty.connect(seller).withdrawSell(entryId);

            expect(await this.mocks.erc721.ownerOf(tokenId)).to.equal(seller.address);
          });
        });
      });
    });
  });
}
