import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";

import { ZERO_ADDRESS } from "../../../../utils/constants";
import { toWei } from "../../../../utils/format";
import { BIDDING_PERIOD, InstallmentPlan } from "../../../shared/constants";
import { ProjectYErrors } from "../../../shared/errors";
import { getDownPayment } from "../../../shared/utils";

export default function shouldBehaveLikeGetUserNFTsOpenForSale(): void {
  context("when user is zero address", function () {
    it("reverts", async function () {
      await expect(this.contracts.projecty.getUserNFTsOpenForSale(ZERO_ADDRESS)).to.be.revertedWith(
        ProjectYErrors.InvalidAddress
      );
    });
  });

  context("when there are no entryIds", function () {
    it("retrieves empty arrays", async function () {
      expect(
        await this.contracts.projecty.getUserNFTsOpenForSale(this.signers.accounts[0].address)
      ).to.deep.equal([[], []]);
    });
  });

  context("when there are two entryIds but only one for sale", function () {
    const tokenIds = [1, 2] as const;

    const entryIds = [1, 2];
    const sellingPrices = [toWei("23"), toWei("45")];
    const sellingInstallments = [InstallmentPlan.ThreeMonths, InstallmentPlan.SixMonths];

    const bidId = 1;
    const bidInstallment = InstallmentPlan.ThreeMonths;
    const bidPrice = toWei("34");
    const downPayment = getDownPayment(bidInstallment, bidPrice);

    let erc721Address: string;
    let seller: SignerWithAddress;
    let buyer: SignerWithAddress;

    before(async function () {
      erc721Address = this.mocks.erc721.address;
      seller = this.signers.accounts[0];
      buyer = this.signers.accounts[1];
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

      // bid
      await this.contracts.projecty.connect(buyer).bid(entryIds[0], bidPrice, bidInstallment, {
        value: downPayment,
      });

      await time.increase(BIDDING_PERIOD);
    });

    context("when seller withdraw entryId after bidding period", function () {
      it("retrieves correct values", async function () {
        await this.contracts.projecty.connect(seller).withdrawSell(entryIds[0]);

        expect(await this.contracts.projecty.getUserNFTsOpenForSale(seller.address)).to.not.empty;
      });
    });

    context("when seller selects a bid making it offSale", function () {
      it("retrieves correct values", async function () {
        // select bid
        await this.contracts.projecty.connect(seller).selectBid(bidId);

        expect(await this.contracts.projecty.getUserNFTsOpenForSale(seller.address)).to.not.empty;
      });
    });
  });
}
