import { testUtils } from "hardhat";

import { ERC721__Errors } from "../../../shared/errors";
import { expect } from "../../../shared/expect";

const { time } = testUtils;

export default function shouldBehaveLikeGetApproved(): void {
  context("when token is not minted", function () {
    const nonExistentTokenId = 5;

    it("reverts", async function () {
      await expect(this.contracts.wnft.getApproved(nonExistentTokenId)).to.be.revertedWith(
        ERC721__Errors.InvalidTokenId
      );
    });
  });

  context("when token has been minted", function () {
    const firstTokenId = 1;

    beforeEach(async function () {
      const expires = (await time.latest()) + time.duration.minutes(10);
      await this.contracts.wnft
        .connect(this.signers.owner)
        .create(this.signers.accounts[0].address, expires, "tokenURI");

      await this.contracts.wnft
        .connect(this.signers.accounts[0])
        .approve(this.signers.accounts[1].address, firstTokenId);
    });

    it("retrieves approved account", async function () {
      expect(await this.contracts.wnft.getApproved(firstTokenId)).to.be.equal(
        this.signers.accounts[1].address
      );
    });
  });
}
