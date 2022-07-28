import { Zero } from "@ethersproject/constants";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { assert, expect } from "chai";

import { toWei } from "../../../../utils/format";
import { INSTALLMENT_PLAN_VALUES, InstallmentPlan } from "../../../shared/constants";
import { ProjectYErrors } from "../../../shared/errors";
import { createRandomSigner, getDownPayment } from "../../../shared/utils";

export default function shouldBehaveLikeBid(): void {
  context("when entryId is not valid", function () {
    it("reverts", async function () {
      const bidPrice = toWei("0.34");
      const installment = InstallmentPlan.None;

      await expect(
        this.contracts.projecty
          .connect(this.signers.accounts[1])
          .bid(45, bidPrice, installment, { value: getDownPayment(installment, bidPrice) })
      ).to.be.revertedWith(ProjectYErrors.InvalidEntryId);
    });
  });

  context("when entryId is valid", function () {
    const tokenId = 1;
    const entryId = 1;

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
    });

    context("when seller sells for InstallmentPlan.None", function () {
      const sellingPrice = toWei("10");
      const sellingInstallment = InstallmentPlan.None;

      beforeEach(async function () {
        await this.contracts.projecty
          .connect(seller)
          .sell(erc721Address, tokenId, sellingPrice, sellingInstallment);
      });

      context("when value or bidPrice is invalid", function () {
        const buyingInstallment = InstallmentPlan.None;

        it("reverts when zero value", async function () {
          const bidPrice = toWei("2.5");

          await expect(
            this.contracts.projecty
              .connect(buyer)
              .bid(entryId, bidPrice, buyingInstallment, { value: Zero })
          ).to.be.revertedWith(ProjectYErrors.ValueNotEqualToDownPayment);
        });

        it("reverts when zero bidPrice", async function () {
          const bidPrice = toWei("3.5");

          await expect(
            this.contracts.projecty.connect(buyer).bid(entryId, Zero, buyingInstallment, {
              value: getDownPayment(buyingInstallment, bidPrice),
            })
          ).to.be.revertedWith(ProjectYErrors.ValueNotEqualToDownPayment);
        });

        it("reverts when invalid bidPrice", async function () {
          const bidPrice = toWei("3.5");

          await expect(
            this.contracts.projecty
              .connect(buyer)
              .bid(entryId, bidPrice, buyingInstallment, { value: sellingPrice })
          ).to.be.revertedWith(ProjectYErrors.ValueNotEqualToDownPayment);
        });
      });

      context("when bidding period is over", function () {
        it("reverts", async function () {
          const bidPrice = toWei("3.5");
          const buyingInstallment = InstallmentPlan.None;

          const sellingTimestamp: number = (
            await this.contracts.projecty.getSellerInfo(entryId)
          ).timestamp.toNumber();

          await time.increase(sellingTimestamp + time.duration.days(10));

          await expect(
            this.contracts.projecty.connect(buyer).bid(entryId, bidPrice, buyingInstallment, {
              value: getDownPayment(buyingInstallment, bidPrice),
            })
          ).to.be.revertedWith(ProjectYErrors.BiddingPeriodOver);
        });
      });

      context("when bidder has not enough funds", function () {
        it("InvalidInputError: sender doesn't have enough funds to send tx.", async function () {
          try {
            const unknownBuyer: SignerWithAddress = await createRandomSigner("beaf", toWei("1"));

            const bidPrice = toWei("3.5");
            const buyingInstallment = InstallmentPlan.None;

            await expect(
              this.contracts.projecty
                .connect(unknownBuyer)
                .bid(entryId, bidPrice, buyingInstallment, {
                  value: getDownPayment(buyingInstallment, bidPrice),
                })
            ).to.be.reverted;
          } catch (error) {
            assert(true);
          }
        });
      });

      INSTALLMENT_PLAN_VALUES.forEach((installmentPlan) => {
        const enumKey = InstallmentPlan[installmentPlan];

        context(`when buyer bids for Installment.${enumKey}`, function () {
          it("increases bid count in sellerInfo", async function () {
            const bidPrice = toWei("3.5");
            const buyingInstallment = installmentPlan;

            expect((await this.contracts.projecty.getSellerInfo(entryId)).totalBids).to.equal(0);

            await this.contracts.projecty.connect(buyer).bid(entryId, bidPrice, buyingInstallment, {
              value: getDownPayment(buyingInstallment, bidPrice),
            });

            expect((await this.contracts.projecty.getSellerInfo(entryId)).totalBids).to.equal(1);

            const bidId = 1;
            await expect(this.contracts.projecty.getDownPaymentAmount(bidId)).to.be.revertedWith(
              ProjectYErrors.DownPaymentDone
            );
          });

          it("emits 'Bid' event", async function () {
            const bidPrice = toWei("5");
            const buyingInstallment = InstallmentPlan.None;
            const bidId = 1;

            await expect(
              this.contracts.projecty.connect(buyer).bid(entryId, bidPrice, buyingInstallment, {
                value: getDownPayment(buyingInstallment, bidPrice),
              })
            )
              .to.emit(this.contracts.projecty, "Bid")
              .withArgs(buyer.address, entryId, bidId, anyValue);
          });
        });
      });
    });
  });
}
