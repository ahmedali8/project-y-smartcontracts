import { expect } from "chai";

import { toWei } from "../../../../utils/format";
import { InstallmentPlan } from "../../../shared/constants";

export default function shouldBehaveLikeGetIsEntryIdValid(): void {
  context("when entryId is invalid", function () {
    it("retrieves false", async function () {
      expect(await this.contracts.projecty.getIsEntryIdValid(3434)).to.be.equal(false);
    });
  });

  context("when entryId is valid", function () {
    const entryId = 1;

    beforeEach(async function () {
      const tokenId = 1;
      const seller = this.signers.accounts[0];
      const erc721Address = this.mocks.erc721.address;
      const sellingPrice = toWei("10");
      const sellingInstallment = InstallmentPlan.NineMonths;

      // create mock erc721 token
      await this.mocks.erc721.mint(seller.address, tokenId);
      await this.mocks.erc721.connect(seller).approve(this.contracts.projecty.address, tokenId);

      // list for selling
      await this.contracts.projecty
        .connect(seller)
        .sell(erc721Address, tokenId, sellingPrice, sellingInstallment);
    });

    it("retrieves true", async function () {
      expect(await this.contracts.projecty.getIsEntryIdValid(entryId)).to.be.equal(true);
    });
  });
}
