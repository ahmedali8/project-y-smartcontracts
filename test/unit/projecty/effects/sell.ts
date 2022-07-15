import { testUtils } from "hardhat";

import { toWei } from "../../../../utils/format";
import { ERC721__Errors } from "../../../shared/errors";
import { expect } from "../../../shared/expect";

const { time } = testUtils;

export default function shouldBehaveLikeSell(): void {
  context("when invalid contract address is given", function () {
    it("reverts", async function () {
      // function call to a non-contract account
      await expect(
        this.contracts.projecty
          .connect(this.signers.accounts[0])
          .sell(this.signers.accounts[0].address, toWei("1"), 4)
      ).to.be.reverted;
    });
  });

  context("when mock erc721 is used", function () {
    const firstTokenId = 1;
    let erc721Address: string;

    before(async function () {
      erc721Address = this.mocks.erc721.address;
      await this.mocks.erc721.mint(this.signers.accounts[0].address, firstTokenId);
    });

    context("when invalid tokenId is given", function () {
      it("reverts", async function () {
        await expect(
          this.contracts.projecty
            .connect(this.signers.accounts[0])
            .sell(erc721Address, toWei("1"), 4)
        ).to.be.revertedWith(ERC721__Errors.InvalidTokenId);
      });
    });
  });
}
