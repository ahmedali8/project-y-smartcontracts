import { projectyFixture } from "../../shared/fixtures";
import { shouldBehaveLikeProjectY } from "./ProjectY.behavior";

export function testProjectY(): void {
  describe("ProjectY", function () {
    beforeEach(async function () {
      const { projecty, erc721 } = await this.loadFixture(projectyFixture);

      // set contracts
      this.contracts.projecty = projecty;

      // set mocks
      this.mocks.erc721 = erc721;
    });

    shouldBehaveLikeProjectY();
  });
}
