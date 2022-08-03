import type { BigNumber } from "@ethersproject/bignumber";
import { Zero } from "@ethersproject/constants";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";

import { ONE_MONTH } from "../../../shared/constants";
import { OwnedErrors, ProjectYErrors } from "../../../shared/errors";

export default function shouldBehaveLikeSetGracePeriod(): void {
  context("when caller is non-owner", function () {
    it("reverts", async function () {
      const gracePeriod = time.duration.days(1);

      await expect(
        this.contracts.projecty.connect(this.signers.accounts[0]).setGracePeriod(gracePeriod)
      ).to.be.revertedWith(OwnedErrors.Unauthorized);
    });
  });

  context("when caller is owner", function () {
    context("when grace period is set to zero", function () {
      it("reverts", async function () {
        const gracePeriod = Zero;

        await expect(
          this.contracts.projecty.connect(this.signers.owner).setGracePeriod(gracePeriod)
        ).to.be.revertedWith(ProjectYErrors.InvalidGracePeriod);
      });
    });

    context("when grace period is set to one month", function () {
      it("retrieves new gracePeriod", async function () {
        const newGracePeriod: number = ONE_MONTH;

        await this.contracts.projecty.connect(this.signers.owner).setGracePeriod(newGracePeriod);

        expect(await this.contracts.projecty.gracePeriod()).to.equal(newGracePeriod);
      });

      it("emits 'GracePeriodUpdated' event", async function () {
        const prevGracePeriod: BigNumber = await this.contracts.projecty.gracePeriod();
        const newGracePeriod: number = time.duration.days(50);

        await expect(
          this.contracts.projecty.connect(this.signers.owner).setGracePeriod(newGracePeriod)
        )
          .to.emit(this.contracts.projecty, "GracePeriodUpdated")
          .withArgs(prevGracePeriod, newGracePeriod);
      });
    });
  });
}
