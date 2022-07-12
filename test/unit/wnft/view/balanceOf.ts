import type { BigNumber } from "@ethersproject/bignumber";
import { Zero } from "@ethersproject/constants";
import { testUtils } from "hardhat";

import { ZERO_ADDRESS } from "../../../../utils/constants";
import { ERC721__Errors } from "../../../shared/errors";
import { expect } from "../../../shared/expect";

const { time } = testUtils;

export default function shouldBehaveLikeBalanceOf(): void {
  context("when the account is zero address", function () {
    it("reverts", async function () {
      await expect(this.contracts.wnft.balanceOf(ZERO_ADDRESS)).to.be.revertedWith(
        ERC721__Errors.AddressZeroIsNotAValidOwner
      );
    });
  });

  context("when the account does not have a balance", function () {
    it("retrieves zero", async function () {
      const balance: BigNumber = await this.contracts.wnft.balanceOf(
        this.signers.accounts[0].address
      );
      expect(balance).to.equal(Zero);
    });
  });

  context("when the account has a balance", function () {
    beforeEach(async function () {
      const expires = (await time.latest()) + time.duration.minutes(10);
      await this.contracts.wnft
        .connect(this.signers.owner)
        .create(this.signers.accounts[0].address, expires, "tokenURI");
    });

    it("retrieves the correct balance", async function () {
      expect(await this.contracts.wnft.balanceOf(this.signers.accounts[0].address)).to.be.equal(1);
    });
  });
}
