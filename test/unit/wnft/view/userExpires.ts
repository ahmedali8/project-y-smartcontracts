import { Zero } from "@ethersproject/constants";
import { testUtils } from "hardhat";

import { ZERO_ADDRESS } from "../../../../utils/constants";
import { expect } from "../../../shared/expect";

const { time } = testUtils;

export default function shouldBehaveLikeUserExpires(): void {
  context("when token is not minted", function () {
    const nonExistentTokenId = 3;

    it("retrieves zero", async function () {
      expect(await this.contracts.wnft.userExpires(nonExistentTokenId)).to.equal(Zero);
    });
  });

  context("when token has been minted", function () {
    const firstTokenId = 1;
    const secondTokenId = 2;
    let expires: number;

    beforeEach(async function () {
      expires = (await time.latest()) + time.duration.minutes(10);

      // mint 2 tokens
      for (let i = 0; i < 2; i++) {
        await this.contracts.wnft
          .connect(this.signers.owner)
          .create(this.signers.accounts[i].address, expires, `ipfsHash${i + 1}`);
      }
    });

    it("retrieves the correct userExpires of tokenId", async function () {
      expect(await this.contracts.wnft.userExpires(firstTokenId)).to.equal(expires);
      expect(await this.contracts.wnft.userExpires(secondTokenId)).to.equal(expires);
    });

    it("retrieves correct userExpires after user is expired", async function () {
      await time.increase(time.duration.minutes(30));

      expect(await this.contracts.wnft.userExpires(firstTokenId)).to.equal(expires);
      expect(await this.contracts.wnft.userExpires(secondTokenId)).to.equal(expires);
    });

    it("retrieves zero userExpires after tokenId is burned", async function () {
      await time.increase(time.duration.minutes(30));

      await expect(this.contracts.wnft.connect(this.signers.owner).burn(firstTokenId))
        .to.emit(this.contracts.wnft, "UpdateUser")
        .withArgs(firstTokenId, ZERO_ADDRESS, Zero);

      expect(await this.contracts.wnft.userExpires(firstTokenId)).to.equal(Zero);
    });
  });
}
