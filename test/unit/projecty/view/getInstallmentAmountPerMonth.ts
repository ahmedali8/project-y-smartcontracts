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
import { getDownPayment, getInstallmentPerMonth } from "../../../shared/utils";

export default function shouldBehaveLikeGetInstallmentAmountPerMonth(): void {
  context("when entryId is invalid", function () {
    it("reverts", async function () {
      await expect(this.contracts.projecty.getInstallmentAmountPerMonth(78)).to.be.revertedWith(
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

    context("when bid is not selected", function () {
      it("reverts", async function () {
        await expect(
          this.contracts.projecty.getInstallmentAmountPerMonth(entryId)
        ).to.be.revertedWith(ProjectYErrors.InvalidBidId);
      });
    });

    INSTALLMENT_PLAN_VALUES.filter((v) => v != InstallmentPlan.None).forEach((installmentPlan) => {
      const enumKey = InstallmentPlan[installmentPlan];

      context(`when InstallmentPlan.${enumKey}`, () => {
        const bidInstallment = installmentPlan;
        const bidId = 1;
        const bidPrice = toWei("34");
        const downPayment = getDownPayment(bidInstallment, bidPrice);
        const installmentPerMonth = getInstallmentPerMonth(bidInstallment, bidPrice);

        beforeEach(async function () {
          // bid
          await this.contracts.projecty.connect(buyer).bid(entryId, bidPrice, bidInstallment, {
            value: downPayment,
          });

          // bidding period over
          await time.increase(BIDDING_PERIOD);

          // select bid
          await this.contracts.projecty.connect(seller).selectBid(bidId);
        });

        it("retrieves correct value", async function () {
          expect(await this.contracts.projecty.getInstallmentAmountPerMonth(bidId)).to.be.equal(
            installmentPerMonth
          );
        });
      });
    });
  });
}
