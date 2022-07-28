import type { BigNumber } from "@ethersproject/bignumber";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";

import { toWei } from "../../../../utils/format";
import { InstallmentPlan } from "../../../shared/constants";
import { ProjectYErrors } from "../../../shared/errors";
import { getDownPayment } from "../../../shared/utils";

export default function shouldBehaveLikeSelectBid(): void {
  context("when bidId is invalid", function () {
    it("reverts", async function () {
      await expect(this.contracts.projecty.selectBid(45)).to.be.revertedWith(
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
      InstallmentPlan.NineMonths,
      InstallmentPlan.SixMonths,
      InstallmentPlan.None,
      InstallmentPlan.ThreeMonths,
    ];

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

    context("when caller is not seller", function () {
      it("reverts", async function () {
        const bidId = bidIds[3];

        await expect(
          this.contracts.projecty.connect(this.signers.accounts[9]).selectBid(bidId)
        ).to.be.revertedWith(ProjectYErrors.CallerNotSeller);
      });
    });

    context("when bidding period is not over", function () {
      it("reverts", async function () {
        const bidId = bidIds[3];

        await expect(this.contracts.projecty.connect(seller).selectBid(bidId)).to.be.revertedWith(
          ProjectYErrors.BiddingPeriodNotOver
        );
      });
    });

    context("when seller selects bid after bidding period is over", function () {
      beforeEach(async function () {
        await time.increase(time.duration.days(8));
      });

      context("when seller selects InstallmentPlan.None", function () {
        const bidId = bidIds[2];
        const bidPrice = bidPrices[2];

        it("transfers nft to buyer", async function () {
          const buyer = buyers[2];

          expect(await this.mocks.erc721.ownerOf(tokenId)).to.equal(
            this.contracts.projecty.address
          );

          await this.contracts.projecty.connect(seller).selectBid(bidId);

          expect(await this.mocks.erc721.ownerOf(tokenId)).to.equal(buyer.address);
        });

        it("transfers value(bidPrice) to seller", async function () {
          await expect(
            this.contracts.projecty.connect(seller).selectBid(bidId)
          ).to.changeEtherBalance(seller, bidPrice);
        });

        it("deletes seller and buyer info", async function () {
          await this.contracts.projecty.connect(seller).selectBid(bidId);

          await expect(this.contracts.projecty.getSellerInfo(entryId)).to.revertedWith(
            ProjectYErrors.InvalidEntryId
          );

          await expect(this.contracts.projecty.getBuyerInfo(bidId)).to.revertedWith(
            ProjectYErrors.InvalidBidId
          );
        });

        it("emits 'BidSelected'", async function () {
          await expect(this.contracts.projecty.connect(seller).selectBid(bidId))
            .to.emit(this.contracts.projecty, "BidSelected")
            .withArgs(bidId, entryId);
        });
      });
    });

    // revert on reselect for scenarios other than none
  });
}
