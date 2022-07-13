import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { testUtils } from "hardhat";

import { ERC721__Errors } from "../../../shared/errors";
import { expect } from "../../../shared/expect";

const { time } = testUtils;

export default function shouldBehaveLikeSetApprovalForAll(): void {
  let tokenOwner: SignerWithAddress;
  let operator: SignerWithAddress;

  before(async function () {
    [tokenOwner, operator] = this.signers.accounts;
  });

  context("when the operator is the owner", function () {
    it("reverts", async function () {
      await expect(
        this.contracts.wnft.connect(tokenOwner).setApprovalForAll(tokenOwner.address, true)
      ).to.be.revertedWith(ERC721__Errors.ApproveToCaller);
    });
  });

  context("when the operator willing to approve is not the owner", function () {
    beforeEach(async function () {
      const expires = (await time.latest()) + time.duration.minutes(10);

      // mint 2 tokens to tokenOwner
      for (let i = 0; i < 2; i++) {
        await this.contracts.wnft
          .connect(this.signers.owner)
          .create(tokenOwner.address, expires, "tokenURI");
      }
    });

    context("when the operator was set as not approved", function () {
      beforeEach(async function () {
        await this.contracts.wnft.connect(tokenOwner).setApprovalForAll(operator.address, false);
      });

      it("approves the operator", async function () {
        await this.contracts.wnft.connect(tokenOwner).setApprovalForAll(operator.address, true);
        expect(
          await this.contracts.wnft.isApprovedForAll(tokenOwner.address, operator.address)
        ).to.equal(true);
      });

      it("emits an approval event", async function () {
        await expect(
          this.contracts.wnft.connect(tokenOwner).setApprovalForAll(operator.address, true)
        )
          .to.emit(this.contracts.wnft, "ApprovalForAll")
          .withArgs(tokenOwner.address, operator.address, true);
      });

      it("can unset the operator approval", async function () {
        await this.contracts.wnft.connect(tokenOwner).setApprovalForAll(operator.address, false);
        expect(
          await this.contracts.wnft.isApprovedForAll(tokenOwner.address, operator.address)
        ).to.equal(false);
      });
    });

    context("when the operator was already approved", function () {
      beforeEach(async function () {
        await this.contracts.wnft.connect(tokenOwner).setApprovalForAll(operator.address, true);
      });

      it("keeps the approval to the given address", async function () {
        await this.contracts.wnft.connect(tokenOwner).setApprovalForAll(operator.address, true);
        expect(
          await this.contracts.wnft.isApprovedForAll(tokenOwner.address, operator.address)
        ).to.equal(true);
      });

      it("emits an approval event", async function () {
        await expect(
          this.contracts.wnft.connect(tokenOwner).setApprovalForAll(operator.address, true)
        )
          .to.emit(this.contracts.wnft, "ApprovalForAll")
          .withArgs(tokenOwner.address, operator.address, true);
      });
    });

    context("when there is no operator approval set by the sender", function () {
      it("approves the operator", async function () {
        await this.contracts.wnft.connect(tokenOwner).setApprovalForAll(operator.address, true);
        expect(
          await this.contracts.wnft.isApprovedForAll(tokenOwner.address, operator.address)
        ).to.equal(true);
      });

      it("emits an approval event", async function () {
        await expect(
          this.contracts.wnft.connect(tokenOwner).setApprovalForAll(operator.address, true)
        )
          .to.emit(this.contracts.wnft, "ApprovalForAll")
          .withArgs(tokenOwner.address, operator.address, true);
      });
    });
  });
}
