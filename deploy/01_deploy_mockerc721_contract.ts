import type { DeployFunction, DeployResult, Deployment } from "hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

import type { MockERC721 } from "../src/types/contracts/test/MockERC721";
import { preDeploy } from "../utils/contracts";
import { verifyContract } from "../utils/verify";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, getChainId, deployments, ethers } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

  const CONTRACT_NAME = "MockERC721";
  // const prevDep: Deployment = await deployments.get(CONTRACT_NAME);

  await preDeploy({ signerAddress: deployer, contractName: CONTRACT_NAME });
  const deployResult: DeployResult = await deploy(CONTRACT_NAME, {
    // Learn more about args here: https://www.npmjs.com/package/hardhat-deploy#deploymentsdeploy
    from: deployer,
    contract: CONTRACT_NAME,
    log: true,
    // waitConfirmations: 5,
  });

  // const contract: MockERC721 = await ethers.getContractAt(CONTRACT_NAME, deployResult.address);
  // await contract.mint(deployer, 1);
  // console.log("uri: ", await contract.tokenURI(1));

  // You don't want to verify on localhost
  if (chainId !== "31337" && chainId !== "1337") {
    const contractPath = `contracts/test/${CONTRACT_NAME}.sol:${CONTRACT_NAME}`;
    await verifyContract({
      contractPath: contractPath,
      contractAddress: deployResult.address,
      args: deployResult.args || [],
    });
  }
};

export default func;
func.tags = ["mockerc721"];
func.skip = async (env) => await true;

// RINKEBY: 0x94C0e2d4428706AfD759794A46cE2772A720998C
// MUMBAI_POLYGON: 0xbb326B3242955dA5ED5D01A6834601278A029241
