import { ethers, getNamedAccounts } from "hardhat";

import { NETWORKS } from "../config/networks";
import type { MockERC721, ProjectY } from "../src/types";
import { InstallmentPlan } from "../test/shared/constants";
import { getDownPayment } from "../test/shared/utils";
import { deployProjectyFixture } from "../test/unit/projecty/ProjectY.fixture";
import { toWei } from "../utils/format";
import { delayLog } from "../utils/misc";

async function main() {
  const { deployer, kumail } = await getNamedAccounts();
  const { chainId } = await ethers.provider.getNetwork();

  const deployerSigner = await ethers.getSigner(deployer);
  const kumailSigner = await ethers.getSigner(kumail);

  let PROJECTY_CONTRACT_ADDRESS: string = "";
  let ERC721_CONTRACT_ADDRESS: string = "";
  let projecty: ProjectY;
  let erc721: MockERC721;

  if (chainId == NETWORKS.rinkeby.chainId) {
    PROJECTY_CONTRACT_ADDRESS = "0x83081bE6d9Df400850D3Bf5914b3D9766E230843";
    ERC721_CONTRACT_ADDRESS = "0xF05A4230010CE2285E28C48398b9Dcf8482cddDB";
  } else if (chainId == NETWORKS["polygon-mumbai"].chainId) {
    PROJECTY_CONTRACT_ADDRESS = "0x63d878eBF4deCcC675c29e5606f0993749068614";
    ERC721_CONTRACT_ADDRESS = "0xbb326B3242955dA5ED5D01A6834601278A029241";
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

  // mint 10 nfts to deployer and kumail
  const totalSupply: number = (await erc721.totalSupply()).toNumber();

  for (let i = totalSupply + 1; i <= totalSupply + 20; i++) {
    const mintAddress = i <= 10 ? deployerSigner.address : kumailSigner.address;

    await erc721.connect(deployerSigner).mint(mintAddress, i);

    console.log("minted: ", i);
    if (chainId != 31337 && chainId != 1337) await delayLog(60_000);
  }

  // deployer sells 10 and kumail sells 2
  await erc721.connect(deployerSigner).setApprovalForAll(projecty.address, true);
  if (chainId != 31337 && chainId != 1337) await delayLog(60_000);

  await erc721.connect(kumailSigner).setApprovalForAll(projecty.address, true);
  if (chainId != 31337 && chainId != 1337) await delayLog(60_000);

  // deployer
  for (let i = 0; i < 10; i++) {
    await projecty
      .connect(deployerSigner)
      .sell(erc721.address, i + 1, toWei(`0.${i + 1}`), InstallmentPlan.NineMonths);

    console.log("tokenId ", i + 1, "for selling");
    if (chainId != 31337 && chainId != 1337) await delayLog(60_000);
  }

  // kumail
  for (let i = 10; i < 12; i++) {
    await projecty
      .connect(kumailSigner)
      .sell(erc721.address, i + 1, toWei(`0.${i + 1}`), InstallmentPlan.NineMonths);

    console.log("tokenId ", i + 1, "for selling");
    if (chainId != 31337 && chainId != 1337) await delayLog(60_000);
  }

  // bid on kumail
  for (let i = 0; i < 12; i++) {
    const installment = i % 2 === 0 ? InstallmentPlan.SixMonths : InstallmentPlan.NineMonths;
    const bidPrice = toWei(`0.00${i + 2}`);
    await projecty
      .connect(deployerSigner)
      .bid(i + 1, bidPrice, installment, { value: getDownPayment(installment, bidPrice) });

    console.log("bidded on ", i + 1);
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
