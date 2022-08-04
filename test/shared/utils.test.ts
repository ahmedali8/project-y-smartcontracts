import { Zero } from "@ethersproject/constants";
import { expect } from "chai";
import { BigNumber } from "ethers";

import { toWei } from "../../utils/format";
import { InstallmentPlan } from "./constants";
import {
  getDownPayment,
  getInstallmentAmountOf,
  getInstallmentPerMonth,
  getTotalInstallments,
} from "./utils";

export function shouldBehaveLikeGetDownPayment(): void {
  describe("#getDownPayment", function () {
    for (let i = 0; i < 4; i++) {
      const enumKey = InstallmentPlan[i];

      it(`retrieves correct value for InstallmentPlan.${enumKey}`, function () {
        const installment = i as InstallmentPlan;
        const bidPrice = toWei("43");

        let expectedDownPayment: BigNumber;

        if (installment == InstallmentPlan.ThreeMonths) {
          expectedDownPayment = toWei("14.62");
        } else if (installment == InstallmentPlan.SixMonths) {
          expectedDownPayment = toWei("7.525");
        } else if (installment == InstallmentPlan.NineMonths) {
          expectedDownPayment = toWei("5.16");
        } else {
          expectedDownPayment = toWei("43");
        }

        const downPayment = getDownPayment(installment, bidPrice);

        expect(downPayment).to.be.equal(expectedDownPayment);
      });
    }
  });
}

export function shouldBehaveLikeGetInstallmentPerMonth(): void {
  describe("#getInstallmentPerMonth", function () {
    for (let i = 0; i < 4; i++) {
      const enumKey = InstallmentPlan[i];

      it(`retrieves correct value for InstallmentPlan.${enumKey}`, function () {
        const installment = i as InstallmentPlan;
        const bidPrice = toWei("43");

        let expectedMonthlyPayment: BigNumber;

        if (installment == InstallmentPlan.ThreeMonths) {
          expectedMonthlyPayment = toWei("14.19");
        } else if (installment == InstallmentPlan.SixMonths) {
          expectedMonthlyPayment = toWei("7.095");
        } else if (installment == InstallmentPlan.NineMonths) {
          expectedMonthlyPayment = toWei("4.73");
        } else {
          expectedMonthlyPayment = Zero;
        }

        const monthlyPayment = getInstallmentPerMonth(installment, bidPrice);

        expect(monthlyPayment).to.be.equal(expectedMonthlyPayment);
      });
    }
  });
}

export function shouldBehaveLikeGetInstallmentAmountOf(): void {
  describe("#getInstallmentAmountOf", function () {
    context("down payments (first installment amounts)", function () {
      const installmentNumber = 1;

      for (let i = 0; i < 4; i++) {
        const enumKey = InstallmentPlan[i];

        it(`retrieves downPayment amount for InstallmentPlan.${enumKey}`, function () {
          const installment = i as InstallmentPlan;
          const bidPrice = toWei("45");

          let expectedDownPayment: BigNumber;

          if (installment == InstallmentPlan.ThreeMonths) {
            expectedDownPayment = toWei("15.3");
          } else if (installment == InstallmentPlan.SixMonths) {
            expectedDownPayment = toWei("7.875");
          } else if (installment == InstallmentPlan.NineMonths) {
            expectedDownPayment = toWei("5.4");
          } else {
            expectedDownPayment = toWei("45");
          }

          const amount = getInstallmentAmountOf(installment, bidPrice, installmentNumber);
          expect(amount).to.be.equal(expectedDownPayment);
        });
      }
    });

    context("other than down payments", function () {
      it("retrieves amount for random installment number for InstallmentPlan.ThreeMonths", function () {
        const installmentNumber = 2;
        const installment = InstallmentPlan.ThreeMonths;
        const bidPrice = toWei("45");

        const amount = getInstallmentAmountOf(installment, bidPrice, installmentNumber);
        expect(amount).to.be.equal(toWei("30.15"));
      });
    });
  });
}

export function shouldBehaveLikeGetTotalInstallments(): void {
  describe("#getTotalInstallments", function () {
    let expectedResult = 0;

    for (let i = 0; i < 4; i++) {
      const enumKey = InstallmentPlan[i];

      it(`retrieves correct value for InstallmentPlan.${enumKey}`, function () {
        const enumValue = i as InstallmentPlan;

        expect(getTotalInstallments(enumValue)).to.be.equal(expectedResult);

        expectedResult += 3;
      });
    }
  });
}

export function testUtils(): void {
  describe("test/shared/utils", function () {
    // shouldBehaveLikeGetDownPayment();
    // shouldBehaveLikeGetInstallmentPerMonth();
    shouldBehaveLikeGetInstallmentAmountOf();
    // shouldBehaveLikeGetTotalInstallments();
  });
}
