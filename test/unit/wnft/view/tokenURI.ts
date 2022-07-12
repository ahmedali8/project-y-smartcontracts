import { testUtils } from "hardhat";

import { ERC721__Errors } from "../../../shared/errors";
import { expect } from "../../../shared/expect";

const { time } = testUtils;

export default function shouldBehaveLikeTokenURI(): void {
  context("when token is not minted", function () {
    it("reverts", async function () {
      await expect(this.contracts.wnft.tokenURI(2)).to.be.revertedWith(
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
        .create(this.signers.accounts[0].address, expires, "ipfsHash");
    });

    it("retrieves correct token URI with prefixed baseURI", async function () {
      expect(await this.contracts.wnft.tokenURI(firstTokenId)).to.equal("ipfs://ipfsHash");
    });
  });
}
