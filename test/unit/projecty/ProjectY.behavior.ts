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
import shouldBehaveLikeTemporaryFrontendHelpers from "./temp-frontend-helpers";
import shouldBehaveLikeGetBuyerInfo from "./view/getBuyerInfo";
import shouldBehaveLikeGetDownPaymentAmount from "./view/getDownPaymentAmount";
import shouldBehaveLikeGetInstallmentAmountPerMonth from "./view/getInstallmentAmountPerMonth";
import shouldBehaveLikeGetInstallmentMonthTimestamp from "./view/getInstallmentMonthTimestamp";
import shouldBehaveLikeGetIsBidIdValid from "./view/getIsBidIdValid";
import shouldBehaveLikeGetIsEntryIdValid from "./view/getIsEntryIdValid";
import shouldBehaveLikeGetSellerInfo from "./view/getSellerInfo";
import shouldBehaveLikeGetTotalBidIds from "./view/getTotalBidIds";
import shouldBehaveLikeGetTotalEntryIds from "./view/getTotalEntryIds";
import shouldBehaveLikeGetTotalInstallments from "./view/getTotalInstallments";

export function shouldBehaveLikeProjectY(): void {
  describe("View Functions", function () {
    describe("#getIsEntryIdValid", function () {
      shouldBehaveLikeGetIsEntryIdValid();
    });
    describe("#getIsBidIdValid", function () {
      shouldBehaveLikeGetIsBidIdValid();
    });
    describe("#getTotalEntryIds", function () {
      shouldBehaveLikeGetTotalEntryIds();
    });
    describe("#getTotalBidIds", function () {
      shouldBehaveLikeGetTotalBidIds();
    });
    describe("#getSellerInfo", function () {
      shouldBehaveLikeGetSellerInfo();
    });
    describe("#getBuyerInfo", function () {
      shouldBehaveLikeGetBuyerInfo();
    });
    describe("#getTotalInstallments", function () {
      shouldBehaveLikeGetTotalInstallments();
    });
    describe("#getDownPaymentAmount", function () {
      shouldBehaveLikeGetDownPaymentAmount();
    });
    describe("#getInstallmentAmountPerMonth", function () {
      shouldBehaveLikeGetInstallmentAmountPerMonth();
    });
    describe("#getInstallmentMonthTimestamp", function () {
      shouldBehaveLikeGetInstallmentMonthTimestamp();
    });

    // temporary
    describe("Temporary Frontend Helpers", function () {
      shouldBehaveLikeTemporaryFrontendHelpers();
    });
  });

  describe("Effects Functions", function () {
    describe("#sell", function () {
      shouldBehaveLikeSell();
    });
    describe("#bid", function () {
      shouldBehaveLikeBid();
    });
    describe("#selectBid", function () {
      shouldBehaveLikeSelectBid();
    });
    describe("#payInstallment", function () {
      shouldBehaveLikePayInstallment();
    });
    describe("#withdrawBid", function () {
      shouldBehaveLikeWithdrawBid();
    });
    describe("#withdrawPayment", function () {
      shouldBehaveLikeWithdrawPayment();
    });
    describe("#liquidate", function () {
      shouldBehaveLikeLiquidate();
    });
    describe("#setBiddingPeriod", function () {
      shouldBehaveLikeSetBiddingPeriod();
    });
    describe("#setGracePeriod", function () {
      shouldBehaveLikeSetGracePeriod();
    });
    describe("#withdrawSell", function () {
      shouldBehaveLikeWithdrawSell();
    });
  });
}
