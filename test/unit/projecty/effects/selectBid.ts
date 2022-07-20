import type { BigNumber } from "@ethersproject/bignumber";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { testUtils } from "hardhat";

import { toWei } from "../../../../utils/format";
import { ProjectY__Errors } from "../../../shared/errors";
import { expect } from "../../../shared/expect";
import { get34PercentOf } from "../../../shared/utils";

const { time } = testUtils;

// when installment is complete or slashed, bidId and entryId
// gets invalid // TODO: test this scenario as well

export default function shouldBehaveLikeSelectBid(): void {
  context("when bidId is not valid", function () {
    it("reverts", async function () {
      await expect(
        this.contracts.projecty.connect(this.signers.accounts[1]).selectBid(4)
      ).to.be.revertedWith(ProjectY__Errors.InvalidBidId);
    });
  });

  context("when bidId is valid", function () {
    const tokenId = 1;
    const entryId = 1;
    const bidId = 1;
    const sellingPrice: BigNumber = toWei("10");

    let erc721Address: string;
    let seller: SignerWithAddress;
    let buyer: SignerWithAddress;

    before(async function () {
      erc721Address = this.mocks.erc721.address;
      seller = this.signers.accounts[0];
      buyer = this.signers.accounts[1];
    });

    beforeEach(async function () {
      await this.mocks.erc721.mint(seller.address, tokenId);
      await this.mocks.erc721.connect(seller).approve(this.contracts.projecty.address, tokenId);
      await this.contracts.projecty.connect(seller).sell(erc721Address, tokenId, sellingPrice);

      await this.contracts.projecty
        .connect(buyer)
        .bid(entryId, sellingPrice, { value: get34PercentOf(sellingPrice) });
    });

    context("when caller is not seller", function () {
      it("reverts", async function () {
        await expect(
          this.contracts.projecty.connect(this.signers.accounts[9]).selectBid(bidId)
        ).to.be.revertedWith(ProjectY__Errors.CallerMustBeSeller);
      });
    });

    context("when bidding period is not over", function () {
      it("reverts", async function () {
        await expect(this.contracts.projecty.connect(seller).selectBid(bidId)).to.be.revertedWith(
          ProjectY__Errors.BiddingPeriodNotOver
        );
      });
    });

    context("when seller selects after bidding is over", function () {
      beforeEach(async function () {
        await time.increase(time.duration.days(8));
      });

      it("emits BidSelected event", async function () {
        await expect(this.contracts.projecty.connect(seller).selectBid(bidId))
          .to.emit(this.contracts.projecty, "BidSelected")
          .withArgs(bidId, entryId);
      });

      it("updates buyer info", async function () {
        const blockTimestamp = await time.latest();
        expect(await this.contracts.projecty.buyerTimestamp(bidId)).to.not.equal(blockTimestamp);

        await this.contracts.projecty.connect(seller).selectBid(bidId);

        expect(await this.contracts.projecty.buyerIsSelected(bidId)).to.equal(true);
        expect(await this.contracts.projecty.buyerTimestamp(bidId)).to.approximately(
          blockTimestamp,
          1
        );
      });
    });
  });
}
