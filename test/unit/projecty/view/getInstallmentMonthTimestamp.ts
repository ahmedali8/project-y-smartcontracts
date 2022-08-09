import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";

import { toWei } from "../../../../utils/format";
import { BIDDING_PERIOD, InstallmentPlan, ONE_MONTH } from "../../../shared/constants";
import { ProjectYErrors } from "../../../shared/errors";
import { getDownPayment } from "../../../shared/utils";

export default function shouldBehaveLikeGetInstallmentMonthTimestamp(): void {
  context("when bidId is invalid", function () {
    it("reverts", async function () {
      await expect(this.contracts.projecty.getInstallmentMonthTimestamp(78, 7)).to.be.revertedWith(
        ProjectYErrors.InvalidBidId
      );
    });
  });

  context("when bidId is valid", function () {
    const tokenId = 1 as const;

    const entryId = 1;
    const sellingPrice = toWei("23");
    const sellingInstallment = InstallmentPlan.NineMonths;

    const bidInstallment = InstallmentPlan.ThreeMonths;
    const bidId = 1;
    const bidPrice = toWei("34");
    const downPayment = getDownPayment(bidInstallment, bidPrice);

    let erc721Address: string;
    let seller: SignerWithAddress;
    let buyer: SignerWithAddress;
    let installmentTimestamp: number;

    before(async function () {
      erc721Address = this.mocks.erc721.address;
      seller = this.signers.accounts[0];
      buyer = this.signers.accounts[1];
    });

    beforeEach(async function () {
      // create mock erc721 token
      await this.mocks.erc721.mint(seller.address, tokenId);
      await this.mocks.erc721.connect(seller).approve(this.contracts.projecty.address, tokenId);

      // list for selling
      await this.contracts.projecty
        .connect(seller)
        .sell(erc721Address, tokenId, sellingPrice, sellingInstallment);

      // bid
      await this.contracts.projecty.connect(buyer).bid(entryId, bidPrice, bidInstallment, {
        value: downPayment,
      });

      // bidding period over
      await time.increase(BIDDING_PERIOD);

      // select bid
      installmentTimestamp = await time.latest();
      await this.contracts.projecty.connect(seller).selectBid(bidId);
    });

    context("when installment number is zero", function () {
      it("reverts", async function () {
        await expect(
          this.contracts.projecty.getInstallmentMonthTimestamp(bidId, 0)
        ).to.be.revertedWith(ProjectYErrors.InvalidInstallmentNumber);
      });
    });

    context("when installment number is correct", function () {
      it("retrieves correct value for first month", async function () {
        // first payment timestamp
        const firstInstallmentNumber = 1;
        expect(
          await this.contracts.projecty.getInstallmentMonthTimestamp(bidId, firstInstallmentNumber)
        ).to.approximately(installmentTimestamp, 1);
      });

      it("retrieves correct value for second month", async function () {
        // first payment timestamp
        const firstInstallmentNumber = 2;
        expect(
          await this.contracts.projecty.getInstallmentMonthTimestamp(bidId, firstInstallmentNumber)
        ).to.approximately(installmentTimestamp + ONE_MONTH, 1);
      });

      it("retrieves correct value for third month", async function () {
        // first payment timestamp
        const firstInstallmentNumber = 3;
        expect(
          await this.contracts.projecty.getInstallmentMonthTimestamp(bidId, firstInstallmentNumber)
        ).to.approximately(installmentTimestamp + 2 * ONE_MONTH, 1);
      });
    });
  });
}
