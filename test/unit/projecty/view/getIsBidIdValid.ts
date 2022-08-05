import { expect } from "chai";

import { toWei } from "../../../../utils/format";
import { InstallmentPlan } from "../../../shared/constants";
import { getDownPayment } from "../../../shared/utils";

export default function shouldBehaveLikeGetIsBidIdValid(): void {
  context("when bidId is invalid", function () {
    it("retrieves false", async function () {
      expect(await this.contracts.projecty.getIsBidIdValid(3434)).to.be.equal(false);
    });
  });

  context("when bidId is valid", function () {
    const bidId = 1;

    beforeEach(async function () {
      const entryId = 1;
      const tokenId = 1;
      const erc721Address = this.mocks.erc721.address;
      const seller = this.signers.accounts[0];
      const buyer = this.signers.accounts[1];
      const sellingPrice = toWei("10");
      const sellingInstallment = InstallmentPlan.NineMonths;
      const bidPrice = toWei("4");
      const bidInstallment = InstallmentPlan.SixMonths;
      const downPayment = getDownPayment(bidInstallment, bidPrice);

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
    });

    it("retrieves true", async function () {
      expect(await this.contracts.projecty.getIsBidIdValid(bidId)).to.be.equal(true);
    });
  });
}
