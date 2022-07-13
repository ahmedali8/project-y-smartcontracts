import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { testUtils } from "hardhat";

import { ZERO_ADDRESS } from "../../../../utils/constants";
import { ERC721__Errors, WNFT__Errors } from "../../../shared/errors";
import { expect } from "../../../shared/expect";

const { time } = testUtils;

export default function shouldBehaveLikeSafeTransferFrom(): void {
  let tokenOwner: SignerWithAddress;
  let operator: SignerWithAddress;
  let approved: SignerWithAddress;

  const tokenId = 1;

  before(async function () {
    [tokenOwner, operator, approved] = this.signers.accounts;
  });

  context("when the token is not minted", function () {
    const nonExistentTokenId = 5;

    it("reverts", async function () {
      await expect(
        this.contracts.wnft
          .connect(tokenOwner)
          ["safeTransferFrom(address,address,uint256)"](
            tokenOwner.address,
            approved.address,
            nonExistentTokenId
          )
      ).to.be.revertedWith(ERC721__Errors.InvalidTokenId);
    });
  });

  context("when the token is minted", function () {
    beforeEach(async function () {
      const expires = (await time.latest()) + time.duration.minutes(10);

      // mint 2 tokens to tokenOwner
      for (let i = 0; i < 2; i++) {
        await this.contracts.wnft
          .connect(this.signers.owner)
          .create(tokenOwner.address, expires, "tokenURI");
      }

      await this.contracts.wnft.connect(tokenOwner).approve(approved.address, tokenId);
      await this.contracts.wnft.connect(tokenOwner).setApprovalForAll(operator.address, true);
    });

    context("when the address of the previous owner is incorrect", function () {
      it("reverts", async function () {
        const other = this.signers.accounts[5];

        await expect(
          this.contracts.wnft
            .connect(tokenOwner)
            ["safeTransferFrom(address,address,uint256)"](other.address, other.address, tokenId)
        ).to.be.revertedWith(ERC721__Errors.TransferFromIncorrectOwner);
      });
    });

    context("when the sender is not authorized for the token id", function () {
      it("reverts", async function () {
        const other = this.signers.accounts[5];

        await expect(
          this.contracts.wnft
            .connect(other)
            ["safeTransferFrom(address,address,uint256)"](
              tokenOwner.address,
              other.address,
              tokenId
            )
        ).to.be.revertedWith(ERC721__Errors.CallerIsNotTokenOwnerNorApproved);
      });
    });

    context("when the address to transfer the token to is the zero address", function () {
      it("reverts", async function () {
        await expect(
          this.contracts.wnft
            .connect(tokenOwner)
            ["safeTransferFrom(address,address,uint256)"](tokenOwner.address, ZERO_ADDRESS, tokenId)
        ).to.be.revertedWith(ERC721__Errors.TransferToZeroAddress);
      });
    });

    context("when called by the owner", function () {
      it("reverts without data", async function () {
        await expect(
          this.contracts.wnft
            .connect(tokenOwner)
            ["safeTransferFrom(address,address,uint256)"](
              tokenOwner.address,
              this.signers.accounts[1].address,
              tokenId
            )
        ).to.be.revertedWith(WNFT__Errors.NotAllowedToTransferToken);
      });

      it("reverts with data", async function () {
        await expect(
          this.contracts.wnft
            .connect(tokenOwner)
            ["safeTransferFrom(address,address,uint256,bytes)"](
              tokenOwner.address,
              this.signers.accounts[1].address,
              tokenId,
              "0x42"
            )
        ).to.be.revertedWith(WNFT__Errors.NotAllowedToTransferToken);
      });
    });
  });
}
