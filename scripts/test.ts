import { ethers, getNamedAccounts } from "hardhat";

import { InstallmentPlan } from "../test/shared/constants";
import { deployProjectyFixture } from "../test/unit/projecty/ProjectY.fixture";
import { toWei } from "../utils/format";

async function main() {
  const { deployer } = await getNamedAccounts();
  const nftOwner = await ethers.getSigner(deployer);

  const { projecty, erc721 } = await deployProjectyFixture();

  await erc721.mint(nftOwner.address, 1);
  await erc721.connect(nftOwner).approve(projecty.address, 1);
  await erc721.mint(nftOwner.address, 2);
  await erc721.connect(nftOwner).approve(projecty.address, 2);

  await projecty.sell(erc721.address, 1, toWei("0.1"), InstallmentPlan.ThreeMonths);
  await projecty.sell(erc721.address, 2, toWei("0.1"), InstallmentPlan.ThreeMonths);

  console.log("getSellerInfo: ", await projecty.getSellerInfo(1));
  console.log("getNFTsOpenForSale: ", await projecty.getNFTsOpenForSale());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
