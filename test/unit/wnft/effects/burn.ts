import { Zero } from "@ethersproject/constants";
import { testUtils } from "hardhat";

import { ZERO_ADDRESS } from "../../../../utils/constants";
import { ERC721__Errors, Owned__Errors, WNFT__Errors } from "../../../shared/errors";
import { expect } from "../../../shared/expect";

const { time } = testUtils;

export default function shouldBehaveLikeBurn(): void {
  const tokenId = 1;

  context("when non-owner burns token", function () {
    it("reverts", async function () {
      await expect(
        this.contracts.wnft.connect(this.signers.accounts[0]).burn(tokenId)
      ).to.be.revertedWith(Owned__Errors.Unauthorized);
    });
  });

  context("when owner burns token", function () {
    let expires: number;

    beforeEach(async function () {
      expires = (await time.latest()) + time.duration.minutes(10);
      await this.contracts.wnft
        .connect(this.signers.owner)
        .create(this.signers.accounts[0].address, expires, "randomTokenURI1");
    });

    context("when burn is called before expires", function () {
      it("reverts", async function () {
        await expect(
          this.contracts.wnft.connect(this.signers.owner).burn(tokenId)
        ).to.be.revertedWith(WNFT__Errors.CannotBurnBeforeExpires);
      });
    });

    context("when burn is called after expires", function () {
      beforeEach(async function () {
        await time.increase(time.duration.minutes(20));

        await expect(this.contracts.wnft.connect(this.signers.owner).burn(tokenId))
          .to.emit(this.contracts.wnft, "Transfer")
          .withArgs(this.signers.accounts[0].address, ZERO_ADDRESS, tokenId)
          .to.emit(this.contracts.wnft, "UpdateUser")
          .withArgs(tokenId, ZERO_ADDRESS, 0)
          .to.emit(this.contracts.wnft, "WNFTBurned")
          .withArgs(1);
      });

      it("deletes associated data after burn", async function () {
        expect(await this.contracts.wnft.userOf(tokenId)).to.equal(ZERO_ADDRESS);
        expect(await this.contracts.wnft.userExpires(tokenId)).to.equal(Zero);
        await expect(this.contracts.wnft.tokenURI(tokenId)).to.be.revertedWith(
          ERC721__Errors.InvalidTokenId
        );
      });
    });
  });
}
