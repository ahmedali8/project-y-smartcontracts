import shouldBehaveLikeGetAllBidsOnNFT from "./getAllBidsOnNFT";
import shouldBehaveLikeGetNFTsOpenForSale from "./getNFTsOpenForSale";
import shouldBehaveLikeGetUserNFTsOngoingInstallmentPhase from "./getUserNFTsOngoingInstallmentPhase";
import shouldBehaveLikeGetUserNFTsOpenForSale from "./getUserNFTsOpenForSale";

export default function shouldBehaveLikeTemporaryFrontendHelpers(): void {
  describe("#getNFTsOpenForSale", function () {
    shouldBehaveLikeGetNFTsOpenForSale();
  });
  describe("#getUserNFTsOpenForSale", function () {
    shouldBehaveLikeGetUserNFTsOpenForSale();
  });
  describe("#getAllBidsOnNFT", function () {
    shouldBehaveLikeGetAllBidsOnNFT();
  });
  describe("#getUserNFTsOngoingInstallmentPhase", function () {
    shouldBehaveLikeGetUserNFTsOngoingInstallmentPhase();
  });
}
