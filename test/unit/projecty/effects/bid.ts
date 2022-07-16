import type { BigNumber } from "@ethersproject/bignumber";
import { Zero } from "@ethersproject/constants";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { testUtils } from "hardhat";

import { toWei } from "../../../../utils/format";
import { ProjectY__Errors } from "../../../shared/errors";
import { expect } from "../../../shared/expect";
import { get34PercentOf } from "../../../shared/utils";

const { time } = testUtils;

export default function shouldBehaveLikeBid(): void {
  context("when entryId is not valid", function () {
    it("reverts", async function () {
      await expect(
        this.contracts.projecty
          .connect(this.signers.accounts[1])
          .bid(45, toWei("0.34"), { value: toWei("1") })
      ).to.be.revertedWith(ProjectY__Errors.InvalidEntryId);
    });
  });

  context("when single bid is placed on valid entryId", function () {
    const tokenId = 1;
    const entryId = 1;
    const sellingPrice: BigNumber = toWei("10");

    let erc721Address: string;
    let seller: SignerWithAddress;
    let buyer: SignerWithAddress;

    before(async function () {
      erc721Address = this.mocks.erc721.address;
      seller = this.signers.accounts[0];
      buyer = this.signers.accounts[1];
    });

    beforeEach(async function () {
      await this.mocks.erc721.mint(seller.address, tokenId);
      await this.mocks.erc721.connect(seller).approve(this.contracts.projecty.address, tokenId);
      await this.contracts.projecty.connect(seller).sell(erc721Address, tokenId, sellingPrice);
    });

    context("when value or bidPrice is invalid", function () {
      it("reverts when zero value", async function () {
        await expect(
          this.contracts.projecty.connect(buyer).bid(entryId, toWei("3.4"), { value: Zero })
        ).to.be.revertedWith(ProjectY__Errors.ValueMustBe34PercentOfBidPrice);
      });

      it("reverts when invalid bidPrice", async function () {
        await expect(
          this.contracts.projecty.connect(buyer).bid(entryId, toWei("3.5"), { value: sellingPrice })
        ).to.be.revertedWith(ProjectY__Errors.ValueMustBe34PercentOfBidPrice);
      });
    });

    context("when bidding period is over", function () {
      it("reverts", async function () {
        const sellerTimestamp: number = (
          await this.contracts.projecty.sellerTimestamp(entryId)
        ).toNumber();
        await time.increase(sellerTimestamp + time.duration.days(10));

        await expect(
          this.contracts.projecty
            .connect(buyer)
            .bid(entryId, sellingPrice, { value: get34PercentOf(sellingPrice) })
        ).to.be.revertedWith(ProjectY__Errors.BiddingPeriodOver);
      });
    });

    context("when a bid is placed within bidding period", function () {
      it("generates unique bidId", async function () {
        await this.contracts.projecty
          .connect(buyer)
          .bid(entryId, sellingPrice, { value: get34PercentOf(sellingPrice) });

        await expect(this.contracts.projecty.isBidIdValid(0)).to.revertedWith(
          ProjectY__Errors.InvalidBidId
        );

        expect(await this.contracts.projecty.isBidIdValid(1)).to.equal(true);
      });

      it("retrieves correct buyerInfo values", async function () {
        const entryId = 1;
        const bidId = 1;
        const blockTimestamp = await time.latest();
        const bidPrice = toWei("8");
        const value = get34PercentOf(bidPrice);

        await this.contracts.projecty.connect(buyer).bid(entryId, bidPrice, { value: value });

        expect(await this.contracts.projecty.buyerIsSelected(bidId)).to.equal(false);
        expect(await this.contracts.projecty.buyerAddress(bidId)).to.equal(buyer.address);
        expect(await this.contracts.projecty.buyerTimestamp(bidId)).to.approximately(
          blockTimestamp,
          1
        );
        expect(await this.contracts.projecty.buyerBidPrice(bidId)).to.equal(bidPrice);
        expect(await this.contracts.projecty.buyerEntryId(bidId)).to.equal(entryId);
        expect(await this.contracts.projecty.buyerPricePaid(bidId)).to.equal(value);
        expect(await this.contracts.projecty.buyerWNFTTokenId(bidId)).to.equal(0);
      });

      it("emits Bid event", async function () {
        const entryId = 1;
        const bidId = 1;
        const blockTimestamp = await time.latest();
        const bidPrice = toWei("8");
        const value = get34PercentOf(bidPrice);

        await expect(
          this.contracts.projecty.connect(buyer).bid(entryId, bidPrice, { value: value })
        )
          .to.emit(this.contracts.projecty, "Bid")
          .withArgs(buyer.address, entryId, bidId, blockTimestamp + 1);
      });
    });
  });

  context("when multiple buyers bid on multiple entryIds", function () {
    let erc721Address: string;

    const sellers = [
      {
        seller: {} as SignerWithAddress,
        tokenId: 1,
        entryId: 1,
        sellingPrice: toWei("15"),
      },
      {
        seller: {} as SignerWithAddress,
        tokenId: 2,
        entryId: 2,
        sellingPrice: toWei("25"),
      },
      {
        seller: {} as SignerWithAddress,
        tokenId: 3,
        entryId: 3,
        sellingPrice: toWei("5"),
      },
      {
        seller: {} as SignerWithAddress,
        tokenId: 4,
        entryId: 4,
        sellingPrice: toWei("1"),
      },
    ];

    const buyers = [
      {
        buyer: {} as SignerWithAddress,
        bid: toWei("8"),
        value: get34PercentOf(toWei("8")),
        bidId: 1,
      },
      {
        buyer: {} as SignerWithAddress,
        bid: toWei("40"),
        value: get34PercentOf(toWei("40")),
        bidId: 2,
      },
      {
        buyer: {} as SignerWithAddress,
        bid: toWei("2"),
        value: get34PercentOf(toWei("2")),
        bidId: 3,
      },
      {
        buyer: {} as SignerWithAddress,
        bid: toWei("17.5"),
        value: get34PercentOf(toWei("17.5")),
        bidId: 4,
      },
    ];

    before(async function () {
      erc721Address = this.mocks.erc721.address;

      for (let i = 0; i < 8; i++) {
        if (i < 4) {
          sellers[i].seller = this.signers.accounts[i];
        }
        if (i >= 4) {
          buyers[i - 4].buyer = this.signers.accounts[i];
        }
      }
    });

    beforeEach(async function () {
      for (const s of sellers) {
        await this.mocks.erc721.mint(s.seller.address, s.tokenId);
        await this.mocks.erc721
          .connect(s.seller)
          .approve(this.contracts.projecty.address, s.tokenId);
        await this.contracts.projecty
          .connect(s.seller)
          .sell(erc721Address, s.tokenId, s.sellingPrice);
      }
    });

    context("when each buyer bids", function () {
      beforeEach(async function () {
        for (let i = 0; i < buyers.length; i++) {
          const b = buyers[i];

          await expect(
            this.contracts.projecty
              .connect(b.buyer)
              .bid(sellers[i].entryId, b.bid, { value: b.value })
          )
            .to.emit(this.contracts.projecty, "Bid")
            .withArgs(b.buyer.address, sellers[i].entryId, b.bidId, anyValue);
        }
      });

      it("retrieves correct values", async function () {
        for (let i = 0; i < buyers.length; i++) {
          const b = buyers[i];
          const s = sellers[i];

          expect(await this.contracts.projecty.buyerIsSelected(b.bidId)).to.equal(false);
          expect(await this.contracts.projecty.buyerAddress(b.bidId)).to.equal(b.buyer.address);
          expect(await this.contracts.projecty.buyerBidPrice(b.bidId)).to.equal(b.bid);
          expect(await this.contracts.projecty.buyerEntryId(b.bidId)).to.equal(s.entryId);
          expect(await this.contracts.projecty.buyerPricePaid(b.bidId)).to.equal(b.value);
          expect(await this.contracts.projecty.buyerWNFTTokenId(b.bidId)).to.equal(0);

          expect(await this.contracts.projecty.sellerTotalBids(s.entryId)).to.equal(1);
        }

        expect(await this.contracts.projecty.totalBidIds()).to.equal(buyers.length);
        expect(await this.contracts.projecty.totalEntryIds()).to.equal(sellers.length);
      });
    });

    context("when entryId 2 gets three bids", function () {
      const entryIdTwo = 2;

      beforeEach(async function () {
        for (let i = 0; i < 3; i++) {
          const b = buyers[i];

          await expect(
            this.contracts.projecty.connect(b.buyer).bid(entryIdTwo, b.bid, { value: b.value })
          )
            .to.emit(this.contracts.projecty, "Bid")
            .withArgs(b.buyer.address, entryIdTwo, b.bidId, anyValue);
        }
      });

      it("retrieves correct total bids", async function () {
        expect(await this.contracts.projecty.sellerTotalBids(entryIdTwo)).to.equal(3);

        expect(await this.contracts.projecty.totalBidIds()).to.equal(3);
        expect(await this.contracts.projecty.totalEntryIds()).to.equal(4);
      });
    });
  });
}
