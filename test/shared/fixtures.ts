import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";

import { WNFT_NAME, WNFT_SYMBOL } from "../../helpers/constants";
import type { ProjectY } from "../../src/types/contracts/ProjectY";
import type { WNFT } from "../../src/types/contracts/WNFT/WNFT";
import type { MockERC721 } from "../../src/types/contracts/test/MockERC721";
import type { ProjectY__factory } from "../../src/types/factories/contracts/ProjectY__factory";
import type { WNFT__factory } from "../../src/types/factories/contracts/WNFT/WNFT__factory";
import type { MockERC721__factory } from "../../src/types/factories/contracts/test/MockERC721__factory";

export async function mockERC721Fixture(): Promise<{ erc721: MockERC721 }> {
  const signers: SignerWithAddress[] = await ethers.getSigners();
  const owner: SignerWithAddress = signers[0];

  const MockERC721Factory: MockERC721__factory = (await ethers.getContractFactory(
    "MockERC721"
  )) as MockERC721__factory;
  const erc721: MockERC721 = (await MockERC721Factory.connect(owner).deploy()) as MockERC721;

  return { erc721 };
}

export async function wnftFixture(): Promise<{ wnft: WNFT }> {
  const signers = await ethers.getSigners();
  const owner: SignerWithAddress = signers[0];

  const WNFTFactory: WNFT__factory = (await ethers.getContractFactory("WNFT")) as WNFT__factory;
  const wnft: WNFT = (await WNFTFactory.connect(owner).deploy(
    owner.address,
    WNFT_NAME,
    WNFT_SYMBOL
  )) as WNFT;

  return { wnft };
}

export async function projectyFixture(): Promise<{
  wnft: WNFT;
  projecty: ProjectY;
  erc721: MockERC721;
}> {
  const signers: SignerWithAddress[] = await ethers.getSigners();
  const owner: SignerWithAddress = signers[0];

  const { wnft }: { wnft: WNFT } = await wnftFixture();

  const ProjectYFactory: ProjectY__factory = (await ethers.getContractFactory(
    "ProjectY"
  )) as ProjectY__factory;
  const projecty: ProjectY = (await ProjectYFactory.connect(owner).deploy(
    owner.address,
    wnft.address
  )) as ProjectY;

  const { erc721 } = await mockERC721Fixture();

  return { wnft, projecty, erc721 };
}
