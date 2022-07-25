import { shouldBehaveLikeProjectY } from "./ProjectY.behavior";
import { deployProjectyFixture } from "./ProjectY.fixture";

export function testProjectY(): void {
  describe("ProjectY", function () {
    beforeEach(async function () {
      const { projecty, erc721 } = await this.loadFixture(deployProjectyFixture);

      // set contracts
      this.contracts.projecty = projecty;

      // set mocks
      this.mocks.erc721 = erc721;
    });

    shouldBehaveLikeProjectY();
  });
}
