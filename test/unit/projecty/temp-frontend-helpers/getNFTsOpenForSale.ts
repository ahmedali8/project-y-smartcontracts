import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";

import { toWei } from "../../../../utils/format";
import { BIDDING_PERIOD, InstallmentPlan } from "../../../shared/constants";

export default function shouldBehaveLikeGetNFTsOpenForSale(): void {
  context("when there are no entryIds", function () {
    it("retrieves empty arrays", async function () {
      expect(await this.contracts.projecty.getNFTsOpenForSale()).to.deep.equal([[], []]);
    });
  });

  context("when there are two entryIds", function () {
    const tokenIds = [1, 2] as const;

    const entryIds = [1, 2];
    const sellingPrices = [toWei("23"), toWei("45")];
    const sellingInstallments = [InstallmentPlan.ThreeMonths, InstallmentPlan.SixMonths];

    let erc721Address: string;
    let seller: SignerWithAddress;

    before(async function () {
      erc721Address = this.mocks.erc721.address;
      seller = this.signers.accounts[0];
    });

    beforeEach(async function () {
      for (let i = 0; i < entryIds.length; i++) {
        // create mock erc721 token
        await this.mocks.erc721.mint(seller.address, tokenIds[i]);
        await this.mocks.erc721
          .connect(seller)
          .approve(this.contracts.projecty.address, tokenIds[i]);

        // list for selling
        await this.contracts.projecty
          .connect(seller)
          .sell(erc721Address, tokenIds[i], sellingPrices[i], sellingInstallments[i]);
      }
    });

    context("when seller withdraw entryId after bidding period", function () {
      it("retrieves correct values", async function () {
        const entryId = entryIds[1];

        // bidding period over
        await time.increase(BIDDING_PERIOD);

        await this.contracts.projecty.connect(seller).withdrawSell(entryId);

        expect(await this.contracts.projecty.getNFTsOpenForSale()).to.not.empty;
      });
    });

    context("when seller does nothing", function () {
      it("retrieves correct values", async function () {
        expect(await this.contracts.projecty.getNFTsOpenForSale()).to.not.empty;
      });
    });
  });
}
