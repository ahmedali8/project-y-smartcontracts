import shouldBehaveLikeSell from "./effects/sell";

export function shouldBehaveLikeProjectY(): void {
  describe("View Functions", function () {
    //
  });

  describe("Effects Functions", function () {
    describe("#sell", function () {
      shouldBehaveLikeSell();
    });
  });
}
