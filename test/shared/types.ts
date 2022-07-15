import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

import type { ProjectY } from "../../src/types/contracts/ProjectY";
import type { WNFT } from "../../src/types/contracts/WNFT/WNFT";
import type { MockERC721 } from "../../src/types/contracts/test/MockERC721";

type Fixture<T> = () => Promise<T>;

declare module "mocha" {
  export interface Context {
    contracts: Contracts;
    mocks: MockContracts;
    loadFixture: <T>(fixture: Fixture<T>) => Promise<T>;
    signers: Signers;
  }
}

export interface Contracts {
  wnft: WNFT;
  projecty: ProjectY;
}

export interface MockContracts {
  erc721: MockERC721;
}

export interface Signers {
  owner: SignerWithAddress;
  accounts: SignerWithAddress[];
}
