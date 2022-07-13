import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { testUtils } from "hardhat";

import { ZERO_ADDRESS } from "../../../../utils/constants";
import { ERC721__Errors } from "../../../shared/errors";
import { expect } from "../../../shared/expect";

const { time } = testUtils;

export default function shouldBehaveLikeApprove(): void {
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
        this.contracts.wnft.connect(operator).approve(approved.address, nonExistentTokenId)
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
    });

    context("when the address that receives the approval is the owner", function () {
      it("reverts", async function () {
        await expect(
          this.contracts.wnft.connect(tokenOwner).approve(tokenOwner.address, tokenId)
        ).to.be.revertedWith(ERC721__Errors.ApprovalToCurrentOwner);
      });
    });

    context("when the sender is not owner of the given tokenId", function () {
      it("reverts", async function () {
        await expect(
          this.contracts.wnft.connect(this.signers.accounts[6]).approve(approved.address, tokenId)
        ).to.be.revertedWith(ERC721__Errors.ApproveCallerIsNotOwnerNorApproved);
      });
    });

    context("when the sender is not approved for the given tokenId", function () {
      it("reverts", async function () {
        await this.contracts.wnft.connect(tokenOwner).approve(approved.address, tokenId);
        await expect(
          this.contracts.wnft.connect(approved).approve(this.signers.accounts[6].address, tokenId)
        ).to.be.revertedWith(ERC721__Errors.ApproveCallerIsNotOwnerNorApproved);
      });
    });

    context("when approving a zero address", function () {
      it("does not revert", async function () {
        await this.contracts.wnft.connect(tokenOwner).approve(ZERO_ADDRESS, tokenId);
      });
    });

    context("when clearing approval", function () {
      context("when there was no prior approval", function () {
        beforeEach(async function () {
          await expect(this.contracts.wnft.connect(tokenOwner).approve(ZERO_ADDRESS, tokenId))
            .to.emit(this.contracts.wnft, "Approval")
            .withArgs(tokenOwner.address, ZERO_ADDRESS, tokenId);
        });

        it("clears approval for the token", async function () {
          expect(await this.contracts.wnft.getApproved(tokenId)).to.be.equal(ZERO_ADDRESS);
        });
      });

      context("when there was a prior approval", function () {
        beforeEach(async function () {
          await this.contracts.wnft.connect(tokenOwner).approve(approved.address, tokenId);

          await expect(this.contracts.wnft.connect(tokenOwner).approve(ZERO_ADDRESS, tokenId))
            .to.emit(this.contracts.wnft, "Approval")
            .withArgs(tokenOwner.address, ZERO_ADDRESS, tokenId);
        });

        it("clears approval for the token", async function () {
          expect(await this.contracts.wnft.getApproved(tokenId)).to.be.equal(ZERO_ADDRESS);
        });
      });
    });

    context("when approving a non-zero address", function () {
      context("when there was no prior approval", function () {
        beforeEach(async function () {
          await expect(this.contracts.wnft.connect(tokenOwner).approve(approved.address, tokenId))
            .to.emit(this.contracts.wnft, "Approval")
            .withArgs(tokenOwner.address, approved.address, tokenId);
        });

        it("sets the approval for the target address", async function () {
          expect(await this.contracts.wnft.getApproved(tokenId)).to.be.equal(approved.address);
        });
      });

      context("when there was a prior approval to the same address", function () {
        beforeEach(async function () {
          await this.contracts.wnft.connect(tokenOwner).approve(approved.address, tokenId);

          await expect(this.contracts.wnft.connect(tokenOwner).approve(approved.address, tokenId))
            .to.emit(this.contracts.wnft, "Approval")
            .withArgs(tokenOwner.address, approved.address, tokenId);
        });

        it("sets the approval for the target address", async function () {
          expect(await this.contracts.wnft.getApproved(tokenId)).to.be.equal(approved.address);
        });
      });

      context("when there was a prior approval to a different address", function () {
        beforeEach(async function () {
          await this.contracts.wnft
            .connect(tokenOwner)
            .approve(this.signers.accounts[5].address, tokenId);

          await expect(
            this.contracts.wnft
              .connect(tokenOwner)
              .approve(this.signers.accounts[5].address, tokenId)
          )
            .to.emit(this.contracts.wnft, "Approval")
            .withArgs(tokenOwner.address, this.signers.accounts[5].address, tokenId);
        });

        it("sets the approval for the target address", async function () {
          expect(await this.contracts.wnft.getApproved(tokenId)).to.be.equal(
            this.signers.accounts[5].address
          );
        });
      });
    });

    context("when the sender is an operator", function () {
      beforeEach(async function () {
        await this.contracts.wnft.connect(tokenOwner).setApprovalForAll(operator.address, true);

        await expect(this.contracts.wnft.connect(operator).approve(approved.address, tokenId))
          .to.emit(this.contracts.wnft, "Approval")
          .withArgs(tokenOwner.address, approved.address, tokenId);
      });

      it("sets the approval for the target address", async function () {
        expect(await this.contracts.wnft.getApproved(tokenId)).to.be.equal(approved.address);
      });
    });
  });
}
