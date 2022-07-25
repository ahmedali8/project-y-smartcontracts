import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";

import type { MockERC721 } from "../../src/types/contracts/test/MockERC721";
import type { MockERC721__factory } from "../../src/types/factories/contracts/test/MockERC721__factory";

export async function deployMockERC721Fixture(): Promise<{ erc721: MockERC721 }> {
  const signers: SignerWithAddress[] = await ethers.getSigners();
  const owner: SignerWithAddress = signers[0];

  const MockERC721Factory: MockERC721__factory = (await ethers.getContractFactory(
    "MockERC721"
  )) as MockERC721__factory;
  const erc721: MockERC721 = (await MockERC721Factory.connect(owner).deploy()) as MockERC721;

  return { erc721 };
}
