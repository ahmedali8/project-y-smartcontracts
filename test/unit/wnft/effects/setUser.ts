import { testUtils } from "hardhat";

import { ERC721__Errors, ERC4907__Errors, Owned__Errors } from "../../../shared/errors";
import { expect } from "../../../shared/expect";

const { time } = testUtils;

export default function shouldBehaveLikeSetUser(): void {
  const tokenId = 1;

  context("when non-owner sets user", function () {
    it("reverts", async function () {
      await expect(
        this.contracts.wnft
          .connect(this.signers.accounts[0])
          .setUser(tokenId, this.signers.accounts[0].address, 432234224)
      ).to.be.revertedWith(Owned__Errors.Unauthorized);
    });
  });

  context("when owner sets user", function () {
    context("when token is not created", function () {
      it("reverts", async function () {
        const expires = (await time.latest()) + time.duration.minutes(10);

        await expect(
          this.contracts.wnft
            .connect(this.signers.owner)
            .setUser(tokenId, this.signers.accounts[0].address, expires)
        ).to.be.revertedWith(ERC721__Errors.InvalidTokenId);
      });
    });

    context("when token is created", function () {
      let expires: number;

      beforeEach(async function () {
        expires = (await time.latest()) + time.duration.minutes(10);
        await this.contracts.wnft
          .connect(this.signers.owner)
          .create(this.signers.accounts[0].address, expires, "randomTokenURI1");
      });

      context("when setUser is called with expires less then block.timestamp", function () {
        it("reverts", async function () {
          const invalidExpires = (await time.latest()) - 10;
          await expect(
            this.contracts.wnft
              .connect(this.signers.owner)
              .setUser(tokenId, this.signers.accounts[0].address, invalidExpires)
          ).to.be.revertedWith(ERC4907__Errors.InvalidExpires);
        });
      });

      context("when setUser is called for same tokenId after creation", function () {
        it("retrieves new userExpires", async function () {
          const newExpires = (await time.latest()) + time.duration.days(1);
          await expect(
            this.contracts.wnft
              .connect(this.signers.owner)
              .setUser(tokenId, this.signers.accounts[0].address, newExpires)
          )
            .to.emit(this.contracts.wnft, "UpdateUser")
            .withArgs(tokenId, this.signers.accounts[0].address, newExpires);

          expect(await this.contracts.wnft.userExpires(tokenId)).to.equal(newExpires);
        });
      });
    });
  });
}
