import { wnftFixture } from "../../shared/fixtures";
import { shouldBehaveLikeWNFT } from "./WNFT.behavior";

export function testWNFT(): void {
  describe("WNFT", function () {
    beforeEach(async function () {
      const { wnft } = await this.loadFixture(wnftFixture);
      this.contracts.wnft = wnft;
    });

    shouldBehaveLikeWNFT();
  });
}
