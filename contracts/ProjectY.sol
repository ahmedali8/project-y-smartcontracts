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

    Counters.Counter private _entryIdTracker;
    Counters.Counter private _bidIdTracker;

    uint64 public constant ONE_MONTH = 30 days;

    uint64 public biddingPeriod = 7 days;
    uint64 public gracePeriod = 7 days;

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
    mapping(uint256 => SellerInfo) internal _sellerInfo;

    // bidId -> BuyerInfo
    mapping(uint256 => BuyerInfo) internal _buyerInfo;

    event Sell(
        address indexed seller,
        address indexed contractAddress,
        uint256 tokenId,
        uint256 indexed entryId,
        uint64 timestamp
    );

    event Bid(
        address indexed buyer,
        uint256 indexed entryId,
        uint256 indexed bidId,
        uint64 timestamp
    );

    event BidSelected(uint256 indexed bidId, uint256 indexed entryId);

    constructor(address owner_) Owned(owner_) {
        // solhint-disable-previous-line no-empty-blocks
    }

    // some additional getters for front-end start

    function getNFTsOpenForSale() public view returns (SellerInfo[] memory nftsOpenForSale_) {
        uint256 totalEntryIds_ = getTotalEntryIds();
        nftsOpenForSale_ = new SellerInfo[](totalEntryIds_);

        // Storing this outside the loop saves gas per iteration.
        SellerInfo memory sellerInfo_;

        for (uint256 i_; i_ < totalEntryIds_; ) {
            sellerInfo_ = _sellerInfo[i_ + 1];

            if (sellerInfo_.onSale) {
                nftsOpenForSale_[i_] = sellerInfo_;
            }

            // An array can't have a total length
            // larger than the max uint256 value.
            unchecked {
                ++i_;
            }
        }

        return nftsOpenForSale_;
    }

    function getAllBidsOnNFT(uint256 _entryId)
        public
        view
        returns (BuyerInfo[] memory allBidsOnNFT_)
    {
        uint256 totalBidIds_ = getTotalBidIds();
        allBidsOnNFT_ = new BuyerInfo[](totalBidIds_);

        for (uint256 i_ = 0; i_ < totalBidIds_; ) {
            if (_buyerInfo[i_].entryId == _entryId) {
                allBidsOnNFT_[i_] = _buyerInfo[i_ + 1];
            }

            // An array can't have a total length
            // larger than the max uint256 value.
            unchecked {
                ++i_;
            }
        }
    }

    function getUserNFTsOpenForSale(address user_)
        public
        view
        returns (SellerInfo[] memory userNFTsOpenForSale_)
    {
        uint256 totalEntryIds_ = getTotalEntryIds();
        userNFTsOpenForSale_ = new SellerInfo[](totalEntryIds_);

        // Storing this outside the loop saves gas per iteration.
        SellerInfo memory sellerInfo_;

        for (uint256 i_ = 0; i_ < totalEntryIds_; ) {
            sellerInfo_ = _sellerInfo[i_ + 1];

            if (sellerInfo_.onSale && sellerInfo_.sellerAddress == user_) {
                userNFTsOpenForSale_[i_] = sellerInfo_;
            }

            // An array can't have a total length
            // larger than the max uint256 value.
            unchecked {
                ++i_;
            }
        }
    }

    // some additional getters for front-end end

    function isEntryIdValid(uint256 entryId_) public view returns (bool isValid_) {
        require(isValid_ = (_sellerInfo[entryId_].sellerAddress != address(0)), "INVALID_ENTRY_ID");
    }

    function isBidIdValid(uint256 bidId_) public view returns (bool isValid_) {
        require(isValid_ = (_buyerInfo[bidId_].buyerAddress != address(0)), "INVALID_BID_ID");
    }

    function getSellerInfo(uint256 entryId_) public view returns (SellerInfo memory) {
        isEntryIdValid(entryId_);
        return _sellerInfo[entryId_];
    }

    function getBuyerInfo(uint256 bidId_) public view returns (BuyerInfo memory) {
        isBidIdValid(bidId_);
        return _buyerInfo[bidId_];
    }

    function getTotalEntryIds() public view returns (uint256) {
        return _entryIdTracker.current();
    }

    function getTotalBidIds() public view returns (uint256) {
        return _bidIdTracker.current();
    }

    function getDownPaymentAmount(uint256 bidId_) public view returns (uint256) {
        isBidIdValid(bidId_);

        BuyerInfo memory buyerInfo_ = _buyerInfo[bidId_];

        require(buyerInfo_.pricePaid == 0, "DOWN_PAYMENT_DONE");

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

    function getInstallmentAmountPerMonth(uint256 entryId_) public view returns (uint256) {
        isEntryIdValid(entryId_);
        SellerInfo memory sellerInfo_ = _sellerInfo[entryId_];

        uint256 bidId_ = sellerInfo_.selectedBidId;
        isBidIdValid(bidId_);

        BuyerInfo memory buyerInfo_ = _buyerInfo[bidId_];

        InstallmentPlan installment_ = buyerInfo_.bidInstallment;

        if (buyerInfo_.bidPrice == buyerInfo_.pricePaid) {
            return 0;
        }

        if (installment_ == InstallmentPlan.ThreeMonths) {
            return (buyerInfo_.bidPrice * 33) / 100; // 33%
        } else if (installment_ == InstallmentPlan.SixMonths) {
            return (buyerInfo_.bidPrice * 165) / 1000; // 16.5%
        } else if (installment_ == InstallmentPlan.NineMonths) {
            return (buyerInfo_.bidPrice * 11) / 100; // 11%
        } else {
            return 0; // InstallmentPlan.None
        }
    }

    // get installment amount of specific installment number
    function getInstallmentAmountOf(
        uint256 entryId_,
        uint256 bidId_,
        uint256 installmentNumber_
    ) public view returns (uint256) {
        // if first installment number is 1 then it means it's downpayment
        if (installmentNumber_ == 1) {
            return getDownPaymentAmount(bidId_);
        }

        return installmentNumber_ * getInstallmentAmountPerMonth(entryId_);
    }

    function getInstallmentMonthTimestamp(uint256 bidId_, uint64 installmentNumber_)
        public
        view
        returns (uint64)
    {
        return _buyerInfo[bidId_].timestamp + ((installmentNumber_ - 1) * ONE_MONTH);
    }

    function sell(
        address contractAddress_,
        uint256 tokenId_,
        uint256 sellingPrice_,
        InstallmentPlan installment_
    ) public returns (uint256) {
        require(sellingPrice_ != 0, "INVALID_PRICE");

        uint64 blockTimestamp_ = uint64(block.timestamp);

        // create unique entryId
        _entryIdTracker.increment();
        uint256 entryId_ = _entryIdTracker.current();

        // transfer NFT to this contract
        IERC721(contractAddress_).safeTransferFrom(_msgSender(), address(this), tokenId_);

        // update mapping
        _sellerInfo[entryId_].onSale = true;
        _sellerInfo[entryId_].sellerAddress = _msgSender();
        _sellerInfo[entryId_].contractAddress = contractAddress_;
        _sellerInfo[entryId_].timestamp = blockTimestamp_;
        _sellerInfo[entryId_].tokenId = tokenId_;
        _sellerInfo[entryId_].sellingPrice = sellingPrice_;
        _sellerInfo[entryId_].installment = installment_;

        emit Sell(_msgSender(), contractAddress_, tokenId_, entryId_, blockTimestamp_);
        return entryId_;
    }

    function bid(
        uint256 entryId_,
        uint256 bidPrice_,
        InstallmentPlan installment_
    ) public payable returns (uint256) {
        isEntryIdValid(entryId_);

        uint256 value_ = msg.value;
        uint64 blockTimestamp_ = uint64(block.timestamp);

        require(
            blockTimestamp_ <= _sellerInfo[entryId_].timestamp + biddingPeriod,
            "BIDDING_PERIOD_OVER"
        );

        // create unique bidId
        _bidIdTracker.increment();
        uint256 bidId_ = _bidIdTracker.current();

        // update buyer info mapping
        _buyerInfo[bidId_].buyerAddress = _msgSender();
        _buyerInfo[bidId_].bidInstallment = installment_;
        _buyerInfo[bidId_].timestamp = blockTimestamp_;
        _buyerInfo[bidId_].bidPrice = bidPrice_;
        _buyerInfo[bidId_].entryId = entryId_;

        // update total bids for this entry id
        _sellerInfo[entryId_].totalBids += 1;

        uint256 downPayment_ = getDownPaymentAmount(bidId_);

        require(value_ != 0 && value_ == downPayment_, "VALUE_NOT_EQUAL_TO_DOWN_PAYMENT");

        // update price paid
        _buyerInfo[bidId_].pricePaid = value_;

        emit Bid(_msgSender(), entryId_, bidId_, blockTimestamp_);

        return bidId_;
    }

    function selectBid(uint256 bidId_) public {
        uint64 blockTimestamp_ = uint64(block.timestamp);
        isBidIdValid(bidId_);

        uint256 entryId_ = _buyerInfo[bidId_].entryId;
        isEntryIdValid(entryId_);

        SellerInfo memory sellerInfo_ = _sellerInfo[entryId_];
        BuyerInfo memory buyerInfo_ = _buyerInfo[bidId_];

        require(_msgSender() == sellerInfo_.sellerAddress, "CALLER_NOT_SELLER");
        require(
            blockTimestamp_ >= sellerInfo_.timestamp + biddingPeriod,
            "BIDDING_PERIOD_NOT_OVER"
        );
        require(sellerInfo_.selectedBidId == 0, "CANNOT_RESELECT_BID");

        // if installment plan is none so transfer the nft on selection of bid
        if (buyerInfo_.bidInstallment == InstallmentPlan.None) {
            IERC721(sellerInfo_.contractAddress).safeTransferFrom(
                address(this),
                buyerInfo_.buyerAddress,
                sellerInfo_.tokenId
            );

            // delete seller
            delete _sellerInfo[entryId_];
            // delete bid
            delete _buyerInfo[bidId_];
        } else {
            // update buyer info
            _buyerInfo[bidId_].isSelected = true;
            _buyerInfo[bidId_].timestamp = blockTimestamp_;

            // make NFT onSale off and set selected bidId
            _sellerInfo[entryId_].onSale = false;
            _sellerInfo[entryId_].selectedBidId = bidId_;

            _sellerInfo[entryId_].installment = buyerInfo_.bidInstallment;
            _sellerInfo[entryId_].sellingPrice = buyerInfo_.bidPrice;
            _sellerInfo[entryId_].installmentsPaid = 1;
        }

        emit BidSelected(bidId_, entryId_);
    }

    function payInstallment(uint256 entryId_) public payable {
        uint256 value_ = msg.value;

        isEntryIdValid(entryId_);

        uint256 bidId_ = _sellerInfo[entryId_].selectedBidId;
        isBidIdValid(bidId_);

        BuyerInfo memory buyerInfo_ = _buyerInfo[bidId_];

        require(buyerInfo_.buyerAddress == _msgSender(), "CALLER_NOT_BUYER");

        uint256 bidPrice_ = buyerInfo_.bidPrice;
        uint256 pricePaid_ = buyerInfo_.pricePaid;

        if (bidPrice_ != pricePaid_) {
            uint256 installmentPayment_ = getInstallmentAmountPerMonth(entryId_);

            require(installmentPayment_ == value_ && value_ != 0, "INVALID_INSTALLMENT_VALUE");

            _buyerInfo[bidId_].pricePaid += value_;
            _sellerInfo[entryId_].installmentsPaid++;
        }

        // all installments done so transfer NFT to buyer
        if (bidPrice_ == pricePaid_) {
            IERC721(_sellerInfo[entryId_].contractAddress).safeTransferFrom(
                address(this),
                _msgSender(),
                _sellerInfo[entryId_].tokenId
            );

            // delete seller
            delete _sellerInfo[entryId_];
            // delete bid
            delete _buyerInfo[bidId_];
        }
    }

    function withdrawBid(uint256 bidId_) public {
        isBidIdValid(bidId_);

        BuyerInfo memory buyerInfo_ = _buyerInfo[bidId_];

        uint256 entryId_ = buyerInfo_.entryId;

        require(
            uint64(block.timestamp) >= _sellerInfo[entryId_].timestamp + biddingPeriod,
            "BIDDING_PERIOD_NOT_OVER"
        );
        require(!buyerInfo_.isSelected, "BIDDER_SHOULD_NOT_BE_SELECTED");
        require(_msgSender() == buyerInfo_.buyerAddress, "CALLER_NOT_BUYER");

        // delete bid
        delete _buyerInfo[bidId_];

        // return the price paid
        Address.sendValue(payable(buyerInfo_.buyerAddress), buyerInfo_.pricePaid);
    }

    function withdrawPayment(uint256 entryId_) public {
        isEntryIdValid(entryId_);
        SellerInfo memory sellerInfo_ = _sellerInfo[entryId_];
        isBidIdValid(sellerInfo_.selectedBidId);

        require(_msgSender() == sellerInfo_.sellerAddress, "CALLER_NOT_SELLER");
        require(sellerInfo_.paymentsClaimed != 0, "NO_PAYMENT_AVAILABLE");

        uint8 secondLastInstallmentPaid_ = sellerInfo_.installmentsPaid - 1;

        // payments claimed should be one less than installmentsPaid
        // no other check required as installmentsPaid will increase after a month
        require(
            sellerInfo_.paymentsClaimed == secondLastInstallmentPaid_,
            "CANNOT_RECLAIM_PAYMENT"
        );

        // if installmentsPaid is 5 that means payments of 5 months is done
        // so unlock payment of 4 to seller
        uint256 secondLastInstallmentAmount_ = getInstallmentAmountOf(
            entryId_,
            sellerInfo_.selectedBidId,
            secondLastInstallmentPaid_
        );

        // update paymentsClaimed
        _sellerInfo[entryId_].paymentsClaimed++;

        // transfer amount to seller
        Address.sendValue(payable(sellerInfo_.sellerAddress), secondLastInstallmentAmount_);
    }

    function liquidate(uint256 entryId_) public payable {
        uint256 value_ = msg.value;

        isEntryIdValid(entryId_);
        SellerInfo memory sellerInfo_ = _sellerInfo[entryId_];

        uint256 bidId_ = sellerInfo_.selectedBidId;
        isBidIdValid(bidId_);
        BuyerInfo memory buyerInfo_ = _buyerInfo[bidId_];

        uint256 installmentPerMonth_ = getInstallmentAmountPerMonth(entryId_);

        // None or Installments paid
        require(
            installmentPerMonth_ != 0 || (buyerInfo_.bidPrice == buyerInfo_.pricePaid),
            "NO_INSTALLMENT_LEFT"
        );

        // get timestamp of next payment
        uint256 installmentMonthTimestamp_ = getInstallmentMonthTimestamp(
            bidId_,
            sellerInfo_.installmentsPaid + 1
        );

        // if timestamp of next payment + gracePeriod is passed then liquidate otherwise stop execution
        require(
            uint64(block.timestamp) > (installmentMonthTimestamp_ + gracePeriod),
            "INSTALLMENT_ON_TRACK"
        );

        address oldbuyer_ = buyerInfo_.buyerAddress;
        uint256 priceToBePaidByLiquidator_ = (buyerInfo_.pricePaid * 95) / 100;

        require(priceToBePaidByLiquidator_ == value_, "INVALID_LIQUIDATION_VALUE");

        // update new buyer
        _buyerInfo[bidId_].buyerAddress = _msgSender();

        // transfer 95% of pricePaid to old buyer
        Address.sendValue(payable(oldbuyer_), priceToBePaidByLiquidator_);
    }

    function setBiddingPeriod(uint64 biddingPeriod_) public onlyOwner {
        require(biddingPeriod_ != 0, "INVALID_BIDDING_PERIOD");
        biddingPeriod = biddingPeriod_;
    }

    function setGracePeriod(uint64 gracePeriod_) public onlyOwner {
        require(gracePeriod_ != 0, "INVALID_GRACE_PERIOD");
        gracePeriod = gracePeriod_;
    }
}
