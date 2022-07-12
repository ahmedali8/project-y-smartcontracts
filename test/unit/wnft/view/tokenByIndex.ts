import { testUtils } from "hardhat";

import { ERC721Enumerable__Errors } from "../../../shared/errors";
import { expect } from "../../../shared/expect";

const { time } = testUtils;

export default function shouldBehaveLikeTokenByIndex(): void {
  context("when token is not minted", function () {
    it("reverts", async function () {
      await expect(this.contracts.wnft.tokenByIndex(2)).to.be.revertedWith(
        ERC721Enumerable__Errors.GlobalIndexOutOfBounds
      );
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

    it("reverts if index is greater than supply", async function () {
      await expect(this.contracts.wnft.tokenByIndex(2)).to.be.revertedWith(
        ERC721Enumerable__Errors.GlobalIndexOutOfBounds
      );
    });

    it("retrieves all tokens", async function () {
      const tokensListed = await Promise.all(
        [0, 1].map((i) => this.contracts.wnft.tokenByIndex(i))
      );

      expect(tokensListed).to.deep.equal([firstTokenId, secondTokenId]);
    });

    [firstTokenId, secondTokenId].forEach(function (tokenId) {
      it(`returns all tokens after burning token ${tokenId} and minting new tokens`, async function () {
        const newTokenId = 3;
        const anotherNewTokenId = 4;

        await time.increase(time.duration.minutes(20));

        await this.contracts.wnft.connect(this.signers.owner).burn(tokenId);

        // mint 2 tokens
        const expires = (await time.latest()) + time.duration.minutes(10);
        for (let i = 0; i < 2; i++) {
          await this.contracts.wnft
            .connect(this.signers.owner)
            .create(this.signers.accounts[1].address, expires, "tokenURI");
        }

        expect(await this.contracts.wnft.totalSupply()).to.be.equal(3);

        const tokensListed = await Promise.all(
          [0, 1, 2].map((i) => this.contracts.wnft.tokenByIndex(i))
        );
        const expectedTokens = [firstTokenId, secondTokenId, newTokenId, anotherNewTokenId].filter(
          (x) => x !== tokenId
        );
        expect(tokensListed).to.deep.equal(expectedTokens);
      });
    });
  });
}
