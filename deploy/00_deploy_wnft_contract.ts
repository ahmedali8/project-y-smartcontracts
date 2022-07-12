import { DeployFunction, DeployResult } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { WNFT_NAME, WNFT_SYMBOL } from "../helpers/constants";
import { preDeploy } from "../utils/contracts";
import { verifyContract } from "../utils/verify";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, getChainId, deployments } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

  const CONTRACT_NAME = "WNFT";

  await preDeploy({ signerAddress: deployer, contractName: CONTRACT_NAME });
  const deployResult: DeployResult = await deploy(CONTRACT_NAME, {
    // Learn more about args here: https://www.npmjs.com/package/hardhat-deploy#deploymentsdeploy
    from: deployer,
    args: [deployer, WNFT_NAME, WNFT_SYMBOL],
    log: true,
    // waitConfirmations: 5,
  });

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
func.tags = ["all", "WNFT"];
