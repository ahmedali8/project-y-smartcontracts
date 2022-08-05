import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";

import type { Contracts, MockContracts, Signers } from "../shared/types";
import { testUtils } from "../shared/utils.test";
import { testProjectY } from "./projecty/ProjectY";

describe("Unit tests", function () {
  before(async function () {
    this.contracts = {} as Contracts;
    this.mocks = {} as MockContracts;
    this.signers = {} as Signers;

    const signers: SignerWithAddress[] = await ethers.getSigners();
    this.signers.owner = signers[0];
    this.signers.accounts = signers.slice(1);

    this.loadFixture = loadFixture;
  });

  // test non-blockchain files
  testUtils();

  // test projectY
  testProjectY();
});
