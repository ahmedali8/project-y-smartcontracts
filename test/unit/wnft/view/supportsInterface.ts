import { expect } from "../../../shared/expect";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeInterfaceId } = require("../../../../utils/makeInterfaceId");

const INTERFACES: any = {
  ERC165: ["supportsInterface(bytes4)"],
  ERC721: [
    "balanceOf(address)",
    "ownerOf(uint256)",
    "approve(address,uint256)",
    "getApproved(uint256)",
    "setApprovalForAll(address,bool)",
    "isApprovedForAll(address,address)",
    "transferFrom(address,address,uint256)",
    "safeTransferFrom(address,address,uint256)",
    "safeTransferFrom(address,address,uint256,bytes)",
  ],
  ERC721Enumerable: [
    "totalSupply()",
    "tokenOfOwnerByIndex(address,uint256)",
    "tokenByIndex(uint256)",
  ],
  ERC4907: ["setUser(uint256,address,uint64)", "userOf(uint256)", "userExpires(uint256)"],
};

const INTERFACE_IDS: any = {};
const FN_SIGNATURES: any = {};
for (const k of Object.getOwnPropertyNames(INTERFACES)) {
  INTERFACE_IDS[k] = makeInterfaceId(INTERFACES[k]);
  for (const fnName of INTERFACES[k]) {
    // the interface id of a single function is equivalent to its function signature
    FN_SIGNATURES[fnName] = makeInterfaceId([fnName]);
  }
}

export default function shouldBehaveLikeSupportsInterface(): void {
  const interfaces = Object.keys(INTERFACES);

  it("supportsInterface uses less than 30k gas", async function () {
    for (const k of interfaces) {
      const interfaceId = INTERFACE_IDS[k];
      expect(await this.contracts.wnft.estimateGas.supportsInterface(interfaceId)).to.be.lte(30000);
    }
  });

  it("all interfaces are reported as supported", async function () {
    for (const k of interfaces) {
      const interfaceId = INTERFACE_IDS[k];
      expect(await this.contracts.wnft.supportsInterface(interfaceId)).to.equal(true);
    }
  });
}
