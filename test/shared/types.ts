import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

import { Token } from "../../src/types";

type Fixture<T> = () => Promise<T>;

declare module "mocha" {
  export interface Context {
    token: Token;
    loadFixture: <T>(fixture: Fixture<T>) => Promise<T>;
    signers: Signers;
  }
}

export interface Signers {
  owner: SignerWithAddress;
  user: SignerWithAddress;
  accounts: SignerWithAddress[];
}
