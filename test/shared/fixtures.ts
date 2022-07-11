import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";

import { Token, Token__factory } from "../../src/types";
import { TOKEN_NAME, TOKEN_SYMBOL, TOTAL_SUPPLY } from "./constants";

export async function tokenFixture(): Promise<{ token: Token }> {
  const signers = await ethers.getSigners();
  const owner: SignerWithAddress = signers[0];

  const TokenFactory: Token__factory = (await ethers.getContractFactory("Token")) as Token__factory;
  const token: Token = (await TokenFactory.connect(owner).deploy(
    TOKEN_NAME,
    TOKEN_SYMBOL,
    TOTAL_SUPPLY,
    owner.address
  )) as Token;

  return { token };
}
