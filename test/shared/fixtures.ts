import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";

import { WNFT_NAME, WNFT_SYMBOL } from "../../helpers/constants";
import { WNFT, WNFT__factory } from "../../src/types";

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
