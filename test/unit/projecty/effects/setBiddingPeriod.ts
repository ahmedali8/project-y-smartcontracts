import type { BigNumber } from "@ethersproject/bignumber";
import { Zero } from "@ethersproject/constants";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";

import { OwnedErrors, ProjectYErrors } from "../../../shared/errors";

export default function shouldBehaveLikeSetBiddingPeriod(): void {
  context("when caller is non-owner", function () {
    it("reverts", async function () {
      const biddingPeriod = time.duration.days(1);

      await expect(
        this.contracts.projecty.connect(this.signers.accounts[0]).setBiddingPeriod(biddingPeriod)
      ).to.be.revertedWith(OwnedErrors.Unauthorized);
    });
  });

  context("when caller is owner", function () {
    context("when bidding period is set to zero", function () {
      it("reverts", async function () {
        const biddingPeriod = Zero;

        await expect(
          this.contracts.projecty.connect(this.signers.owner).setBiddingPeriod(biddingPeriod)
        ).to.be.revertedWith(ProjectYErrors.InvalidBiddingPeriod);
      });
    });

    context("when bidding period is set to 50 days", function () {
      it("retrieves new biddingPeriod", async function () {
        const newBiddingPeriod: number = time.duration.days(50);

        await this.contracts.projecty
          .connect(this.signers.owner)
          .setBiddingPeriod(newBiddingPeriod);

        expect(await this.contracts.projecty.biddingPeriod()).to.equal(newBiddingPeriod);
      });

      it("emits 'BiddingPeriodUpdated' event", async function () {
        const prevBiddingPeriod: BigNumber = await this.contracts.projecty.biddingPeriod();
        const newBiddingPeriod: number = time.duration.days(50);

        await expect(
          this.contracts.projecty.connect(this.signers.owner).setBiddingPeriod(newBiddingPeriod)
        )
          .to.emit(this.contracts.projecty, "BiddingPeriodUpdated")
          .withArgs(prevBiddingPeriod, newBiddingPeriod);
      });
    });
  });
}
