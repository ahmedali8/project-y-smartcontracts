import { projectyFixture } from "../../shared/fixtures";
import { shouldBehaveLikeProjectY } from "./ProjectY.behavior";

export function testProjectY(): void {
  describe("WNFT", function () {
    beforeEach(async function () {
      const { wnft, projecty } = await this.loadFixture(projectyFixture);
      this.contracts.wnft = wnft;
      this.contracts.projecty = projecty;
    });

    shouldBehaveLikeProjectY();
  });
}
