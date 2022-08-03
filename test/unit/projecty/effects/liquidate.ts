import type { BigNumber } from "@ethersproject/bignumber";
import { Zero } from "@ethersproject/constants";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";

import { calculatePercentage, fromWei, toWei } from "../../../../utils/format";
import {
  BIDDING_PERIOD,
  GRACE_PERIOD,
  InstallmentPlan,
  ONE_MONTH,
} from "../../../shared/constants";
import { ProjectYErrors } from "../../../shared/errors";
import {
  getDownPayment,
  getInstallmentPerMonth,
  getTotalInstallments,
} from "../../../shared/utils";

export default function shouldBehaveLikeLiquidate(): void {
  context("when entryId is invalid", function () {
    it("reverts", async function () {
      await expect(this.contracts.projecty.liquidate(45)).to.be.revertedWith(
        ProjectYErrors.InvalidEntryId
      );
    });
  });

  context("when entryId is valid", function () {
    const tokenId = 1 as const;

    const entryId = 1;
    const sellingPrice = toWei("23");
    const sellingInstallment = InstallmentPlan.ThreeMonths;

    const bidId = 1;
    const bidPrice = toWei("34");
    const bidInstallment = InstallmentPlan.SixMonths;
    const totalInstallments = getTotalInstallments(bidInstallment);
    const downPayment = getDownPayment(bidInstallment, bidPrice);
    const installmentPerMonth = getInstallmentPerMonth(bidInstallment, bidPrice);

    let erc721Address: string;
    let seller: SignerWithAddress;
    let buyer: SignerWithAddress;
    let liquidator: SignerWithAddress;

    before(async function () {
      erc721Address = this.mocks.erc721.address;
      liquidator = this.signers.accounts[0];
      seller = this.signers.accounts[1];
      buyer = this.signers.accounts[2];
    });

    beforeEach(async function () {
      // create mock erc721 token
      await this.mocks.erc721.mint(seller.address, tokenId);
      await this.mocks.erc721.connect(seller).approve(this.contracts.projecty.address, tokenId);

      // list for selling
      await this.contracts.projecty
        .connect(seller)
        .sell(erc721Address, tokenId, sellingPrice, sellingInstallment);

      // bid
      await this.contracts.projecty.connect(buyer).bid(entryId, bidPrice, bidInstallment, {
        value: downPayment,
      });

      // bidding period over
      await time.increase(BIDDING_PERIOD);

      // select bid (down payment/first installment)
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
    });

    context("when caller is seller or buyer", function () {
      it("reverts", async function () {
        await expect(this.contracts.projecty.connect(buyer).liquidate(entryId)).to.be.revertedWith(
          ProjectYErrors.InvalidCaller
        );

        await expect(this.contracts.projecty.connect(seller).liquidate(entryId)).to.be.revertedWith(
          ProjectYErrors.InvalidCaller
        );
      });
    });

    context("when caller is non-seller/buyer", function () {
      context("when installment plan is None", function () {
        it("reverts", async function () {
          const secondTokenId = 2;
          const secondBidId = 2;
          const secondEntryId = 2;
          const secondBidInstallment = InstallmentPlan.None;
          const secondBidPrice = toWei("34");

          // create mock erc721 token
          await this.mocks.erc721.mint(seller.address, secondTokenId);
          await this.mocks.erc721
            .connect(seller)
            .approve(this.contracts.projecty.address, secondTokenId);

          // list for selling
          await this.contracts.projecty
            .connect(seller)
            .sell(erc721Address, secondTokenId, sellingPrice, sellingInstallment);

          // bid
          await this.contracts.projecty
            .connect(buyer)
            .bid(secondEntryId, secondBidPrice, secondBidInstallment, {
              value: secondBidPrice,
            });

          // bidding period over
          await time.increase(BIDDING_PERIOD);

          // select bid (down payment)
          await this.contracts.projecty.connect(seller).selectBid(secondBidId);

          await expect(this.contracts.projecty.liquidate(secondEntryId)).to.be.revertedWith(
            ProjectYErrors.InvalidEntryId
          );
        });
      });

      context("when all installments are done", function () {
        beforeEach(async function () {
          // start from 4th installment
          for (let i = 4; i <= totalInstallments; i++) {
            await time.increase(ONE_MONTH);

            await this.contracts.projecty
              .connect(buyer)
              .payInstallment(entryId, { value: installmentPerMonth });
          }

          expect((await this.contracts.projecty.getSellerInfo(entryId)).installmentsPaid).to.equal(
            totalInstallments
          );
        });

        it("reverts", async function () {
          await expect(
            this.contracts.projecty.connect(liquidator).liquidate(entryId)
          ).to.be.revertedWith(ProjectYErrors.InstallmentsComplete);
        });
      });

      context(
        "when due date is passed but grace period is available for next installment",
        function () {
          it("reverts", async function () {
            // grace period still available
            await time.increase(ONE_MONTH);

            await expect(
              this.contracts.projecty.connect(liquidator).liquidate(entryId)
            ).to.be.revertedWith(ProjectYErrors.InstallmentOnTrack);
          });
        }
      );

      context(
        "when due date + grace period is passed but liquidation value in incorrect",
        function () {
          it("reverts", async function () {
            await time.increase(ONE_MONTH + GRACE_PERIOD + time.duration.days(1));

            await expect(
              this.contracts.projecty.connect(liquidator).liquidate(entryId, { value: Zero })
            ).to.be.revertedWith(ProjectYErrors.InvalidLiquidationValue);

            await expect(
              this.contracts.projecty.connect(liquidator).liquidate(entryId, { value: bidPrice })
            ).to.be.revertedWith(ProjectYErrors.InvalidLiquidationValue);
          });
        }
      );

      context(
        "when liquidator liquidates buyer after due date passed for 4th installment",
        function () {
          const installmentNumber = 4;

          let pricePaid: BigNumber;
          let liquidationValue: BigNumber;
          let valueToBePaid: BigNumber;

          beforeEach(async function () {
            // time passed for 4th installment
            await time.increase(ONE_MONTH + GRACE_PERIOD + time.duration.days(1));

            pricePaid = (await this.contracts.projecty.getBuyerInfo(bidId)).pricePaid;
            liquidationValue = calculatePercentage(pricePaid, 95);
            valueToBePaid = liquidationValue.add(installmentPerMonth);
          });

          it("updates new buyer and retrieves correct values", async function () {
            await this.contracts.projecty
              .connect(liquidator)
              .liquidate(entryId, { value: valueToBePaid });

            expect((await this.contracts.projecty.getBuyerInfo(bidId)).buyerAddress).to.equal(
              liquidator.address
            );
            expect((await this.contracts.projecty.getBuyerInfo(bidId)).pricePaid).to.equal(
              pricePaid.add(installmentPerMonth)
            );
            expect(
              (await this.contracts.projecty.getSellerInfo(entryId)).installmentsPaid
            ).to.equal(installmentNumber);

            expect(await this.mocks.erc721.ownerOf(tokenId)).to.equal(
              this.contracts.projecty.address
            );
          });

          it("transfers liquidation value to previous buyer", async function () {
            await expect(
              this.contracts.projecty
                .connect(liquidator)
                .liquidate(entryId, { value: valueToBePaid })
            ).to.changeEtherBalances(
              [buyer, this.contracts.projecty],
              [liquidationValue, valueToBePaid.sub(liquidationValue)]
            );
          });

          it("emits 'Liquidated' event", async function () {
            await expect(
              this.contracts.projecty
                .connect(liquidator)
                .liquidate(entryId, { value: valueToBePaid })
            )
              .to.emit(this.contracts.projecty, "Liquidated")
              .withArgs(entryId, bidId, installmentNumber, valueToBePaid);
          });
        }
      );

      context(
        "when liquidator liquidates buyer after due date passed for last installment",
        function () {
          beforeEach(async function () {
            // start from 4th installment
            // but last not done
            for (let i = 4; i < totalInstallments; i++) {
              await time.increase(ONE_MONTH);

              await this.contracts.projecty
                .connect(buyer)
                .payInstallment(entryId, { value: installmentPerMonth });
            }

            expect(
              (await this.contracts.projecty.getSellerInfo(entryId)).installmentsPaid
            ).to.equal(totalInstallments - 1);
          });

          it("transfers nft to newBuyer/liquidator", async function () {
            // time passed for last installment
            await time.increase(ONE_MONTH + GRACE_PERIOD + time.duration.days(1));

            const installmentNumber = totalInstallments;
            const pricePaid = (await this.contracts.projecty.getBuyerInfo(bidId)).pricePaid;
            const liquidationValue = calculatePercentage(pricePaid, 95);
            const valueToBePaid = liquidationValue.add(installmentPerMonth);

            await expect(
              this.contracts.projecty
                .connect(liquidator)
                .liquidate(entryId, { value: valueToBePaid })
            )
              .to.emit(this.contracts.projecty, "Liquidated")
              .withArgs(entryId, bidId, installmentNumber, valueToBePaid);

            expect(await this.mocks.erc721.ownerOf(tokenId)).to.equal(liquidator.address);

            await expect(
              this.contracts.projecty.connect(seller).withdrawPayment(entryId)
            ).to.changeEtherBalance(seller, bidPrice);
          });
        }
      );
    });
  });
}
