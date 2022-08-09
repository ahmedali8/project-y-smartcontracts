import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";

import { ZERO_ADDRESS } from "../../../../utils/constants";
import { toWei } from "../../../../utils/format";
import { BIDDING_PERIOD, InstallmentPlan, ONE_MONTH } from "../../../shared/constants";
import { ProjectYErrors } from "../../../shared/errors";
import { getDownPayment, getInstallmentPerMonth } from "../../../shared/utils";

export default function shouldBehaveLikeGetUserNFTsOngoingInstallmentPhase(): void {
  context("when user is zero address", function () {
    it("reverts", async function () {
      await expect(
        this.contracts.projecty.getUserNFTsOngoingInstallmentPhase(ZERO_ADDRESS)
      ).to.be.revertedWith(ProjectYErrors.InvalidAddress);
    });
  });

  context("when there are no entryIds", function () {
    it("retrieves empty arrays", async function () {
      expect(
        await this.contracts.projecty.getUserNFTsOngoingInstallmentPhase(
          this.signers.accounts[0].address
        )
      ).to.deep.equal([[], [], [], [0, 0, 0, 0, 0, 0, 0, 0, 0], [], []]); // 9 max monthly payments
    });
  });

  context("when entryId and user is valid", function () {
    const tokenIds = [1, 2] as const;

    const entryIds = [1, 2];
    const sellingPrices = [toWei("23"), toWei("45")];
    const sellingInstallments = [InstallmentPlan.ThreeMonths, InstallmentPlan.SixMonths];

    const bidIds = [1, 2, 3, 4];
    const bidPrices = [toWei("10"), toWei("105"), toWei("7"), toWei("3")];
    const bidInstallments = [
      InstallmentPlan.None,
      InstallmentPlan.NineMonths,
      InstallmentPlan.SixMonths,
      InstallmentPlan.ThreeMonths,
    ];
    // const NONE_INDEX = 0;

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
      for (let i = 0; i < entryIds.length; i++) {
        // create mock erc721 token
        await this.mocks.erc721.mint(seller.address, tokenIds[i]);
        await this.mocks.erc721
          .connect(seller)
          .approve(this.contracts.projecty.address, tokenIds[i]);

        // list for selling
        await this.contracts.projecty
          .connect(seller)
          .sell(erc721Address, tokenIds[i], sellingPrices[i], sellingInstallments[i]);
      }

      // buyers bid
      let entryId: number;

      for (let i = 0; i < buyers.length; i++) {
        entryId = i === 0 || i === 2 ? entryIds[0] : entryIds[1];

        const bidPrice = bidPrices[i];
        const bidInstallment = bidInstallments[i];

        await this.contracts.projecty.connect(buyers[i]).bid(entryId, bidPrice, bidInstallment, {
          value: getDownPayment(bidInstallment, bidPrice),
        });
      }

      // bidding period over
      await time.increase(BIDDING_PERIOD);
    });

    context("when seller withdraw entryId after bidding period", function () {
      it("retrieves correct values", async function () {
        const entryId = entryIds[1];

        await this.contracts.projecty.connect(seller).withdrawSell(entryId);

        expect(
          await this.contracts.projecty.getUserNFTsOngoingInstallmentPhase(buyers[2].address)
        ).to.not.empty;
      });
    });

    context("when bid is not selected", function () {
      it("retrieves correct values", async function () {
        // all empty fields
        await this.contracts.projecty.getUserNFTsOngoingInstallmentPhase(buyers[2].address);
      });
    });

    context("when user is going through installment phase", function () {
      beforeEach(async function () {
        const bidId = bidIds[1];
        const entryId = entryIds[1];
        const paymentPerMonth = getInstallmentPerMonth(bidInstallments[1], bidPrices[1]);
        const buyer = buyers[1];

        // select bid
        await this.contracts.projecty.connect(seller).selectBid(bidId);

        // buyer pays installment after each month
        await time.increase(ONE_MONTH);

        // buyer pays installment
        await this.contracts.projecty
          .connect(buyer)
          .payInstallment(entryId, { value: paymentPerMonth });
      });

      it("retrieves correct values", async function () {
        const buyer = buyers[1];

        expect(
          await this.contracts.projecty.getUserNFTsOngoingInstallmentPhase(buyer.address)
        ).to.not.empty;
      });
    });
  });
}
