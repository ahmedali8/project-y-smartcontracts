import { ethers, getNamedAccounts } from "hardhat";

import { NETWORKS } from "../config/networks";
import type { MockERC721 } from "../src/types";
import { deployProjectyFixture } from "../test/unit/projecty/ProjectY.fixture";
import { delayLog } from "../utils/misc";

async function main() {
  const { deployer } = await getNamedAccounts();
  const { chainId } = await ethers.provider.getNetwork();

  const signer = await ethers.getSigner(deployer);

  const MINT_TO_ADDRESS = "0x4d3D94016666Bd15DFAd02e0AEbFE1cC64C2a0cB";
  let CONTRACT_ADDRESS = "";
  let erc721: MockERC721;

  if (chainId == NETWORKS.rinkeby.chainId) {
    CONTRACT_ADDRESS = "0x1d5614fDDDb8bA6bc02eCef52f52E04735762fa3";
  }
  if (chainId == NETWORKS["polygon-mumbai"].chainId) {
    CONTRACT_ADDRESS = "0x6FeCDA318e9770166D9D200B5A1Dc80a3d834110";
  }

  if (chainId != 31337 && chainId != 1337) {
    erc721 = await ethers.getContractAt("MockERC721", CONTRACT_ADDRESS);
  } else {
    ({ erc721 } = await deployProjectyFixture());
  }

  console.log({ chainId, CONTRACT_ADDRESS });

  for (let i = 0; i < 10; i++) {
    await erc721.connect(signer).mint(MINT_TO_ADDRESS, i + 1);
    console.log("minted: ", i);
    if (chainId != 31337 && chainId != 1337) await delayLog(60_000);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
