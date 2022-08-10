import { ethers, getNamedAccounts } from "hardhat";

import { NETWORKS } from "../config/networks";
import type { MockERC721, ProjectY } from "../src/types";
import { InstallmentPlan } from "../test/shared/constants";
import { deployProjectyFixture } from "../test/unit/projecty/ProjectY.fixture";
import { toWei } from "../utils/format";
import { delayLog } from "../utils/misc";

async function main() {
  const { deployer, kumail } = await getNamedAccounts();
  const { chainId } = await ethers.provider.getNetwork();
  const signer = await ethers.getSigner(kumail);

  console.log(kumail);

  let PROJECTY_CONTRACT_ADDRESS: string = "";
  let ERC721_CONTRACT_ADDRESS: string = "";
  let projecty: ProjectY;
  let erc721: MockERC721;

  if (chainId == NETWORKS.rinkeby.chainId) {
    PROJECTY_CONTRACT_ADDRESS = "0x72Afd25663258E0918b041680ADE8F76B9d73B9F";
    ERC721_CONTRACT_ADDRESS = "0x94C0e2d4428706AfD759794A46cE2772A720998C";
  }
  if (chainId == NETWORKS["polygon-mumbai"].chainId) {
    PROJECTY_CONTRACT_ADDRESS = "";
    ERC721_CONTRACT_ADDRESS = "";
  }

  if (chainId != 31337 && chainId != 1337) {
    projecty = await ethers.getContractAt("ProjectY", PROJECTY_CONTRACT_ADDRESS);
    erc721 = await ethers.getContractAt("MockERC721", ERC721_CONTRACT_ADDRESS);
  } else {
    ({ projecty, erc721 } = await deployProjectyFixture());
    PROJECTY_CONTRACT_ADDRESS = projecty.address;
    ERC721_CONTRACT_ADDRESS = erc721.address;
  }

  console.log({ chainId, PROJECTY_CONTRACT_ADDRESS, ERC721_CONTRACT_ADDRESS });

  await erc721.connect(signer).setApprovalForAll(projecty.address, true);
  if (chainId != 31337 && chainId != 1337) await delayLog(60_000);

  for (let i = 10; i < 12; i++) {
    await projecty
      .connect(signer)
      .sell(erc721.address, i + 1, toWei(`0.${i + 1}`), InstallmentPlan.NineMonths);

    console.log("tokenId ", i + 1, "for selling");
    if (chainId != 31337 && chainId != 1337) await delayLog(60_000);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });

// ahmed -> 1-10
// kumail -> 11-20
// mint on kumail and ahmed address 10 each
// put mine for sell
// put 2 of kumail for sell
// do 3-4 bids on both kumail nfts
// frontend: bid on mine
