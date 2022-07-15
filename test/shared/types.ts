import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

import type { ProjectY } from "../../src/types/contracts/ProjectY";
import type { WNFT } from "../../src/types/contracts/WNFT/WNFT";

type Fixture<T> = () => Promise<T>;

declare module "mocha" {
  export interface Context {
    contracts: Contracts;
    loadFixture: <T>(fixture: Fixture<T>) => Promise<T>;
    signers: Signers;
  }
}

export interface Contracts {
  wnft: WNFT;
  projecty: ProjectY;
}

export interface Signers {
  owner: SignerWithAddress;
  accounts: SignerWithAddress[];
}
