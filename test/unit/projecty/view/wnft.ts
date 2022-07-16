import { expect } from "../../../shared/expect";

export default function shouldBehaveLikeWNFT(): void {
  it("retrieves correct wnft address", async function () {
    expect(await this.contracts.projecty.wnft()).to.equal(this.contracts.wnft.address);
  });
}
