import { mockERC721Fixture, projectyFixture } from "../../shared/fixtures";
import { shouldBehaveLikeProjectY } from "./ProjectY.behavior";

export function testProjectY(): void {
  describe("ProjectY", function () {
    beforeEach(async function () {
      const { wnft, projecty, erc721 } = await this.loadFixture(projectyFixture);

      // set contracts
      this.contracts.wnft = wnft;
      this.contracts.projecty = projecty;

      // set mocks
      this.mocks.erc721 = erc721;
    });

    shouldBehaveLikeProjectY();
  });
}
