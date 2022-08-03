import { expect } from "chai";

import { InstallmentPlan } from "./constants";
import { getTotalInstallments } from "./utils";

export function shouldBehaveLikeGetTotalInstallments(): void {
  describe("#getTotalInstallments", function () {
    let expectedResult = 0;

    for (let i = 0; i < 4; i++) {
      const enumKey = InstallmentPlan[i];

      it(`retrieves correct value for ${enumKey}`, function () {
        const enumValue = i as InstallmentPlan;

        expect(getTotalInstallments(enumValue)).to.equal(expectedResult);

        expectedResult += 3;
      });
    }
  });
}

export function testUtils(): void {
  describe("test/shared/utils", function () {
    shouldBehaveLikeGetTotalInstallments();
  });
}
