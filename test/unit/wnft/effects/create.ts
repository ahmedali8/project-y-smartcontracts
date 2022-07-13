import { testUtils } from "hardhat";

import { ERC721__Errors, ERC4907__Errors, Owned__Errors } from "../../../shared/errors";
import { expect } from "../../../shared/expect";

const { time } = testUtils;

export default function shouldBehaveLikeCreate(): void {
  context("when non-owner creates token", function () {
    it("reverts", async function () {
      await expect(
        this.contracts.wnft
          .connect(this.signers.accounts[0])
          .create(this.signers.accounts[0].address, 23232323, "randomTokenURI")
      ).to.be.revertedWith(Owned__Errors.Unauthorized);
    });
  });

  context("when owner creates token", function () {
    context("when expires is less then block.timestamp", function () {
      it("reverts", async function () {
        const invalidExpires = (await time.latest()) - 10;
        await expect(
          this.contracts.wnft
            .connect(this.signers.owner)
            .create(this.signers.accounts[0].address, invalidExpires, "randomTokenURI")
        ).to.be.revertedWith(ERC4907__Errors.InvalidExpires);
      });
    });

    context("when expires is greater then block.timestamp", function () {
      let expires: number;
      beforeEach(async function () {
        expires = (await time.latest()) + time.duration.minutes(10);
        await this.contracts.wnft
          .connect(this.signers.owner)
          .create(this.signers.accounts[0].address, expires, "randomTokenURI1");
      });

      it("retrieves 1 as first tokenId", async function () {
        expect(await this.contracts.wnft.ownerOf(1)).to.be.equal(this.signers.accounts[0].address);
        await expect(this.contracts.wnft.ownerOf(0)).to.be.revertedWith(
          ERC721__Errors.InvalidTokenId
        );
      });

      it("retrieves correct tokenURI", async function () {
        expect(await this.contracts.wnft.tokenURI(1)).to.equal("ipfs://randomTokenURI1");
      });

      it("retrieves correct userOf", async function () {
        expect(await this.contracts.wnft.userOf(1)).to.equal(this.signers.accounts[0].address);
      });

      it("retrieves correct userExpires", async function () {
        expect(await this.contracts.wnft.userExpires(1)).to.equal(expires);
      });

      it("emits WNFTCreated event", async function () {
        const expires = (await time.latest()) + time.duration.minutes(10);
        await expect(
          this.contracts.wnft
            .connect(this.signers.owner)
            .create(this.signers.accounts[0].address, expires, "tokenURI")
        )
          .to.emit(this.contracts.wnft, "WNFTCreated")
          .withArgs(2, this.signers.accounts[0].address, "tokenURI");
      });
    });
  });
}
