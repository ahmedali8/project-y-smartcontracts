import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";

import { toWei } from "../../../../utils/format";
import { INSTALLMENT_PLAN_VALUES, InstallmentPlan } from "../../../shared/constants";
import { ProjectYErrors } from "../../../shared/errors";
import { getDownPayment, getTotalInstallments } from "../../../shared/utils";

export default function shouldBehaveLikeGetTotalInstallments(): void {
  context("when bidId is invalid", function () {
    it("reverts", async function () {
      await expect(this.contracts.projecty.getTotalInstallments(78)).to.be.revertedWith(
        ProjectYErrors.InvalidBidId
      );
    });
  });

  context("when bidId is valid", function () {
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

    INSTALLMENT_PLAN_VALUES.forEach((installmentPlan) => {
      const enumKey = InstallmentPlan[installmentPlan];

      context(`when InstallmentPlan.${enumKey}`, () => {
        const bidInstallment = installmentPlan;

        const bidId = 1;
        const bidPrice = toWei("34");
        const downPayment = getDownPayment(bidInstallment, bidPrice);
        const totalInstallments = getTotalInstallments(bidInstallment);

        beforeEach(async function () {
          // bid
          await this.contracts.projecty.connect(buyer).bid(entryId, bidPrice, bidInstallment, {
            value: downPayment,
          });
        });

        it("retrieves correct value", async function () {
          expect(await this.contracts.projecty.getTotalInstallments(bidId)).to.be.equal(
            totalInstallments
          );
        });
      });
    });
  });
}
