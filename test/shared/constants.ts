import { time } from "@nomicfoundation/hardhat-network-helpers";

export enum InstallmentPlan {
  None,
  ThreeMonths,
  SixMonths,
  NineMonths,
}

/**
 * Array of all the installment plan values
 */
export const INSTALLMENT_PLAN_VALUES: InstallmentPlan[] = Object.keys(InstallmentPlan).filter(
  (i) => !isNaN(Number(i))
) as unknown as InstallmentPlan[];

export const ONE_MONTH: number = time.duration.days(30);
export const BIDDING_PERIOD = time.duration.days(7);
export const GRACE_PERIOD = time.duration.days(7);

export const THREE_MONTHS_DOWN_PAYMENT_PERCENTAGE: number = 34; // 34%
export const SIX_MONTHS_DOWN_PAYMENT_PERCENTAGE: number = 175; //17.5%
export const NINE_MONTHS_DOWN_PAYMENT_PERCENTAGE: number = 12; // 12%

export const THREE_MONTHS_MONTHLY_PERCENTAGE: number = 33; // 33%
export const SIX_MONTHS_MONTHLY_PERCENTAGE: number = 165; //16.5%
export const NINE_MONTHS_MONTHLY_PERCENTAGE: number = 11; // 11%

export const LIQUIDATION_PERCENTAGE: number = 95; // 95%
