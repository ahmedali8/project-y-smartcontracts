import shouldBehaveLikeBid from "./effects/bid";
import shouldBehaveLikeLiquidate from "./effects/liquidate";
import shouldBehaveLikePayInstallment from "./effects/payInstallment";
import shouldBehaveLikeSelectBid from "./effects/selectBid";
import shouldBehaveLikeSell from "./effects/sell";
import shouldBehaveLikeSetBiddingPeriod from "./effects/setBiddingPeriod";
import shouldBehaveLikeSetGracePeriod from "./effects/setGracePeriod";
import shouldBehaveLikeWithdrawBid from "./effects/withdrawBid";
import shouldBehaveLikeWithdrawPayment from "./effects/withdrawPayment";
import shouldBehaveLikeWithdrawSell from "./effects/withdrawSell";
import shouldBehaveLikeGetIsBidIdValid from "./view/getIsBidIdValid";
import shouldBehaveLikeGetIsEntryIdValid from "./view/getIsEntryIdValid";
import shouldBehaveLikeGetTotalEntryIds from "./view/getTotalEntryIds";

export function shouldBehaveLikeProjectY(): void {
  describe("View Functions", function () {
    // describe("#getIsEntryIdValid", function () {
    //   shouldBehaveLikeGetIsEntryIdValid();
    // });
    // describe("#getIsBidIdValid", function () {
    //   shouldBehaveLikeGetIsBidIdValid();
    // });
    // describe("#getTotalEntryIds", function () {
    //   shouldBehaveLikeGetTotalEntryIds();
    // });
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
    // describe("#payInstallment", function () {
    //   shouldBehaveLikePayInstallment();
    // });
    // describe("#withdrawBid", function () {
    //   shouldBehaveLikeWithdrawBid();
    // });
    // describe("#withdrawPayment", function () {
    //   shouldBehaveLikeWithdrawPayment();
    // });
    // describe("#liquidate", function () {
    //   shouldBehaveLikeLiquidate();
    // });
    // describe("#setBiddingPeriod", function () {
    //   shouldBehaveLikeSetBiddingPeriod();
    // });
    // describe("#setGracePeriod", function () {
    //   shouldBehaveLikeSetGracePeriod();
    // });
    describe("#withdrawSell", function () {
      shouldBehaveLikeWithdrawSell();
    });
  });
}
