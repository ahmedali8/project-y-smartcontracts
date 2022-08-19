import type { BigNumber } from "@ethersproject/bignumber";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";

import type { ProjectY } from "../../../../src/types/contracts/ProjectY";
import { toWei } from "../../../../utils/format";
import { BIDDING_PERIOD, InstallmentPlan, ONE_MONTH } from "../../../shared/constants";
import { ProjectYErrors } from "../../../shared/errors";
import {
  getDownPayment,
  getInstallmentAmountOf,
  getInstallmentPerMonth,
  getTotalInstallments,
} from "../../../shared/utils";

export default function shouldBehaveLikeWithdrawPayment(): void {
  context("when entryId is invalid", function () {
    it("reverts", async function () {
      await expect(this.contracts.projecty.withdrawPayment(45)).to.be.revertedWith(
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
    const paymentPerMonth = getInstallmentPerMonth(bidInstallment, bidPrice);

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

      console.log("---------------------", 1, "---------------------");

      // bid
      await this.contracts.projecty.connect(buyer).bid(entryId, bidPrice, bidInstallment, {
        value: downPayment,
      });

      // bidding period over
      await time.increase(BIDDING_PERIOD);

      // select bid
      await this.contracts.projecty.connect(seller).selectBid(bidId);
    });

    context("when caller is not seller", function () {
      it("reverts", async function () {
        await expect(
          this.contracts.projecty.connect(this.signers.accounts[9]).withdrawPayment(entryId)
        ).to.be.revertedWith(ProjectYErrors.CallerNotSeller);
      });
    });

    context("when caller is seller", function () {
      context("when seller withdraw first payment (down payment)", function () {
        context("when seller withdraws payment of paid installment before the next", function () {
          it("reverts", async function () {
            await expect(
              this.contracts.projecty.connect(seller).withdrawPayment(entryId)
            ).to.be.revertedWith(ProjectYErrors.CannotReclaimPayment);
          });
        });

        context(
          "when seller withdraws payment after a month but installment is not done yet",
          function () {
            it("reverts", async function () {
              await time.increase(ONE_MONTH + time.duration.days(1));

              await expect(
                this.contracts.projecty.connect(seller).withdrawPayment(entryId)
              ).to.be.revertedWith(ProjectYErrors.CannotReclaimPayment);
            });
          }
        );

        context("when next installment is done", function () {
          beforeEach(async function () {
            // buyer pays installment after a few days of selection
            await time.increase(time.duration.days(10));

            await this.contracts.projecty
              .connect(buyer)
              .payInstallment(entryId, { value: paymentPerMonth });
          });

          it("allows seller to withdraw down payment immediately", async function () {
            await expect(
              this.contracts.projecty.connect(seller).withdrawPayment(entryId)
            ).to.changeEtherBalances(
              [seller, this.contracts.projecty],
              [downPayment, `-${downPayment.toString()}`]
            );
          });

          it("emits 'PaymentWithdrawn' event", async function () {
            const paymentsClaimed = 1;

            await expect(this.contracts.projecty.connect(seller).withdrawPayment(entryId))
              .to.emit(this.contracts.projecty, "PaymentWithdrawn")
              .withArgs(bidId, entryId, downPayment, paymentsClaimed);
          });

          it("reverts if seller tries to reclaim the payment", async function () {
            await this.contracts.projecty.connect(seller).withdrawPayment(entryId);

            await expect(
              this.contracts.projecty.connect(seller).withdrawPayment(entryId)
            ).to.be.revertedWith(ProjectYErrors.CannotReclaimPayment);
          });
        });
      });

      context(
        "when buyer pays each installment after 10 days then seller claims payment after 20 days",
        function () {
          async function transfersPaymentsAndEmitEvent(contract: ProjectY) {
            for (let i = 2; i <= totalInstallments + 1; i++) {
              const installmentNumber = i;

              console.log("---------------------", installmentNumber, "---------------------");

              // buyer pays installment after each month (within a month's period)
              await time.increase(time.duration.days(10));

              if (installmentNumber !== 7) {
                // buyer pays installment
                await contract.connect(buyer).payInstallment(entryId, { value: paymentPerMonth });
              }

              // increase 20 days so that previous 10 + 20 = 30 days
              await time.increase(time.duration.days(20));

              // seller claims previous installments
              let balDiff: BigNumber;

              // seller is claiming first payment (down payment)
              if (installmentNumber == 2) {
                balDiff = downPayment;
              } else {
                balDiff = paymentPerMonth;
              }

              const paymentsClaimed = installmentNumber - 1;

              await expect(contract.connect(seller).withdrawPayment(entryId))
                .to.changeEtherBalances([seller, contract], [balDiff, `-${balDiff.toString()}`])
                .to.emit(contract, "PaymentWithdrawn")
                .withArgs(bidId, entryId, balDiff, paymentsClaimed);
            }
          }

          it("transfers payments to seller and emits 'PaymentWithdrawn'", async function () {
            await transfersPaymentsAndEmitEvent(this.contracts.projecty);
          });

          it("deletes sellerInfo and buyerInfo after last payment claim", async function () {
            await transfersPaymentsAndEmitEvent(this.contracts.projecty);

            expect(await this.contracts.projecty.getIsEntryIdValid(entryId)).to.be.equal(false);
            expect(await this.contracts.projecty.getIsBidIdValid(bidId)).to.be.equal(false);
          });
        }
      );

      context("when seller claims 3 months later after last installment", function () {
        beforeEach(async function () {
          for (let i = 2; i <= totalInstallments; i++) {
            // console.log("---------------------", i, "---------------------");

            // buyer pays installment after each month
            await time.increase(ONE_MONTH);

            // buyer pays installment
            await this.contracts.projecty
              .connect(buyer)
              .payInstallment(entryId, { value: paymentPerMonth });

            // console.log("------------------------------------------");
          }
        });

        it("retrieves correct installmentsPaid", async function () {
          expect((await this.contracts.projecty.getSellerInfo(entryId)).installmentsPaid).to.equal(
            totalInstallments
          );
        });

        it("allows to claim all payments at once", async function () {
          await time.increase(3 * ONE_MONTH);

          expect((await this.contracts.projecty.getSellerInfo(entryId)).paymentsClaimed).to.equal(
            0
          );

          const paymentsClaimed = totalInstallments;

          await expect(this.contracts.projecty.connect(seller).withdrawPayment(entryId))
            .to.changeEtherBalances(
              [seller, this.contracts.projecty],
              [bidPrice, `-${bidPrice.toString()}`]
            )
            .to.emit(this.contracts.projecty, "PaymentWithdrawn")
            .withArgs(bidId, entryId, bidPrice, paymentsClaimed);
        });

        it("deletes sellerInfo and buyerInfo", async function () {
          await time.increase(3 * ONE_MONTH);

          await this.contracts.projecty.connect(seller).withdrawPayment(entryId);

          expect(await this.contracts.projecty.getIsEntryIdValid(entryId)).to.be.equal(false);
          expect(await this.contracts.projecty.getIsBidIdValid(bidId)).to.be.equal(false);
        });
      });

      context("when 4/6 installments are done and seller claims 3 payments", function () {
        const installmentsToDo = totalInstallments - 2;

        beforeEach(async function () {
          for (let i = 2; i <= installmentsToDo; i++) {
            console.log("---------------------", i, "---------------------");

            // buyer pays installment after each month
            await time.increase(ONE_MONTH);

            // buyer pays installment
            await this.contracts.projecty
              .connect(buyer)
              .payInstallment(entryId, { value: paymentPerMonth });

            console.log("------------------------------------------");
          }
        });

        it("retrieves correct installmentsPaid", async function () {
          expect((await this.contracts.projecty.getSellerInfo(entryId)).installmentsPaid).to.equal(
            installmentsToDo
          );
        });

        it("claims 3 payments for the first time", async function () {
          const paymentToBeClaimed = 3;
          const amountClaimable = getInstallmentAmountOf(
            bidInstallment,
            bidPrice,
            paymentToBeClaimed
          );

          // 5.61 + 11.22;
          // const amountClaimable = toWei("17.17");

          console.log({ amountClaimable: amountClaimable.toString() });

          expect((await this.contracts.projecty.getSellerInfo(entryId)).paymentsClaimed).to.equal(
            0
          );

          const paymentsClaimed = 3;

          await expect(this.contracts.projecty.connect(seller).withdrawPayment(entryId))
            .to.changeEtherBalances(
              [seller, this.contracts.projecty],
              [amountClaimable, `-${amountClaimable.toString()}`]
            )
            .to.emit(this.contracts.projecty, "PaymentWithdrawn")
            .withArgs(bidId, entryId, amountClaimable, paymentsClaimed);
        });
      });
    });
  });
}
