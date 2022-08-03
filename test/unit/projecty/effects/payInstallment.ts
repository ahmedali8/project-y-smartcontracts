import { Zero } from "@ethersproject/constants";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";

import { fromWei, toWei } from "../../../../utils/format";
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

export default function shouldBehaveLikePayInstallment(): void {
  context("when entryId is not valid", function () {
    it("reverts", async function () {
      await expect(
        this.contracts.projecty.connect(this.signers.accounts[0]).payInstallment(34)
      ).to.be.revertedWith(ProjectYErrors.InvalidEntryId);
    });
  });

  context("when entryId is valid", function () {
    const tokenId = 1;
    const entryId = 1;

    let erc721Address: string;
    let seller: SignerWithAddress;
    let buyer: SignerWithAddress;

    const sellingPrice = toWei("23");
    const sellingInstallment = InstallmentPlan.ThreeMonths;

    const bidIds = [1, 2, 3, 4];
    const bidPrices = [toWei("10"), toWei("105"), toWei("7"), toWei("3")];
    const bidInstallments = [
      InstallmentPlan.NineMonths,
      InstallmentPlan.SixMonths,
      InstallmentPlan.ThreeMonths,
      InstallmentPlan.None,
    ];

    const buyers: SignerWithAddress[] = [] as Array<SignerWithAddress>;

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

    context("when bidId is not selected", function () {
      it("reverts", async function () {
        await expect(
          this.contracts.projecty.connect(seller).payInstallment(entryId)
        ).to.be.revertedWith(ProjectYErrors.NoBidIdSelected);
      });
    });

    context("when bidId of InstallmentPlan.None is selected", function () {
      const bidId = bidIds[3];

      beforeEach(async function () {
        buyer = buyers[3];

        // bidding period over
        await time.increase(BIDDING_PERIOD + time.duration.days(1));

        await this.contracts.projecty.connect(seller).selectBid(bidId);
      });

      it("reverts", async function () {
        const buyerInstallment = bidInstallments[3];
        const bidPrice = bidPrices[3];

        await expect(
          this.contracts.projecty.connect(buyer).payInstallment(entryId, {
            value: getInstallmentPerMonth(buyerInstallment, bidPrice),
          })
        ).to.be.revertedWith(ProjectYErrors.InvalidEntryId);
      });
    });

    context("when bidId is other than InstallmentPlan.None is selected", function () {
      const bidId = bidIds[2];
      const buyingInstallment = bidInstallments[2];
      const bidPrice = bidPrices[2];

      beforeEach(async function () {
        buyer = buyers[2];

        // bidding period over
        await time.increase(BIDDING_PERIOD + time.duration.days(1));

        await this.contracts.projecty.connect(seller).selectBid(bidId);
      });

      context("when caller is not buyer", function () {
        it("reverts", async function () {
          await expect(
            this.contracts.projecty.connect(this.signers.accounts[0]).payInstallment(entryId)
          ).to.be.revertedWith(ProjectYErrors.CallerNotBuyer);
        });
      });

      context("when value is invalid", function () {
        it("reverts", async function () {
          await expect(
            this.contracts.projecty.connect(buyer).payInstallment(entryId, { value: Zero })
          ).to.be.revertedWith(ProjectYErrors.InvalidInstallmentValue);

          await expect(
            this.contracts.projecty.connect(buyer).payInstallment(entryId, { value: toWei("90") })
          ).to.be.revertedWith(ProjectYErrors.InvalidInstallmentValue);
        });
      });

      context("when buyer tries to pay installment after its dueDate+gracePeriod", function () {
        it("reverts", async function () {
          const buyingTimestamp: number = (
            await this.contracts.projecty.getBuyerInfo(bidId)
          ).timestamp.toNumber();

          await time.increase(buyingTimestamp + ONE_MONTH + GRACE_PERIOD + time.duration.days(1));

          await expect(
            this.contracts.projecty.connect(buyer).payInstallment(entryId, {
              value: getInstallmentPerMonth(buyingInstallment, bidPrice),
            })
          ).to.be.revertedWith(ProjectYErrors.DueDatePassed);
        });
      });

      context("when buyer tries to pay back to back installments at once", function () {
        it("reverts", async function () {
          const installmentPerMonth = getInstallmentPerMonth(buyingInstallment, bidPrice);

          await this.contracts.projecty
            .connect(buyer)
            .payInstallment(entryId, { value: installmentPerMonth });

          await expect(
            this.contracts.projecty
              .connect(buyer)
              .payInstallment(entryId, { value: installmentPerMonth })
          ).to.be.revertedWith(ProjectYErrors.PayAfterAppropriateTime);
        });
      });

      context("when buyer pays second installment", function () {
        const installmentPerMonth = getInstallmentPerMonth(buyingInstallment, bidPrice);

        it("increases price paid", async function () {
          const downPayment = getDownPayment(buyingInstallment, bidPrice);

          await expect(
            this.contracts.projecty
              .connect(buyer)
              .payInstallment(entryId, { value: installmentPerMonth })
          ).to.changeEtherBalance(this.contracts.projecty, installmentPerMonth);

          expect((await this.contracts.projecty.getBuyerInfo(bidId)).pricePaid).to.equal(
            downPayment.add(installmentPerMonth)
          );
        });

        it("increases installments paid", async function () {
          expect((await this.contracts.projecty.getSellerInfo(entryId)).installmentsPaid).to.equal(
            1
          );

          await this.contracts.projecty
            .connect(buyer)
            .payInstallment(entryId, { value: installmentPerMonth });

          expect((await this.contracts.projecty.getSellerInfo(entryId)).installmentsPaid).to.equal(
            2
          );
        });

        it("emits 'InstallmentPaid' event", async function () {
          const installmentToBePaid = 2;

          await expect(
            this.contracts.projecty
              .connect(buyer)
              .payInstallment(entryId, { value: installmentPerMonth })
          )
            .to.emit(this.contracts.projecty, "InstallmentPaid")
            .withArgs(buyer.address, entryId, bidId, installmentToBePaid);
        });
      });

      context("when buyer pays last installment (all installments complete)", function () {
        beforeEach(async function () {
          const totalInstallments: number = getTotalInstallments(buyingInstallment);

          // ensure owner of nft is projecty
          expect(await this.mocks.erc721.ownerOf(tokenId)).to.equal(
            this.contracts.projecty.address
          );

          const installmentNumber = 2;

          for (let i = installmentNumber; i <= totalInstallments; i++) {
            // increase time to one month
            await time.increase(ONE_MONTH);

            const installmentToBePaid = i;
            const installmentPerMonth = getInstallmentPerMonth(buyingInstallment, bidPrice);

            await expect(
              this.contracts.projecty
                .connect(buyer)
                .payInstallment(entryId, { value: installmentPerMonth })
            )
              .to.emit(this.contracts.projecty, "InstallmentPaid")
              .withArgs(buyer.address, entryId, bidId, installmentToBePaid);
          }
        });

        it("transfers nft to buyer", async function () {
          expect(await this.mocks.erc721.ownerOf(tokenId)).to.equal(buyer.address);
        });
      });
    });
  });
}
