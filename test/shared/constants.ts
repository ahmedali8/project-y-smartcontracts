import { time } from "@nomicfoundation/hardhat-network-helpers";

export enum InstallmentPlan {
  None,
  ThreeMonths,
  SixMonths,
  NineMonths,
}

export const ONE_MONTH: number = time.duration.days(30);

export const THREE_MONTHTS_DOWN_PAYMENT_PERCENTAGE: number = 34; // 34%
export const SIX_MONTHTS_DOWN_PAYMENT_PERCENTAGE: number = 175; //17.5%
export const NINE_MONTHTS_DOWN_PAYMENT_PERCENTAGE: number = 12; // 12%

export const THREE_MONTHTS_MONTHLY_PERCENTAGE: number = 33; // 33%
export const SIX_MONTHTS_MONTHLY_PERCENTAGE: number = 165; //16.5%
export const NINE_MONTHTS_MONTHLY_PERCENTAGE: number = 11; // 11%
