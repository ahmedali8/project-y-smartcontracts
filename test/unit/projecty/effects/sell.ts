import { Zero } from "@ethersproject/constants";
import { testUtils } from "hardhat";

import { toWei } from "../../../../utils/format";
import { ERC721__Errors, ProjectY__Errors } from "../../../shared/errors";
import { expect } from "../../../shared/expect";

const { time } = testUtils;

export default function shouldBehaveLikeSell(): void {
  context("when invalid contract address is given", function () {
    it("reverts", async function () {
      // function call to a non-contract account
      await expect(
        this.contracts.projecty
          .connect(this.signers.accounts[0])
          .sell(this.signers.accounts[0].address, toWei("1"), 4)
      ).to.be.reverted;
    });
  });

  context("when mock erc721 is used", function () {
    const firstTokenId = 1;
    let erc721Address: string;

    before(async function () {
      erc721Address = this.mocks.erc721.address;
    });

    context("when invalid tokenId is given", function () {
      it("reverts", async function () {
        await expect(
          this.contracts.projecty
            .connect(this.signers.accounts[0])
            .sell(erc721Address, 4, toWei("1"))
        ).to.be.revertedWith(ERC721__Errors.InvalidTokenId);
      });
    });

    context("when zero howMuchToSell is given", function () {
      it("reverts", async function () {
        await expect(
          this.contracts.projecty
            .connect(this.signers.accounts[0])
            .sell(erc721Address, firstTokenId, Zero)
        ).to.be.revertedWith(ProjectY__Errors.InvalidPrice);
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
            .sell(erc721Address, firstTokenId, toWei("1"))
        ).to.be.revertedWith(ERC721__Errors.CallerIsNotTokenOwnerNorApproved);
      });
    });

    context("when seller calls sell to lock nft", function () {
      beforeEach(async function () {
        await this.mocks.erc721.mint(this.signers.accounts[0].address, firstTokenId);
        await this.mocks.erc721
          .connect(this.signers.accounts[0])
          .approve(this.contracts.projecty.address, firstTokenId);
      });

      it("generates unique entryId", async function () {
        await this.contracts.projecty
          .connect(this.signers.accounts[0])
          .sell(erc721Address, firstTokenId, toWei("1"));

        await expect(this.contracts.projecty.isEntryIdValid(0)).to.revertedWith(
          ProjectY__Errors.InvalidEntryId
        );

        expect(await this.contracts.projecty.isEntryIdValid(1)).to.equal(true);
      });

      it("retrieves correct sellerInfo values", async function () {
        const entryId = 1;
        const blockTimestamp = await time.latest();

        await this.contracts.projecty
          .connect(this.signers.accounts[0])
          .sell(erc721Address, firstTokenId, toWei("1"));

        expect(await this.contracts.projecty.sellerOnSale(entryId)).to.equal(true);
        expect(await this.contracts.projecty.sellerAddress(entryId)).to.equal(
          this.signers.accounts[0].address
        );
        expect(await this.contracts.projecty.sellerContractAddress(entryId)).to.equal(
          erc721Address
        );
        expect(await this.contracts.projecty.sellerTimestamp(entryId)).to.approximately(
          blockTimestamp,
          2
        );
        expect(await this.contracts.projecty.sellerTokenId(entryId)).to.equal(firstTokenId);
        expect(await this.contracts.projecty.sellerHowMuchToSell(entryId)).to.equal(toWei("1"));
        expect(await this.contracts.projecty.sellerSelectedBidId(entryId)).to.equal(0);
      });

      it("emits Sell event", async function () {
        const blockTimestamp = await time.latest();
        await expect(
          this.contracts.projecty
            .connect(this.signers.accounts[0])
            .sell(erc721Address, firstTokenId, toWei("1"))
        )
          .to.emit(this.contracts.projecty, "Sell")
          .withArgs(
            this.signers.accounts[0].address,
            erc721Address,
            firstTokenId,
            1,
            blockTimestamp + 1
          );
      });
    });
  });
}
