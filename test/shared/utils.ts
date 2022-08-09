import { getAddress } from "@ethersproject/address";
import type { BigNumber } from "@ethersproject/bignumber";
import { Zero } from "@ethersproject/constants";
import { keccak256 } from "@ethersproject/solidity";
import { computeAddress } from "@ethersproject/transactions";
import { impersonateAccount, setBalance } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";

import {
  InstallmentPlan,
  NINE_MONTHS_DOWN_PAYMENT_PERCENTAGE,
  NINE_MONTHS_MONTHLY_PERCENTAGE,
  SIX_MONTHS_DOWN_PAYMENT_PERCENTAGE,
  SIX_MONTHS_MONTHLY_PERCENTAGE,
  THREE_MONTHS_DOWN_PAYMENT_PERCENTAGE,
  THREE_MONTHS_MONTHLY_PERCENTAGE,
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

/*//////////////////////////////////////////////////////////////
                            PURE FUNCTIONS
//////////////////////////////////////////////////////////////*/

export function getDownPayment(installmentPlan: InstallmentPlan, bidPrice: BigNumber): BigNumber {
  if (installmentPlan == InstallmentPlan.ThreeMonths) {
    return bidPrice.mul(THREE_MONTHS_DOWN_PAYMENT_PERCENTAGE).div(100);
  } else if (installmentPlan == InstallmentPlan.SixMonths) {
    return bidPrice.mul(SIX_MONTHS_DOWN_PAYMENT_PERCENTAGE).div(1000);
  } else if (installmentPlan == InstallmentPlan.NineMonths) {
    return bidPrice.mul(NINE_MONTHS_DOWN_PAYMENT_PERCENTAGE).div(100);
  } else {
    return bidPrice; // InstallmentPlan.None
  }
}

export function getInstallmentPerMonth(
  installmentPlan: InstallmentPlan,
  bidPrice: BigNumber
): BigNumber {
  if (installmentPlan == InstallmentPlan.ThreeMonths) {
    return bidPrice.mul(THREE_MONTHS_MONTHLY_PERCENTAGE).div(100);
  } else if (installmentPlan == InstallmentPlan.SixMonths) {
    return bidPrice.mul(SIX_MONTHS_MONTHLY_PERCENTAGE).div(1000);
  } else if (installmentPlan == InstallmentPlan.NineMonths) {
    return bidPrice.mul(NINE_MONTHS_MONTHLY_PERCENTAGE).div(100);
  } else {
    return Zero;
  }
}

// NOT GIVING CORRECT CALCULATION
export function getInstallmentAmountOf(
  installmentPlan: InstallmentPlan,
  bidPrice: BigNumber,
  installmentNumber: number
): BigNumber {
  const downPayment = getDownPayment(installmentPlan, bidPrice);

  const installmentPerMonth = getInstallmentPerMonth(installmentPlan, bidPrice);

  const no = installmentNumber - 1;
  const installmentPerMonthForNumber = installmentPerMonth.mul(no);

  const amountClaimable = downPayment.add(installmentPerMonthForNumber);

  // console.log({
  //   downPayment: downPayment.toString(),
  //   installmentPerMonth: installmentPerMonth.toString(),
  //   installmentPerMonthForNumber: installmentPerMonthForNumber.toString(),
  //   no: no,
  //   amountClaimable: amountClaimable.toString(),
  // });

  return amountClaimable;
}

export function getTotalInstallments(installmentPlan: InstallmentPlan): number {
  if (installmentPlan == InstallmentPlan.ThreeMonths) {
    return 3;
  } else if (installmentPlan == InstallmentPlan.SixMonths) {
    return 6;
  } else if (installmentPlan == InstallmentPlan.NineMonths) {
    return 9;
  } else {
    return 0; // InstallmentPlan.None
  }
}
