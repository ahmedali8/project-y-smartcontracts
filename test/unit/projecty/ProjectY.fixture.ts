import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";

import type { ProjectY } from "../../../src/types/contracts/ProjectY";
import type { MockERC721 } from "../../../src/types/contracts/test/MockERC721";
import type { ProjectY__factory } from "../../../src/types/factories/contracts/ProjectY__factory";
import { deployMockERC721Fixture } from "../../shared/fixtures";

export async function deployProjectyFixture(): Promise<{
  projecty: ProjectY;
  erc721: MockERC721;
}> {
  const signers: SignerWithAddress[] = await ethers.getSigners();
  const owner: SignerWithAddress = signers[0];

  const ProjectYFactory: ProjectY__factory = (await ethers.getContractFactory(
    "ProjectY"
  )) as ProjectY__factory;
  const projecty: ProjectY = (await ProjectYFactory.connect(owner).deploy(
    owner.address
  )) as ProjectY;

  const { erc721 } = await deployMockERC721Fixture();

  return { projecty, erc721 };
}
