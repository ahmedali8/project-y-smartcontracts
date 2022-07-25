import type { BigNumber, BigNumberish } from "@ethersproject/bignumber";

import { toBN } from "../../utils/format";

export function getPercentOf(value: BigNumberish, percent: number): BigNumber {
  return toBN(value).mul(percent).div(100);
}
