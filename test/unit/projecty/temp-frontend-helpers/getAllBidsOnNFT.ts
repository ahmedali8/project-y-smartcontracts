import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";

import { toWei } from "../../../../utils/format";
import { BIDDING_PERIOD, InstallmentPlan } from "../../../shared/constants";
import { getDownPayment } from "../../../shared/utils";

export default function shouldBehaveLikeGetAllBidsOnNFT(): void {
  context("when there are no entryId and bidIds", function () {
    it("retrieves empty arrays", async function () {
      expect(await this.contracts.projecty.getAllBidsOnNFT(23)).to.deep.equal([[], []]);
    });
  });

  context("when entryId and bidIds are present", function () {
    const tokenId = 1 as const;

    const entryId = 1;
    const sellingPrice = toWei("23");
    const sellingInstallment = InstallmentPlan.ThreeMonths;

    const bidIds = [1, 2, 3, 4];
    const bidPrices = [toWei("10"), toWei("105"), toWei("7"), toWei("3")];
    const bidInstallments = [
      InstallmentPlan.None,
      InstallmentPlan.NineMonths,
      InstallmentPlan.SixMonths,
      InstallmentPlan.ThreeMonths,
    ];
    // const NONE_INDEX = 0;

    const buyers: SignerWithAddress[] = [] as Array<SignerWithAddress>;

    let erc721Address: string;
    let seller: SignerWithAddress;

    before(async function () {
      erc721Address = this.mocks.erc721.address;
      seller = this.signers.accounts[0];

      for (let i = 1; i <= 4; i++) {
        buyers.push(this.signers.accounts[i]);
      }
    });

    beforeEach(async function () {
      // create mock erc721 token
      await this.mocks.erc721.mint(seller.address, tokenId);
      await this.mocks.erc721.connect(seller).approve(this.contracts.projecty.address, tokenId);

      // list for selling
      await this.contracts.projecty
        .connect(seller)
        .sell(erc721Address, tokenId, sellingPrice, sellingInstallment);

      // buyers bid
      for (let i = 0; i < buyers.length; i++) {
        const bidPrice = bidPrices[i];
        const bidInstallment = bidInstallments[i];

        await this.contracts.projecty.connect(buyers[i]).bid(entryId, bidPrice, bidInstallment, {
          value: getDownPayment(bidInstallment, bidPrice),
        });
      }
    });

    context("when buyer withdraw one bid", function () {
      it("retrieves correct value", async function () {
        // bidding period over
        await time.increase(BIDDING_PERIOD);

        await this.contracts.projecty.connect(buyers[1]).withdrawBid(bidIds[1]);

        expect(await this.contracts.projecty.getAllBidsOnNFT(entryId)).to.not.empty;
      });
    });

    context("when no bid is withdrawn", function () {
      it("retrieves correct values", async function () {
        expect(await this.contracts.projecty.getAllBidsOnNFT(entryId)).to.not.empty;
      });
    });
  });
}
