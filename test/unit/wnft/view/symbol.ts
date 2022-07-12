import { WNFT_SYMBOL } from "../../../../helpers/constants";
import { expect } from "../../../shared/expect";

export default function shouldBehaveLikeSymbol(): void {
  it("retrieves the symbol", async function () {
    const symbol: string = await this.contracts.wnft.symbol();
    expect(symbol).to.equal(WNFT_SYMBOL);
  });
}
