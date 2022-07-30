import shouldBehaveLikeBid from "./effects/bid";
import shouldBehaveLikePayInstallment from "./effects/payInstallment";
import shouldBehaveLikeSelectBid from "./effects/selectBid";
import shouldBehaveLikeSell from "./effects/sell";

export function shouldBehaveLikeProjectY(): void {
  describe("View Functions", function () {
    //
  });

  describe("Effects Functions", function () {
    // describe("#sell", function () {
    //   shouldBehaveLikeSell();
    // });
    // describe("#bid", function () {
    //   shouldBehaveLikeBid();
    // });
    // describe("#selectBid", function () {
    //   shouldBehaveLikeSelectBid();
    // });
    describe("#payInstallment", function () {
      shouldBehaveLikePayInstallment();
    });
  });
}
