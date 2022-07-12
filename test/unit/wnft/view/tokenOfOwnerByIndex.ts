import { testUtils } from "hardhat";

import { ERC721Enumerable__Errors } from "../../../shared/errors";
import { expect } from "../../../shared/expect";

const { time } = testUtils;

export default function shouldBehaveLikeTokenOfOwnerByIndex(): void {
  context("when token is not minted", function () {
    it("reverts", async function () {
      await expect(
        this.contracts.wnft.tokenOfOwnerByIndex(this.signers.owner.address, 2)
      ).to.be.revertedWith(ERC721Enumerable__Errors.OwnerIndexOutOfBounds);
    });
  });

  context("when token has been minted", function () {
    const firstTokenId = 1;
    const secondTokenId = 2;

    beforeEach(async function () {
      const expires = (await time.latest()) + time.duration.minutes(10);
      // mint 2 tokens
      for (let i = 0; i < 2; i++) {
        await this.contracts.wnft
          .connect(this.signers.owner)
          .create(this.signers.accounts[0].address, expires, "tokenURI");
      }
    });

    describe("when the given address does not own any token", function () {
      it("reverts", async function () {
        await expect(
          this.contracts.wnft.tokenOfOwnerByIndex(this.signers.accounts[3].address, 0)
        ).to.be.revertedWith(ERC721Enumerable__Errors.OwnerIndexOutOfBounds);
      });
    });

    describe("when the index is greater than or equal to the total tokens owned by the given address", function () {
      it("reverts", async function () {
        await expect(
          this.contracts.wnft.tokenOfOwnerByIndex(this.signers.accounts[0].address, secondTokenId)
        ).to.be.revertedWith(ERC721Enumerable__Errors.OwnerIndexOutOfBounds);
      });
    });

    describe("when the given index is lower than the amount of tokens owned by the given address", function () {
      it("retrieves the tokenId placed at the given index", async function () {
        expect(
          await this.contracts.wnft.tokenOfOwnerByIndex(this.signers.accounts[0].address, 0)
        ).to.be.equal(firstTokenId);
      });
    });
  });
}
