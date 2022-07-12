import { testUtils } from "hardhat";

import { ERC721__Errors } from "../../../shared/errors";
import { expect } from "../../../shared/expect";

const { time } = testUtils;

export default function shouldBehaveLikeOwnerOf(): void {
  context("when the tokenId is non-existent", function () {
    const nonExistentTokenId = 5;
    it("reverts", async function () {
      await expect(this.contracts.wnft.ownerOf(nonExistentTokenId)).to.be.revertedWith(
        ERC721__Errors.InvalidTokenId
      );
    });
  });

  context("when the tokenId exists", function () {
    beforeEach(async function () {
      const expires = (await time.latest()) + time.duration.minutes(10);
      await this.contracts.wnft
        .connect(this.signers.owner)
        .create(this.signers.accounts[0].address, expires, "tokenURI");
    });

    it("retrieves the correct owner", async function () {
      expect(await this.contracts.wnft.ownerOf(1)).to.be.equal(this.signers.accounts[0].address);
    });
  });
}
