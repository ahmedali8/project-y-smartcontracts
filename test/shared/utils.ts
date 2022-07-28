import { getAddress } from "@ethersproject/address";
import type { BigNumber } from "@ethersproject/bignumber";
import { keccak256 } from "@ethersproject/solidity";
import { computeAddress } from "@ethersproject/transactions";
import { impersonateAccount, setBalance } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";

import { toBN } from "../../utils/format";
import {
  InstallmentPlan,
  NINE_MONTHTS_DOWN_PAYMENT_PERCENTAGE,
  NINE_MONTHTS_MONTHLY_PERCENTAGE,
  SIX_MONTHTS_DOWN_PAYMENT_PERCENTAGE,
  SIX_MONTHTS_MONTHLY_PERCENTAGE,
  THREE_MONTHTS_DOWN_PAYMENT_PERCENTAGE,
  THREE_MONTHTS_MONTHLY_PERCENTAGE,
} from "./constants";

export async function createRandomSigner(salt: string, bal: BigNumber): Promise<SignerWithAddress> {
  const signerAddress: string = computeAddress(keccak256(["string"], [salt]));
  const checksummedSignerAddress: string = getAddress(signerAddress);

  // hardhat network helpers
  await impersonateAccount(checksummedSignerAddress);
  await setBalance(checksummedSignerAddress, bal);

  // hre.ethers
  return await ethers.getSigner(checksummedSignerAddress);
}

export function getDownPayment(installmentPlan: InstallmentPlan, bidPrice: BigNumber): BigNumber {
  if (installmentPlan == InstallmentPlan.ThreeMonths) {
    return bidPrice.mul(THREE_MONTHTS_DOWN_PAYMENT_PERCENTAGE).div(100);
  } else if (installmentPlan == InstallmentPlan.SixMonths) {
    return bidPrice.mul(SIX_MONTHTS_DOWN_PAYMENT_PERCENTAGE).div(1000);
  } else if (installmentPlan == InstallmentPlan.NineMonths) {
    return bidPrice.mul(NINE_MONTHTS_DOWN_PAYMENT_PERCENTAGE).div(100);
  } else {
    return bidPrice; // InstallmentPlan.None
  }
}

export function getInstallmentPerMonth(
  installmentPlan: InstallmentPlan,
  bidPrice: BigNumber
): BigNumber {
  if (installmentPlan == InstallmentPlan.ThreeMonths) {
    return bidPrice.mul(THREE_MONTHTS_MONTHLY_PERCENTAGE).div(100);
  } else if (installmentPlan == InstallmentPlan.SixMonths) {
    return bidPrice.mul(SIX_MONTHTS_MONTHLY_PERCENTAGE).div(1000);
  } else if (installmentPlan == InstallmentPlan.NineMonths) {
    return bidPrice.mul(NINE_MONTHTS_MONTHLY_PERCENTAGE).div(100);
  } else {
    return toBN("0");
  }
}

export function getInstallmentPercentageOf(
  installmentPlan: InstallmentPlan,
  bidPrice: BigNumber,
  installmentNumber: number
): BigNumber {
  return getDownPayment(installmentPlan, bidPrice).add(
    getInstallmentPerMonth(installmentPlan, bidPrice).mul(installmentNumber)
  );
}
