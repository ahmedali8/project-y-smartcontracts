import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";

import { toWei } from "../../../../utils/format";
import {
  BIDDING_PERIOD,
  INSTALLMENT_PLAN_VALUES,
  InstallmentPlan,
} from "../../../shared/constants";
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

    context("when caller is not seller", function () {
      it("reverts", async function () {
        const bidId = bidIds[2];

        await expect(
          this.contracts.projecty.connect(this.signers.accounts[9]).selectBid(bidId)
        ).to.be.revertedWith(ProjectYErrors.CallerNotSeller);
      });
    });

    context("when bidding period is not over", function () {
      it("reverts", async function () {
        const bidId = bidIds[2];

        await expect(this.contracts.projecty.connect(seller).selectBid(bidId)).to.be.revertedWith(
          ProjectYErrors.BiddingPeriodNotOver
        );
      });
    });

    context("when seller tries to reselect", function () {
      context("when seller selects InstallmentPlan.None", function () {
        const bidId = bidIds[NONE_INDEX];

        beforeEach(async function () {
          // bidding period over
          await time.increase(BIDDING_PERIOD + time.duration.days(1));

          await this.contracts.projecty.connect(seller).selectBid(bidId);
        });

        it("reverts", async function () {
          await expect(this.contracts.projecty.connect(seller).selectBid(bidId)).to.be.revertedWith(
            ProjectYErrors.InvalidBidId
          );
        });
      });

      context("when seller selects other InstallmentPlans", function () {
        const bidId = bidIds[2];

        beforeEach(async function () {
          // bidding period over
          await time.increase(BIDDING_PERIOD + time.duration.days(1));

          await this.contracts.projecty.connect(seller).selectBid(bidId);
        });

        it("reverts if same bidId", async function () {
          await expect(this.contracts.projecty.connect(seller).selectBid(bidId)).to.be.revertedWith(
            ProjectYErrors.CannotReselectBid
          );
        });

        it("reverts if another bidId", async function () {
          const anotherBidId = bidIds[1];

          await expect(
            this.contracts.projecty.connect(seller).selectBid(anotherBidId)
          ).to.be.revertedWith(ProjectYErrors.CannotReselectBid);
        });
      });
    });

    context("when seller selects bid after bidding period is over", function () {
      beforeEach(async function () {
        // bidding period over
        await time.increase(BIDDING_PERIOD + time.duration.days(1));
      });

      context("when seller selects InstallmentPlan.None", function () {
        const bidId = bidIds[NONE_INDEX];
        const bidPrice = bidPrices[NONE_INDEX];

        it("transfers nft to buyer", async function () {
          const buyer = buyers[NONE_INDEX];

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

      context("when seller selects other InstallmentPlans", function () {
        INSTALLMENT_PLAN_VALUES.filter((v) => v != InstallmentPlan.None).forEach(
          (installmentPlan) => {
            const enumKey = InstallmentPlan[installmentPlan];

            context(`when InstallmentPlan.${enumKey}`, () => {
              const index = installmentPlan;

              const bidId = bidIds[index];
              const bidPrice = bidPrices[index];
              const buyingInstallment = bidInstallments[index];

              it("retrieves correct buyer and seller infos", async function () {
                const buyerInfoBeforeTx = await this.contracts.projecty.getBuyerInfo(bidId);
                const sellerInfoBeforeTx = await this.contracts.projecty.getSellerInfo(entryId);
                expect(buyerInfoBeforeTx.isSelected).to.equal(false);
                expect(sellerInfoBeforeTx.onSale).to.equal(true);
                expect(sellerInfoBeforeTx.selectedBidId).to.equal(0);
                expect(sellerInfoBeforeTx.installment).to.equal(sellingInstallment);
                expect(sellerInfoBeforeTx.sellingPrice).to.equal(sellingPrice);
                expect(sellerInfoBeforeTx.installmentsPaid).to.equal(0);

                // txn
                await this.contracts.projecty.connect(seller).selectBid(bidId);

                const buyerInfoAfterTx = await this.contracts.projecty.getBuyerInfo(bidId);
                const sellerInfoAfterTx = await this.contracts.projecty.getSellerInfo(entryId);
                expect(buyerInfoAfterTx.isSelected).to.equal(true);
                expect(sellerInfoAfterTx.onSale).to.equal(false);
                expect(sellerInfoAfterTx.selectedBidId).to.equal(bidId);
                expect(sellerInfoAfterTx.installment).to.equal(buyingInstallment);
                expect(sellerInfoAfterTx.sellingPrice).to.equal(bidPrice);
                expect(sellerInfoAfterTx.installmentsPaid).to.equal(1);
              });

              it("emits 'BidSelected'", async function () {
                await expect(this.contracts.projecty.connect(seller).selectBid(bidId))
                  .to.emit(this.contracts.projecty, "BidSelected")
                  .withArgs(bidId, entryId);
              });
            });
          }
        );
      });
    });
  });
}
