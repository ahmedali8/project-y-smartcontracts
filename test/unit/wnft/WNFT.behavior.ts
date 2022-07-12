import shouldBehaveLikeBalanceOf from "./view/balanceOf";
import shouldBehaveLikeGetApproved from "./view/getApproved";
import shouldBehaveLikeName from "./view/name";
import shouldBehaveLikeOwner from "./view/owner";
import shouldBehaveLikeOwnerOf from "./view/ownerOf";
import shouldBehaveLikeSupportsInterface from "./view/supportsInterface";
import shouldBehaveLikeSymbol from "./view/symbol";
import shouldBehaveLikeTokenByIndex from "./view/tokenByIndex";
import shouldBehaveLikeTokenOfOwnerByIndex from "./view/tokenOfOwnerByIndex";
import shouldBehaveLikeTokenURI from "./view/tokenURI";
import shouldBehaveLikeTotalSupply from "./view/totalSupply";
import shouldBehaveLikeUserExpires from "./view/userExpires";
import shouldBehaveLikeUserOf from "./view/userOf";

export function shouldBehaveLikeWNFT(): void {
  describe("View Functions", function () {
    describe("name", function () {
      shouldBehaveLikeName();
    });

    describe("symbol", function () {
      shouldBehaveLikeSymbol();
    });

    describe("owner", function () {
      shouldBehaveLikeOwner();
    });

    describe("balanceOf", function () {
      shouldBehaveLikeBalanceOf();
    });

    describe("ownerOf", function () {
      shouldBehaveLikeOwnerOf();
    });

    describe("getApproved", function () {
      shouldBehaveLikeGetApproved();
    });

    describe("totalSupply", function () {
      shouldBehaveLikeTotalSupply();
    });

    describe("tokenOfOwnerByIndex", function () {
      shouldBehaveLikeTokenOfOwnerByIndex();
    });

    describe("tokenByIndex", function () {
      shouldBehaveLikeTokenByIndex();
    });

    describe("tokenURI", function () {
      shouldBehaveLikeTokenURI();
    });

    describe("userOf", function () {
      shouldBehaveLikeUserOf();
    });

    describe("userExpires", function () {
      shouldBehaveLikeUserExpires();
    });

    describe("supportsInterface", function () {
      shouldBehaveLikeSupportsInterface();
    });
  });

  describe("Effects Functions", function () {
    //
  });
}
