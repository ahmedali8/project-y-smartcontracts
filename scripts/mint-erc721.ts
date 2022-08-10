import { ethers, getNamedAccounts } from "hardhat";

import { NETWORKS } from "../config/networks";
import type { MockERC721 } from "../src/types";
import { deployProjectyFixture } from "../test/unit/projecty/ProjectY.fixture";
import { delayLog } from "../utils/misc";

async function main() {
  const { deployer, kumail } = await getNamedAccounts();
  const { chainId } = await ethers.provider.getNetwork();
  const signer = await ethers.getSigner(deployer);

  const MINT_TO_ADDRESS = kumail;

  let CONTRACT_ADDRESS = "";
  let erc721: MockERC721;

  if (chainId == NETWORKS.rinkeby.chainId) {
    CONTRACT_ADDRESS = "0x94C0e2d4428706AfD759794A46cE2772A720998C";
  }
  if (chainId == NETWORKS["polygon-mumbai"].chainId) {
    CONTRACT_ADDRESS = "";
  }

  if (chainId != 31337 && chainId != 1337) {
    erc721 = await ethers.getContractAt("MockERC721", CONTRACT_ADDRESS);
  } else {
    ({ erc721 } = await deployProjectyFixture());
    CONTRACT_ADDRESS = erc721.address;
  }

  const totalSupply: number = (await erc721.totalSupply()).toNumber();

  console.log({ chainId, CONTRACT_ADDRESS, totalSupply, MINT_TO_ADDRESS });

  for (let i = totalSupply + 1; i <= totalSupply + 10; i++) {
    await erc721.connect(signer).mint(MINT_TO_ADDRESS, i);
    console.log("minted: ", i);
    if (chainId != 31337 && chainId != 1337) await delayLog(60_000);
  }

  const balanceOf = await erc721.balanceOf(MINT_TO_ADDRESS);
  console.log("balance: ", balanceOf.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });

// mint on kumail and ahmed address 10 each
// put mine for sell
// put 2 of kumail for sell
// do 3-4 bids on both kumail nfts
// frontend: bid on mine
