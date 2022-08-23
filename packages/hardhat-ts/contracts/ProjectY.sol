// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@rari-capital/solmate/src/auth/Owned.sol";

import "hardhat/console.sol";

contract ProjectY is Context, Owned, ERC721Holder {
  using Counters for Counters.Counter;

  /*//////////////////////////////////////////////////////////////
                                VARIABLES
    //////////////////////////////////////////////////////////////*/

  Counters.Counter private p_entryIdTracker;
  Counters.Counter private p_bidIdTracker;

  // // FOR TESTNET ONLY
  // uint64 public constant ONE_MONTH = 1 days;
  // uint64 public biddingPeriod = 90 minutes;
  // uint64 public gracePeriod = 90 minutes;

  uint64 public constant ONE_MONTH = 30 days;
  uint64 public biddingPeriod = 7 days;
  uint64 public gracePeriod = 7 days;

  // vars for frontend helpers
  uint256 public getHistoricTotalEntryIds;
  uint256 public getHistoricTotalBidIds;

  enum InstallmentPlan {
    None, // no installment
    ThreeMonths,
    SixMonths,
    NineMonths
  }

  struct SellerInfo {
    bool onSale;
    address sellerAddress;
    address contractAddress;
    uint8 installmentsPaid;
    uint8 paymentsClaimed;
    uint64 timestamp;
    uint256 tokenId;
    uint256 sellingPrice;
    uint256 totalBids;
    uint256 selectedBidId;
    InstallmentPlan installment;
  }

  struct BuyerInfo {
    bool isSelected;
    address buyerAddress;
    uint64 timestamp;
    uint256 bidPrice;
    uint256 entryId;
    uint256 pricePaid; // initially equal to downpayment
    InstallmentPlan bidInstallment;
  }

  // entryId -> SellerInfo
  mapping(uint256 => SellerInfo) private p_sellerInfo;

  // bidId -> BuyerInfo
  mapping(uint256 => BuyerInfo) private p_buyerInfo;

  /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

  event Sell(address indexed seller, address indexed contractAddress, uint256 tokenId, uint256 indexed entryId, uint64 timestamp);

  event Bid(address indexed buyer, uint256 indexed entryId, uint256 indexed bidId, uint64 timestamp);

  event BidSelected(uint256 bidId, uint256 entryId);

  event InstallmentPaid(address buyer, uint256 entryId, uint256 bidId, uint256 installmentNumber);

  event BidWithdrawn(uint256 bidId, uint256 entryId, uint256 value);

  event SellWithdrawn(address seller, uint256 entryId);

  event PaymentWithdrawn(uint256 bidId, uint256 entryId, uint256 value, uint256 paymentsClaimed);

  event Liquidated(uint256 entryId, uint256 bidId, uint256 installmentPaid, uint256 value);

  event BiddingPeriodUpdated(uint64 prevBiddingPeriod, uint64 newBiddingPeriod);

  event GracePeriodUpdated(uint64 prevGracePeriod, uint64 newGracePeriod);

  /*//////////////////////////////////////////////////////////////
                                CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

  constructor(address owner_) Owned(owner_) {
    // solhint-disable-previous-line no-empty-blocks
  }

  /*//////////////////////////////////////////////////////////////
                        NON-VIEW/PURE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

  function sell(
    address contractAddress_,
    uint256 tokenId_,
    uint256 sellingPrice_,
    InstallmentPlan installment_
  ) external returns (uint256) {
    require(sellingPrice_ != 0, "INVALID_PRICE");

    uint64 blockTimestamp_ = uint64(block.timestamp);

    // create unique entryId
    p_entryIdTracker.increment();
    getHistoricTotalEntryIds++;
    uint256 entryId_ = p_entryIdTracker.current();

    // update mapping
    p_sellerInfo[entryId_].onSale = true;
    p_sellerInfo[entryId_].sellerAddress = _msgSender();
    p_sellerInfo[entryId_].contractAddress = contractAddress_;
    p_sellerInfo[entryId_].timestamp = blockTimestamp_;
    p_sellerInfo[entryId_].tokenId = tokenId_;
    p_sellerInfo[entryId_].sellingPrice = sellingPrice_;
    p_sellerInfo[entryId_].installment = installment_;

    emit Sell(_msgSender(), contractAddress_, tokenId_, entryId_, blockTimestamp_);

    // transfer NFT to this contract
    IERC721(contractAddress_).safeTransferFrom(_msgSender(), address(this), tokenId_);

    return entryId_;
  }

  function withdrawSell(uint256 entryId_) external returns (uint256) {
    _requireIsEntryIdValid(entryId_);

    SellerInfo memory sellerInfo_ = p_sellerInfo[entryId_];

    require(_msgSender() == sellerInfo_.sellerAddress, "CALLER_NOT_SELLER");

    require(uint64(block.timestamp) >= sellerInfo_.timestamp + biddingPeriod, "BIDDING_PERIOD_NOT_OVER");
    require(sellerInfo_.selectedBidId == 0, "BIDDER_SHOULD_NOT_BE_SELECTED");

    // delete entryId
    delete p_sellerInfo[entryId_];

    // decrease total entryIds
    p_entryIdTracker.decrement();

    emit SellWithdrawn(sellerInfo_.sellerAddress, entryId_);

    IERC721(sellerInfo_.contractAddress).safeTransferFrom(address(this), sellerInfo_.sellerAddress, sellerInfo_.tokenId);

    return entryId_;
  }

  function bid(
    uint256 entryId_,
    uint256 bidPrice_,
    InstallmentPlan installment_
  ) external payable returns (uint256) {
    _requireIsEntryIdValid(entryId_);

    uint256 value_ = msg.value;
    uint64 blockTimestamp_ = uint64(block.timestamp);

    require(blockTimestamp_ <= p_sellerInfo[entryId_].timestamp + biddingPeriod, "BIDDING_PERIOD_OVER");

    // create unique bidId
    p_bidIdTracker.increment();
    getHistoricTotalBidIds++;
    uint256 bidId_ = p_bidIdTracker.current();

    // update buyer info mapping
    p_buyerInfo[bidId_].buyerAddress = _msgSender();
    p_buyerInfo[bidId_].bidInstallment = installment_;
    p_buyerInfo[bidId_].timestamp = blockTimestamp_;
    p_buyerInfo[bidId_].bidPrice = bidPrice_;
    p_buyerInfo[bidId_].entryId = entryId_;

    // update total bids for this entry id
    p_sellerInfo[entryId_].totalBids += 1;

    uint256 downPayment_ = getDownPaymentAmount(bidId_);

    require(value_ != 0 && value_ == downPayment_, "VALUE_NOT_EQUAL_TO_DOWN_PAYMENT");

    // update price paid
    p_buyerInfo[bidId_].pricePaid = value_;

    emit Bid(_msgSender(), entryId_, bidId_, blockTimestamp_);

    return bidId_;
  }

  function selectBid(uint256 bidId_) external {
    uint64 blockTimestamp_ = uint64(block.timestamp);
    _requireIsBidIdValid(bidId_);

    uint256 entryId_ = p_buyerInfo[bidId_].entryId;
    _requireIsEntryIdValid(entryId_);

    SellerInfo memory sellerInfo_ = p_sellerInfo[entryId_];
    BuyerInfo memory buyerInfo_ = p_buyerInfo[bidId_];

    require(_msgSender() == sellerInfo_.sellerAddress, "CALLER_NOT_SELLER");
    require(blockTimestamp_ >= sellerInfo_.timestamp + biddingPeriod, "BIDDING_PERIOD_NOT_OVER");

    // will be tested in other than none scenario
    require(sellerInfo_.selectedBidId == 0 && !buyerInfo_.isSelected, "CANNOT_RESELECT_BID");

    emit BidSelected(bidId_, entryId_);

    // if installment plan is none so transfer the nft on selection of bid
    if (buyerInfo_.bidInstallment == InstallmentPlan.None) {
      // delete seller
      delete p_sellerInfo[entryId_];

      // decrease total entryIds
      p_entryIdTracker.decrement();

      // delete bid
      delete p_buyerInfo[bidId_];

      // decrease total bidIds
      p_bidIdTracker.decrement();

      IERC721(sellerInfo_.contractAddress).safeTransferFrom(address(this), buyerInfo_.buyerAddress, sellerInfo_.tokenId);

      // send value to seller
      Address.sendValue(payable(sellerInfo_.sellerAddress), buyerInfo_.pricePaid);
    } else {
      // update buyer info
      p_buyerInfo[bidId_].isSelected = true;
      p_buyerInfo[bidId_].timestamp = blockTimestamp_;

      // make NFT onSale off and set selected bidId
      p_sellerInfo[entryId_].onSale = false;
      p_sellerInfo[entryId_].selectedBidId = bidId_;

      p_sellerInfo[entryId_].installment = buyerInfo_.bidInstallment;
      p_sellerInfo[entryId_].sellingPrice = buyerInfo_.bidPrice;
      p_sellerInfo[entryId_].installmentsPaid = 1;
    }
  }

  function payInstallment(uint256 entryId_) external payable {
    uint256 value_ = msg.value;

    // if InstallmentPlan.None so entryId is not validated as it was deleted
    _requireIsEntryIdValid(entryId_);

    uint256 bidId_ = p_sellerInfo[entryId_].selectedBidId;

    require(bidId_ != 0, "NO_BID_ID_SELECTED");

    BuyerInfo memory buyerInfo_ = p_buyerInfo[bidId_];

    require(buyerInfo_.buyerAddress == _msgSender(), "CALLER_NOT_BUYER");

    uint256 bidPrice_ = buyerInfo_.bidPrice;
    uint256 pricePaid_ = buyerInfo_.pricePaid;

    uint8 installmentsPaid_ = p_sellerInfo[entryId_].installmentsPaid;

    // check if installment is done then revert
    uint8 totalInstallments_ = getTotalInstallments(bidId_);

    require(installmentsPaid_ != totalInstallments_, "NO_INSTALLMENT_LEFT");

    console.log("step one");
    console.log("bidPrice_: ", bidPrice_);
    console.log("pricePaid_: ", pricePaid_);

    if (bidPrice_ != pricePaid_) {
      uint256 installmentPerMonth_ = getInstallmentAmountPerMonth(entryId_);

      require(installmentPerMonth_ == value_, "INVALID_INSTALLMENT_VALUE");

      // get timestamp of installment paid
      uint64 installmentPaidTimestamp_ = getInstallmentMonthTimestamp(bidId_, installmentsPaid_);

      // current timestamp should be greater than installmentPaidTimestamp_
      require(uint64(block.timestamp) > installmentPaidTimestamp_, "PAY_AFTER_APPROPRIATE_TIME");

      // get timestamp of next payment
      uint64 installmentMonthTimestamp_ = getInstallmentMonthTimestamp(
        bidId_,
        installmentsPaid_ + 1 // the installment number that needs to be paid
      );

      // if current timestamp is greater then timestamp of next payment + gracePeriod then stop execution
      require(!(uint64(block.timestamp) > (installmentMonthTimestamp_ + gracePeriod)), "DUE_DATE_PASSED");

      p_buyerInfo[bidId_].pricePaid += value_;
      p_sellerInfo[entryId_].installmentsPaid++;

      // may increment local variable as well
      pricePaid_ += value_;
    }

    console.log("step two");
    console.log("bidPrice_: ", bidPrice_);
    console.log("pricePaid_: ", p_buyerInfo[bidId_].pricePaid);

    emit InstallmentPaid(_msgSender(), entryId_, bidId_, installmentsPaid_ + 1);

    // all installments done so transfer NFT to buyer
    // refetch pricePaid from storage becuase we upadated it in above block
    // if (bidPrice_ == p_buyerInfo[bidId_].pricePaid) {
    if (bidPrice_ == pricePaid_) {
      IERC721(p_sellerInfo[entryId_].contractAddress).safeTransferFrom(address(this), buyerInfo_.buyerAddress, p_sellerInfo[entryId_].tokenId);
    }
  }

  function withdrawBid(uint256 bidId_) external {
    _requireIsBidIdValid(bidId_);

    BuyerInfo memory buyerInfo_ = p_buyerInfo[bidId_];

    require(buyerInfo_.buyerAddress == _msgSender(), "CALLER_NOT_BUYER");
    require(uint64(block.timestamp) >= p_sellerInfo[buyerInfo_.entryId].timestamp + biddingPeriod, "BIDDING_PERIOD_NOT_OVER");
    require(!buyerInfo_.isSelected, "BIDDER_SHOULD_NOT_BE_SELECTED");

    // delete bid
    delete p_buyerInfo[bidId_];

    // decrease total bidIds
    p_bidIdTracker.decrement();

    emit BidWithdrawn(bidId_, buyerInfo_.entryId, buyerInfo_.pricePaid);

    // return the price paid
    Address.sendValue(payable(buyerInfo_.buyerAddress), buyerInfo_.pricePaid);
  }

  function withdrawPayment(uint256 entryId_) external {
    _requireIsEntryIdValid(entryId_);
    SellerInfo memory sellerInfo_ = p_sellerInfo[entryId_];
    _requireIsBidIdValid(sellerInfo_.selectedBidId);

    require(_msgSender() == sellerInfo_.sellerAddress, "CALLER_NOT_SELLER");

    uint8 secondLastInstallmentPaid_ = sellerInfo_.installmentsPaid - 1;

    console.log("sellerInfo_.installmentsPaid: ", sellerInfo_.installmentsPaid);
    console.log("secondLastInstallmentPaid_: ", secondLastInstallmentPaid_);
    console.log("sellerInfo_.paymentsClaimed: ", sellerInfo_.paymentsClaimed);

    // check if installment is done then revert
    uint8 totalInstallments_ = getTotalInstallments(sellerInfo_.selectedBidId);

    // // get timestamp of next payment
    // uint64 nextInstallmentTimestamp_ = getInstallmentMonthTimestamp(
    //     sellerInfo_.selectedBidId,
    //     sellerInfo_.installmentsPaid + 1 // the installment number that needs to be paid
    // );

    // console.log("nextInstallmentTimestamp_: ", nextInstallmentTimestamp_);

    // // current timestamp should greater than nextInstallmentTimestamp_
    // require(
    //     uint64(block.timestamp) > nextInstallmentTimestamp_,
    //     "CLAIM_AFTER_APPROPRIATE_TIME"
    // );

    bool isLastClaimablePayment_ = totalInstallments_ == sellerInfo_.installmentsPaid &&
      // if payments claimed is zero then it means only downpayment is done
      sellerInfo_.paymentsClaimed != 0 &&
      // if payments claimed and second last are equal this means this is last payment claiming
      sellerInfo_.paymentsClaimed == secondLastInstallmentPaid_;

    // payments claimed should be one less than installmentsPaid
    // no other check required as installmentsPaid will increase after a month
    require(
      (((sellerInfo_.paymentsClaimed < secondLastInstallmentPaid_) && (sellerInfo_.installment != InstallmentPlan.None)) || (isLastClaimablePayment_)),
      "CANNOT_RECLAIM_PAYMENT"
    );

    uint8 paymentsClaimable_ = 0;
    uint256 amountClaimable_ = 0;

    // seller is claiming for the first time and only second payment is done
    // so release downpayment only
    if (sellerInfo_.paymentsClaimed == 0 && secondLastInstallmentPaid_ == 1) {
      console.log("block 1");
      paymentsClaimable_ = 1;
      amountClaimable_ = getDownPaymentAmount(sellerInfo_.selectedBidId);
    }

    // seller is claiming for the first time and all installments are done
    // && sellerInfo_.installmentsPaid == totalInstallments_
    if (sellerInfo_.paymentsClaimed == 0 && secondLastInstallmentPaid_ > 1) {
      console.log("block 2");
      uint8 no_;

      if (sellerInfo_.installmentsPaid == totalInstallments_) {
        console.log("block 2-A");
        // secondLastInstallmentPaid_ // totalInstallments_ - 1
        paymentsClaimable_ = sellerInfo_.installmentsPaid;
        no_ = secondLastInstallmentPaid_;
      } else {
        console.log("block 2-B");
        paymentsClaimable_ = secondLastInstallmentPaid_; // secondLastInstallmentPaid_ // totalInstallments_ - 1
        no_ = secondLastInstallmentPaid_ - 1;
      }

      uint256 downPayment_ = getDownPaymentAmount(sellerInfo_.selectedBidId);
      console.log("downPayment_: ", downPayment_);

      console.log("no_: ", no_);

      uint256 installmentPerMonth_ = getInstallmentAmountPerMonth(entryId_);
      console.log("installmentPerMonth_: ", installmentPerMonth_);

      amountClaimable_ = downPayment_ + (installmentPerMonth_ * no_);
    }

    // seller is claiming payment other than first
    if (sellerInfo_.paymentsClaimed != 0) {
      console.log("block 3");
      paymentsClaimable_ = secondLastInstallmentPaid_ - sellerInfo_.paymentsClaimed;
      amountClaimable_ = paymentsClaimable_ * getInstallmentAmountPerMonth(entryId_);
    }

    // seller is claiming last payment
    if (isLastClaimablePayment_) {
      console.log("block 4");
      paymentsClaimable_ = 1;
      amountClaimable_ = getInstallmentAmountPerMonth(entryId_);
    }

    console.log("paymentsClaimable_: ", paymentsClaimable_);
    console.log("amountClaimable_: ", amountClaimable_);

    // update paymentsClaimed
    p_sellerInfo[entryId_].paymentsClaimed += paymentsClaimable_;

    emit PaymentWithdrawn(sellerInfo_.selectedBidId, entryId_, amountClaimable_, p_sellerInfo[entryId_].paymentsClaimed);

    // if all payments claimed then delete buyerInfo and sellerInfo
    if (p_sellerInfo[entryId_].paymentsClaimed == totalInstallments_) {
      // delete seller
      delete p_sellerInfo[entryId_];

      // decrease total entryIds
      p_entryIdTracker.decrement();

      // delete bid
      delete p_buyerInfo[sellerInfo_.selectedBidId];

      // decrease total bidIds
      p_bidIdTracker.decrement();
    }

    // // if last payment then delete buyerInfo and sellerInfo
    // if (isLastClaimablePayment_) {
    //     // delete seller
    //     delete p_sellerInfo[entryId_];
    //     // delete bid
    //     delete p_buyerInfo[sellerInfo_.selectedBidId];
    // } else {
    //     // update paymentsClaimed
    //     p_sellerInfo[entryId_].paymentsClaimed += paymentsClaimable_;
    // }

    console.log("before txn contract balance: ", address(this).balance);

    // transfer amountClaimable_ to seller
    Address.sendValue(payable(sellerInfo_.sellerAddress), amountClaimable_);

    console.log("after txn contract balance: ", address(this).balance);
  }

  function liquidate(uint256 entryId_) external payable {
    uint256 value_ = msg.value;

    _requireIsEntryIdValid(entryId_);
    SellerInfo memory sellerInfo_ = p_sellerInfo[entryId_];

    uint256 bidId_ = sellerInfo_.selectedBidId;
    _requireIsBidIdValid(bidId_);
    BuyerInfo memory buyerInfo_ = p_buyerInfo[bidId_];

    require(_msgSender() != sellerInfo_.sellerAddress && _msgSender() != buyerInfo_.buyerAddress, "INVALID_CALLER");

    // 0 means InstallmentPlan.None
    uint8 totalInstallments_ = getTotalInstallments(sellerInfo_.selectedBidId);

    console.log("totalInstallments_: ", totalInstallments_);
    console.log("sellerInfo_.installmentsPaid: ", sellerInfo_.installmentsPaid);

    // None or Installments paid
    require(sellerInfo_.installmentsPaid != totalInstallments_ && totalInstallments_ != 0, "INSTALLMENTS_COMPLETE");

    // get timestamp of next payment
    uint256 installmentMonthTimestamp_ = getInstallmentMonthTimestamp(bidId_, sellerInfo_.installmentsPaid + 1);

    // if timestamp of next payment + gracePeriod is passed then liquidate otherwise stop execution
    require(uint64(block.timestamp) > (installmentMonthTimestamp_ + gracePeriod), "INSTALLMENT_ON_TRACK");

    address oldbuyer_ = buyerInfo_.buyerAddress;

    uint256 installmentPerMonth_ = getInstallmentAmountPerMonth(entryId_);
    uint256 liquidationValue_ = (buyerInfo_.pricePaid * 95) / 100;

    uint256 valueToBePaid_ = liquidationValue_ + installmentPerMonth_;

    console.log("installmentPerMonth_: ", installmentPerMonth_);
    console.log("liquidationValue_: ", liquidationValue_);
    console.log("valueToBePaid_: ", valueToBePaid_);

    require(valueToBePaid_ == value_, "INVALID_LIQUIDATION_VALUE");

    // update new buyer
    p_buyerInfo[bidId_].buyerAddress = _msgSender();
    p_buyerInfo[bidId_].pricePaid += installmentPerMonth_;
    p_sellerInfo[entryId_].installmentsPaid++;

    emit Liquidated(entryId_, bidId_, p_sellerInfo[entryId_].installmentsPaid, valueToBePaid_);

    // if only last installment remains then transfer nft
    if (sellerInfo_.installmentsPaid == totalInstallments_ - 1) {
      IERC721(p_sellerInfo[entryId_].contractAddress).safeTransferFrom(address(this), _msgSender(), sellerInfo_.tokenId);
    }

    // transfer 95% of pricePaid to old buyer
    Address.sendValue(payable(oldbuyer_), liquidationValue_);
  }

  function setBiddingPeriod(uint64 biddingPeriod_) external onlyOwner {
    require(biddingPeriod_ != 0, "INVALID_BIDDING_PERIOD");
    emit BiddingPeriodUpdated(biddingPeriod, biddingPeriod_);
    biddingPeriod = biddingPeriod_;
  }

  function setGracePeriod(uint64 gracePeriod_) external onlyOwner {
    require(gracePeriod_ != 0, "INVALID_GRACE_PERIOD");
    emit GracePeriodUpdated(gracePeriod, gracePeriod_);
    gracePeriod = gracePeriod_;
  }

  /*//////////////////////////////////////////////////////////////
                            VIEW/PURE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

  function getTotalEntryIds() external view returns (uint256) {
    return p_entryIdTracker.current();
  }

  function getTotalBidIds() external view returns (uint256) {
    return p_bidIdTracker.current();
  }

  function getIsEntryIdValid(uint256 entryId_) public view returns (bool) {
    return p_sellerInfo[entryId_].sellerAddress != address(0);
  }

  function getIsBidIdValid(uint256 bidId_) public view returns (bool isValid_) {
    return p_buyerInfo[bidId_].buyerAddress != address(0);
  }

  function getSellerInfo(uint256 entryId_) public view returns (SellerInfo memory) {
    _requireIsEntryIdValid(entryId_);
    return p_sellerInfo[entryId_];
  }

  function getBuyerInfo(uint256 bidId_) public view returns (BuyerInfo memory) {
    _requireIsBidIdValid(bidId_);
    return p_buyerInfo[bidId_];
  }

  function getTotalInstallments(uint256 bidId_) public view returns (uint8) {
    _requireIsBidIdValid(bidId_);

    InstallmentPlan installment_ = p_buyerInfo[bidId_].bidInstallment;

    if (installment_ == InstallmentPlan.ThreeMonths) {
      return 3;
    } else if (installment_ == InstallmentPlan.SixMonths) {
      return 6;
    } else if (installment_ == InstallmentPlan.NineMonths) {
      return 9;
    } else {
      return 0; // InstallmentPlan.None
    }
  }

  function getDownPaymentAmount(uint256 bidId_) public view returns (uint256) {
    _requireIsBidIdValid(bidId_);

    BuyerInfo memory buyerInfo_ = p_buyerInfo[bidId_];

    InstallmentPlan installment_ = buyerInfo_.bidInstallment;
    uint256 bidPrice_ = buyerInfo_.bidPrice;

    if (installment_ == InstallmentPlan.ThreeMonths) {
      return (bidPrice_ * 34) / 100; // 34%
    } else if (installment_ == InstallmentPlan.SixMonths) {
      return (bidPrice_ * 175) / 1000; // 17.5%
    } else if (installment_ == InstallmentPlan.NineMonths) {
      return (bidPrice_ * 12) / 100; // 12%
    } else {
      return bidPrice_; // InstallmentPlan.None
    }
  }

  function getInstallmentAmountPerMonth(uint256 entryId_) public view returns (uint256 amount_) {
    _requireIsEntryIdValid(entryId_);
    SellerInfo memory sellerInfo_ = p_sellerInfo[entryId_];

    uint256 bidId_ = sellerInfo_.selectedBidId;
    _requireIsBidIdValid(bidId_);

    BuyerInfo memory buyerInfo_ = p_buyerInfo[bidId_];

    InstallmentPlan installment_ = buyerInfo_.bidInstallment;

    // if (buyerInfo_.bidPrice == buyerInfo_.pricePaid) {
    //     return 0;
    // }

    if (installment_ == InstallmentPlan.ThreeMonths) {
      amount_ = (buyerInfo_.bidPrice * 33) / 100; // 33%
    } else if (installment_ == InstallmentPlan.SixMonths) {
      amount_ = (buyerInfo_.bidPrice * 165) / 1000; // 16.5%
    } else if (installment_ == InstallmentPlan.NineMonths) {
      amount_ = (buyerInfo_.bidPrice * 11) / 100; // 11%
    }

    // unreachable code as it gets reverted
    // in case of InstallmentPlan.None
    // else {
    //     return 0; // InstallmentPlan.None
    // }
  }

  // // get installment amount of specific installment number
  // function getInstallmentAmountOf(
  //     uint256 entryId_,
  //     uint256 bidId_,
  //     uint256 installmentNumber_
  // ) public view returns (uint256) {
  //     // installmentNumber_ == 0 gives downpayment
  //     return
  //         getDownPaymentAmount(bidId_) +
  //         (installmentNumber_ * getInstallmentAmountPerMonth(entryId_));
  // }

  function getInstallmentMonthTimestamp(uint256 bidId_, uint64 installmentNumber_) public view returns (uint64) {
    _requireIsBidIdValid(bidId_);
    require(installmentNumber_ != 0, "INVALID_INSTALLMENT_NUMBER");
    return p_buyerInfo[bidId_].timestamp + ((installmentNumber_ - 1) * ONE_MONTH);
  }

  /*//////////////////////////////////////////////////////////////
                    TEMPORARY FRONT-END FUNCTIONS
    //////////////////////////////////////////////////////////////*/

  // gives all nfts that are open for sale (excluding the one selectedBid)
  function getNFTsOpenForSale() external view returns (SellerInfo[] memory nftsOpenForSale_, uint256[] memory entryIds_) {
    uint256 totalEntryIds_ = getHistoricTotalEntryIds;
    nftsOpenForSale_ = new SellerInfo[](totalEntryIds_);
    entryIds_ = new uint256[](totalEntryIds_);

    // Storing this outside the loop saves gas per iteration.
    SellerInfo memory sellerInfo_;

    for (uint256 i_ = 0; i_ < totalEntryIds_; i_++) {
      // skip seller info if entryId is invalid
      if (getIsEntryIdValid(i_ + 1)) {
        sellerInfo_ = getSellerInfo(i_ + 1);

        if (sellerInfo_.onSale) {
          entryIds_[i_] = i_ + 1;
          nftsOpenForSale_[i_] = sellerInfo_;
        }
      }
    }
  }

  // gives all nfts specific to user that are open for sale (excluding the one selectedBid)
  function getUserNFTsOpenForSale(address user_) external view returns (SellerInfo[] memory userNFTsOpenForSale_, uint256[] memory entryIds_) {
    require(user_ != address(0), "INVALID_ADDRESS");
    uint256 totalEntryIds_ = getHistoricTotalEntryIds;
    userNFTsOpenForSale_ = new SellerInfo[](totalEntryIds_);
    entryIds_ = new uint256[](totalEntryIds_);

    // Storing this outside the loop saves gas per iteration.
    SellerInfo memory sellerInfo_;

    for (uint256 i_ = 0; i_ < totalEntryIds_; i_++) {
      // skip seller info if entryId is invalid
      if (getIsEntryIdValid(i_ + 1)) {
        sellerInfo_ = getSellerInfo(i_ + 1);

        if (sellerInfo_.onSale && sellerInfo_.sellerAddress == user_) {
          entryIds_[i_] = i_ + 1;
          userNFTsOpenForSale_[i_] = sellerInfo_;
        }
      }
    }
  }

  function getAllBidsOnNFT(uint256 entryId_) external view returns (BuyerInfo[] memory allBidsOnNFT_, uint256[] memory bidIds_) {
    uint256 totalBidIds_ = getHistoricTotalBidIds;
    allBidsOnNFT_ = new BuyerInfo[](totalBidIds_);
    bidIds_ = new uint256[](totalBidIds_);

    for (uint256 i_ = 0; i_ < totalBidIds_; i_++) {
      // skip buyer info if bidId is invalid
      if (getIsBidIdValid(i_ + 1)) {
        if (p_buyerInfo[i_ + 1].entryId == entryId_) {
          bidIds_[i_] = i_ + 1;
          allBidsOnNFT_[i_] = getBuyerInfo(i_ + 1);
        }
      }
    }
  }

  // get all nfts ongoing installment phase specific to user
  function getUserNFTsOngoingInstallmentPhase(address user_)
    external
    view
    returns (
      SellerInfo[] memory sellerInfos_,
      BuyerInfo[] memory buyerInfos_,
      uint256[] memory downPayments_,
      uint256[] memory monthlyPayments_,
      uint256[] memory entryIds_,
      uint256[] memory bidIds_
    )
  {
    require(user_ != address(0), "INVALID_ADDRESS");
    uint256 totalEntryIds_ = getHistoricTotalEntryIds;
    uint256 totalBidIds_ = getHistoricTotalBidIds;

    sellerInfos_ = new SellerInfo[](totalEntryIds_);
    buyerInfos_ = new BuyerInfo[](totalBidIds_);
    downPayments_ = new uint256[](totalEntryIds_);
    monthlyPayments_ = new uint256[](9); // max 9 monthly payments
    entryIds_ = new uint256[](totalEntryIds_);
    bidIds_ = new uint256[](totalBidIds_);

    // Storing this outside the loop saves gas per iteration.
    SellerInfo memory sellerInfo_;
    BuyerInfo memory buyerInfo_;

    for (uint256 i_ = 0; i_ < totalEntryIds_; i_++) {
      // skip seller info if entryId is invalid
      if (getIsEntryIdValid(i_ + 1)) {
        sellerInfo_ = getSellerInfo(i_ + 1);

        // skip loop if no selected bid id
        if (sellerInfo_.selectedBidId != 0) {
          buyerInfo_ = getBuyerInfo(sellerInfo_.selectedBidId);

          if (buyerInfo_.buyerAddress == user_) {
            sellerInfos_[i_] = sellerInfo_;
            buyerInfos_[i_] = buyerInfo_;

            downPayments_[i_] = getDownPaymentAmount(sellerInfo_.selectedBidId);
            monthlyPayments_[i_] = getInstallmentAmountPerMonth(sellerInfo_.selectedBidId);

            entryIds_[i_] = i_ + 1;
            bidIds_[i_] = i_ + 1;
          }
        }
      }
    }
  }

  /*//////////////////////////////////////////////////////////////
                            INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

  function _requireIsEntryIdValid(uint256 entryId_) internal view {
    require(getIsEntryIdValid(entryId_), "INVALID_ENTRY_ID");
  }

  function _requireIsBidIdValid(uint256 bidId_) internal view {
    require(getIsBidIdValid(bidId_), "INVALID_BID_ID");
  }
}
