import { WNFT_NAME } from "../../../../helpers/constants";
import { expect } from "../../../shared/expect";

export default function shouldBehaveLikeName(): void {
  it("retrieves the name", async function () {
    const name: string = await this.contracts.wnft.name();
    expect(name).to.equal(WNFT_NAME);
  });
}
