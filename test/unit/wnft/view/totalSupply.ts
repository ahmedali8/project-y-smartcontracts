import { testUtils } from "hardhat";

import { expect } from "../../../shared/expect";

const { time } = testUtils;

export default function shouldBehaveLikeTotalSupply(): void {
  context("when token is not minted", function () {
    it("retrieves zero", async function () {
      expect(await this.contracts.wnft.totalSupply()).to.be.equal(0);
    });
  });

  context("when token has been minted", function () {
    beforeEach(async function () {
      const expires = (await time.latest()) + time.duration.minutes(10);
      await this.contracts.wnft
        .connect(this.signers.owner)
        .create(this.signers.accounts[0].address, expires, "tokenURI");
      await this.contracts.wnft
        .connect(this.signers.owner)
        .create(this.signers.accounts[0].address, expires, "tokenURI");
    });

    it("retrieves correct total supply", async function () {
      expect(await this.contracts.wnft.totalSupply()).to.be.equal(2);
    });
  });
}
