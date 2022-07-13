import { ethers } from "hardhat";
import type { DeployFunction, DeployResult } from "hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

import type { WNFT } from "../src/types/contracts/WNFT/WNFT";
import { preDeploy } from "../utils/contracts";
import { verifyContract } from "../utils/verify";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, getChainId, deployments } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

  const wnft = (await ethers.getContract("WNFT")) as WNFT;
  // log("wnft >>> ", wnft.address);
  log("wnft owner >>> ", await wnft.owner());

  const CONTRACT_NAME = "ProjectY";

  await preDeploy({ signerAddress: deployer, contractName: CONTRACT_NAME });
  const deployResult: DeployResult = await deploy(CONTRACT_NAME, {
    // Learn more about args here: https://www.npmjs.com/package/hardhat-deploy#deploymentsdeploy
    from: deployer,
    contract: CONTRACT_NAME,
    args: [deployer, wnft.address],
    log: true,
    // waitConfirmations: 5,
  });

  // transfer ownership to projecty contract
  await wnft.connect(await ethers.getSigner(deployer)).setOwner(deployResult.address);

  log("new wnft owner >>> ", await wnft.owner());

  // You don't want to verify on localhost
  if (chainId !== "31337" && chainId !== "1337") {
    const contractPath = `contracts/${CONTRACT_NAME}.sol:${CONTRACT_NAME}`;
    await verifyContract({
      contractPath: contractPath,
      contractAddress: deployResult.address,
      args: deployResult.args || [],
    });
  }
};

export default func;
func.tags = ["all", "ProjectY"];
