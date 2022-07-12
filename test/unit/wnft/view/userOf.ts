import { Zero } from "@ethersproject/constants";
import { expect } from "chai";
import { testUtils } from "hardhat";

import { ZERO_ADDRESS } from "../../../../utils/constants";

const { time } = testUtils;

export default function shouldBehaveLikeUserOf(): void {
  context("when token is not minted", function () {
    const nonExistentTokenId = 3;

    it("retrieves zero address", async function () {
      expect(await this.contracts.wnft.userOf(nonExistentTokenId)).to.equal(ZERO_ADDRESS);
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
          .create(this.signers.accounts[i].address, expires, `ipfsHash${i + 1}`);
      }
    });

    it("retrieves the correct userOf tokenId", async function () {
      expect(await this.contracts.wnft.userOf(firstTokenId)).to.equal(
        this.signers.accounts[0].address
      );
      expect(await this.contracts.wnft.userOf(secondTokenId)).to.equal(
        this.signers.accounts[1].address
      );
    });

    it("retrieves zero address after user is expired", async function () {
      await time.increase(time.duration.minutes(30));

      expect(await this.contracts.wnft.userOf(firstTokenId)).to.equal(ZERO_ADDRESS);
      expect(await this.contracts.wnft.userOf(secondTokenId)).to.equal(ZERO_ADDRESS);
    });

    it("retrieves zero address after tokenId is burned", async function () {
      await time.increase(time.duration.minutes(30));

      await expect(this.contracts.wnft.connect(this.signers.owner).burn(firstTokenId))
        .to.emit(this.contracts.wnft, "UpdateUser")
        .withArgs(firstTokenId, ZERO_ADDRESS, Zero);

      expect(await this.contracts.wnft.userOf(firstTokenId)).to.equal(ZERO_ADDRESS);
    });
  });
}
