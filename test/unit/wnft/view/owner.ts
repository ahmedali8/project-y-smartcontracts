import { expect } from "../../../shared/expect";

export default function shouldBehaveLikeOwner(): void {
  it("retrieves the owner", async function () {
    const owner: string = await this.contracts.wnft.owner();
    expect(owner).to.equal(this.signers.owner.address);
  });
}
