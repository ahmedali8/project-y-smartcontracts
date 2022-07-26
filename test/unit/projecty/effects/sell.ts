import { Zero } from "@ethersproject/constants";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";

import { toWei } from "../../../../utils/format";
import { InstallmentPlan } from "../../../shared/constants";
import { ERC721Errors, ProjectYErrors } from "../../../shared/errors";

export default function shouldBehaveLikeSell(): void {
  context("when invalid contract address is given", function () {
    it("reverts w/o reason", async function () {
      // function call to a non-contract account
      await expect(
        this.contracts.projecty
          .connect(this.signers.accounts[0])
          .sell(this.signers.accounts[1].address, 1, toWei("0.1"), InstallmentPlan.None)
      ).to.be.revertedWithoutReason();
    });
  });

  context("when mock erc721 is used", function () {
    const firstTokenId = 1;
    let erc721Address: string;

    before(async function () {
      erc721Address = this.mocks.erc721.address;
    });

    context("when invalid sellingPrice is given", function () {
      it("reverts", async function () {
        await expect(
          this.contracts.projecty
            .connect(this.signers.accounts[0])
            .sell(erc721Address, 1, Zero, InstallmentPlan.None)
        ).to.be.revertedWith(ProjectYErrors.InvalidPrice);
      });
    });

    context("when invalid installment plan is given", function () {
      it("reverts w/o reason", async function () {
        await expect(
          this.contracts.projecty
            .connect(this.signers.accounts[0])
            .sell(erc721Address, 1, toWei("0.1"), 9)
        ).to.be.revertedWithoutReason();
      });
    });

    context("when invalid tokenId is given", function () {
      it("reverts", async function () {
        await expect(
          this.contracts.projecty
            .connect(this.signers.accounts[0])
            .sell(erc721Address, 5, toWei("0.1"), InstallmentPlan.None)
        ).to.be.revertedWith(ERC721Errors.InvalidTokenId);
      });
    });

    context("when nft is not approved to projecty", function () {
      beforeEach(async function () {
        await this.mocks.erc721.mint(this.signers.accounts[0].address, firstTokenId);
      });

      it("reverts", async function () {
        await expect(
          this.contracts.projecty
            .connect(this.signers.accounts[0])
            .sell(erc721Address, firstTokenId, toWei("1"), InstallmentPlan.None)
        ).to.be.revertedWith(ERC721Errors.CallerIsNotTokenOwnerNorApproved);
      });
    });

    context("when seller sells his first nft", function () {
      let nftOwner: SignerWithAddress;

      beforeEach(async function () {
        nftOwner = this.signers.accounts[0];
        await this.mocks.erc721.mint(nftOwner.address, firstTokenId);
        await this.mocks.erc721
          .connect(nftOwner)
          .approve(this.contracts.projecty.address, firstTokenId);
      });

      it("transfers nft from seller to contract", async function () {
        const sellingPrice = toWei("1");
        await expect(
          this.contracts.projecty
            .connect(nftOwner)
            .sell(erc721Address, firstTokenId, sellingPrice, InstallmentPlan.NineMonths)
        )
          .to.emit(this.mocks.erc721, "Transfer")
          .withArgs(nftOwner.address, this.contracts.projecty.address, firstTokenId);

        expect(await this.mocks.erc721.ownerOf(firstTokenId)).to.equal(
          this.contracts.projecty.address
        );
      });

      it("emits Sell event", async function () {
        const sellingPrice = toWei("100");
        const expectedEntryId = 1;
        await expect(
          this.contracts.projecty
            .connect(nftOwner)
            .sell(erc721Address, firstTokenId, sellingPrice, InstallmentPlan.NineMonths)
        )
          .to.emit(this.contracts.projecty, "Sell")
          .withArgs(nftOwner.address, erc721Address, firstTokenId, expectedEntryId, anyValue);
      });

      context("when nft owner tries to transfers after listing for selling", function () {
        it("reverts", async function () {
          const sellingPrice = toWei("1");

          await this.contracts.projecty
            .connect(nftOwner)
            .sell(erc721Address, firstTokenId, sellingPrice, InstallmentPlan.NineMonths);

          await expect(
            this.mocks.erc721
              .connect(nftOwner)
              .transferFrom(nftOwner.address, this.signers.accounts[1].address, firstTokenId)
          ).to.be.revertedWith(ERC721Errors.CallerIsNotTokenOwnerNorApproved);
        });
      });
    });
  });
}
