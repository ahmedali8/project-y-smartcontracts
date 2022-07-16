import type { BigNumber, BigNumberish } from "@ethersproject/bignumber";

import { toBN } from "../../utils/format";

export function get34PercentOf(value: BigNumberish): BigNumber {
  return getPercentOf(value, 34);
}

export function get33PercentOf(value: BigNumberish): BigNumber {
  return getPercentOf(value, 33);
}

export function getPercentOf(value: BigNumberish, percent: number): BigNumber {
  return toBN(value).mul(percent).div(100);
}
