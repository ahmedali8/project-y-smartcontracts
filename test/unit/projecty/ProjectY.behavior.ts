import shouldBehaveLikeBid from "./effects/bid";
import shouldBehaveLikeSell from "./effects/sell";
import shouldBehaveLikeWNFT from "./view/wnft";

export function shouldBehaveLikeProjectY(): void {
  describe("View Functions", function () {
    // describe("#wnft", function () {
    //   shouldBehaveLikeWNFT();
    // });
  });

  describe("Effects Functions", function () {
    describe("#sell", function () {
      shouldBehaveLikeSell();
    });
    describe("#bid", function () {
      shouldBehaveLikeBid();
    });
  });
}
