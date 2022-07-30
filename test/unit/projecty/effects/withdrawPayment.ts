import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";

import { fromWei, toWei } from "../../../../utils/format";
import { BIDDING_PERIOD, InstallmentPlan, ONE_MONTH } from "../../../shared/constants";
import { ProjectYErrors } from "../../../shared/errors";
import {
  getDownPayment,
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
          this.contracts.projecty.connect(this.signers.accounts[9]).selectBid(bidId)
        ).to.be.revertedWith(ProjectYErrors.CallerNotSeller);
      });
    });

    context("when caller is seller", function () {
      context("when seller withdraw first payment", function () {
        // context("when seller withdraws payment of paid installment before the next", function () {
        //   it("reverts", async function () {
        //     await expect(
        //       this.contracts.projecty.connect(seller).withdrawPayment(entryId)
        //     ).to.be.revertedWith(ProjectYErrors.ClaimAfterAppropriateTime);
        //   });
        // });

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
            const bidTimestamp = (await this.contracts.projecty.getBuyerInfo(bidId)).timestamp;

            console.log({ bidTimestamp: bidTimestamp.toString() });
            console.log({ latest: await time.latest() });

            // buyer pays installment after a few days of selection
            await time.increase(time.duration.days(10));

            console.log({ bidTimestamp: bidTimestamp.toString() });
            console.log({ latest: await time.latest() });

            await this.contracts.projecty
              .connect(buyer)
              .payInstallment(entryId, { value: paymentPerMonth });
          });

          it("withdraws downPayment", async function () {
            const bidTimestamp = (await this.contracts.projecty.getBuyerInfo(bidId)).timestamp;

            console.log({ bidTimestamp: bidTimestamp.toString() });
            console.log({ latest: await time.latest() });

            // next installment timestamp
            // increase 20 days so that previous 10 + 20 = 30 days
            await time.increase(time.duration.days(20));

            await expect(
              this.contracts.projecty.connect(seller).withdrawPayment(entryId)
            ).to.changeEtherBalances(
              [seller, this.contracts.projecty],
              [downPayment, `-${downPayment.toString()}`]
            );
          });

          it("reverts if seller tries to reclaim the payment", async function () {
            const bidTimestamp = (await this.contracts.projecty.getBuyerInfo(bidId)).timestamp;

            console.log({ bidTimestamp: bidTimestamp.toString() });
            console.log({ latest: await time.latest() });

            // next installment timestamp
            // increase 20 days so that previous 10 + 20 = 30 days
            await time.increase(time.duration.days(20));

            console.log({ bidTimestamp: bidTimestamp.toString() });
            console.log({ latest: await time.latest() });

            await this.contracts.projecty.connect(seller).withdrawPayment(entryId);

            await expect(
              this.contracts.projecty.connect(seller).withdrawPayment(entryId)
            ).to.be.revertedWith(ProjectYErrors.CannotReclaimPayment);
          });
        });
      });

      context("when seller withdraws each payment timely", function () {
        beforeEach(async function () {
          // down payment is claimed
          const bidTimestamp = (await this.contracts.projecty.getBuyerInfo(bidId)).timestamp;

          console.log({ bidTimestamp: bidTimestamp.toString() });
          console.log({ latest: await time.latest() });

          // buyer pays installment after each month (within a month's period)
          await time.increase(time.duration.days(10));

          console.log({ bidTimestamp: bidTimestamp.toString() });
          console.log({ latest: await time.latest() });

          // second last installment
          const secondLastInstallmentPaid = (await this.contracts.projecty.getSellerInfo(entryId))
            .installmentsPaid;

          console.log({ secondLastInstallmentPaid });

          // buyer pays first installment after down payment
          await this.contracts.projecty
            .connect(buyer)
            .payInstallment(entryId, { value: paymentPerMonth });

          // last installment
          const lastInstallmentPaid = (await this.contracts.projecty.getSellerInfo(entryId))
            .installmentsPaid;

          console.log({ lastInstallmentPaid });

          // increase 20 days so that previous 10 + 20 = 30 days
          await time.increase(time.duration.days(20));

          console.log({ bidTimestamp: bidTimestamp.toString() });
          console.log({ latest: await time.latest() });

          await time.increase(time.duration.days(1));

          // seller withdraws the previous installment (downPayment)
          await this.contracts.projecty.connect(seller).withdrawPayment(entryId);

          expect((await this.contracts.projecty.getSellerInfo(entryId)).paymentsClaimed).to.equal(
            1
          );
        });

        it("all payments claimed", async function () {
          const installmentsLeft = totalInstallments - 2;

          for (let i = 0; i <= installmentsLeft; i++) {
            console.log("---------------------", i, "---------------------");
            await time.increase(ONE_MONTH);

            // buyer pays installment
            await this.contracts.projecty
              .connect(buyer)
              .payInstallment(entryId, { value: paymentPerMonth });

            console.log({
              amountClaimable: fromWei(paymentPerMonth),
              beforeTxBalOfSeller: fromWei(await seller.getBalance()),
            });

            // seller claims previous installment
            await this.contracts.projecty.connect(seller).withdrawPayment(entryId);
            // await expect(
            //   this.contracts.projecty.connect(seller).withdrawPayment(entryId)
            // ).to.changeEtherBalances(
            //   [seller, this.contracts.projecty],
            //   [paymentPerMonth, `-${paymentPerMonth.toString()}`]
            // );

            console.log({
              amountClaimable: fromWei(paymentPerMonth),
              afterTxBalOfSeller: fromWei(await seller.getBalance()),
            });
          }
        });
      });
    });
  });
}

// total 6 installments, 5 done but only 1 installment claimed

// const buyerInfo = await this.contracts.projecty.getBuyerInfo(bidId);
// const pricePaid = buyerInfo.pricePaid;
// expect(pricePaid).to.equal(downPayment);

// const sellerInfo = await this.contracts.projecty.getSellerInfo(entryId);
// const paymentsClaimed = sellerInfo.paymentsClaimed;
// const installmentsPaid = sellerInfo.installmentsPaid;
// expect(paymentsClaimed).to.equal(installmentsPaid - 1);

// console.log("before tx: ", {
//   paymentsClaimed: (await this.contracts.projecty.getSellerInfo(entryId)).paymentsClaimed,
//   installmentsPaid: (await this.contracts.projecty.getSellerInfo(entryId))
//     .installmentsPaid,
// });

// await this.contracts.projecty.connect(seller).withdrawPayment(entryId);

// console.log("after tx: ", {
//   paymentsClaimed: (await this.contracts.projecty.getSellerInfo(entryId)).paymentsClaimed,
//   installmentsPaid: (await this.contracts.projecty.getSellerInfo(entryId))
//     .installmentsPaid,
// });

// await this.contracts.projecty.connect(seller).withdrawPayment(entryId);

// console.log("after second tx: ", {
//   paymentsClaimed: (await this.contracts.projecty.getSellerInfo(entryId)).paymentsClaimed,
//   installmentsPaid: (await this.contracts.projecty.getSellerInfo(entryId))
//     .installmentsPaid,
// });
