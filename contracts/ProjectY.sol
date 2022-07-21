// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@rari-capital/solmate/src/auth/Owned.sol";

contract ProjectY is Context, Owned, ERC721Holder {
    using Counters for Counters.Counter;

    Counters.Counter private _entryIdTracker;
    Counters.Counter private _bidIdTracker;

    uint64 public constant ONE_MONTH = 30 days;

    uint64 public biddingPeriod = 7 days;

    enum InstallmentPlan {
        None, // no installment
        ThreeMonths,
        SixMonths,
        NineMonths
    }

    enum InstallmentPhase {
        None,
        First,
        Second,
        Third,
        Fourth,
        Fifth,
        Sixth,
        Seventh,
        Eighth,
        Ninth
    }

    struct SellerInfo {
        bool onSale;
        address sellerAddress;
        address contractAddress;
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
    mapping(uint256 => BuyerInfo) public _buyerInfo;

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

    function sellerOnSale(uint256 entryId_) public view returns (bool) {
        isEntryIdValid(entryId_);
        return _sellerInfo[entryId_].onSale;
    }

    function sellerAddress(uint256 entryId_) public view returns (address) {
        isEntryIdValid(entryId_);
        return _sellerInfo[entryId_].sellerAddress;
    }

    function sellerContractAddress(uint256 entryId_) public view returns (address) {
        isEntryIdValid(entryId_);
        return _sellerInfo[entryId_].contractAddress;
    }

    function sellerTimestamp(uint256 entryId_) public view returns (uint64) {
        isEntryIdValid(entryId_);
        return _sellerInfo[entryId_].timestamp;
    }

    function sellerTokenId(uint256 entryId_) public view returns (uint256) {
        isEntryIdValid(entryId_);
        return _sellerInfo[entryId_].tokenId;
    }

    function sellerSellingPrice(uint256 entryId_) public view returns (uint256) {
        isEntryIdValid(entryId_);
        return _sellerInfo[entryId_].sellingPrice;
    }

    function sellerTotalBids(uint256 entryId_) public view returns (uint256) {
        isEntryIdValid(entryId_);
        return _sellerInfo[entryId_].totalBids;
    }

    function sellerSelectedBidId(uint256 entryId_) public view returns (uint256) {
        isEntryIdValid(entryId_);
        return _sellerInfo[entryId_].selectedBidId;
    }

    function sellerInstallment(uint256 entryId_) public view returns (InstallmentPlan) {
        isEntryIdValid(entryId_);
        return _sellerInfo[entryId_].installment;
    }

    function buyerIsSelected(uint256 bidId_) public view returns (bool) {
        isBidIdValid(bidId_);
        return _buyerInfo[bidId_].isSelected;
    }

    function buyerAddress(uint256 bidId_) public view returns (address) {
        isBidIdValid(bidId_);
        return _buyerInfo[bidId_].buyerAddress;
    }

    function buyerTimestamp(uint256 bidId_) public view returns (uint64) {
        isBidIdValid(bidId_);
        return _buyerInfo[bidId_].timestamp;
    }

    function buyerBidPrice(uint256 bidId_) public view returns (uint256) {
        isBidIdValid(bidId_);
        return _buyerInfo[bidId_].bidPrice;
    }

    function buyerEntryId(uint256 bidId_) public view returns (uint256) {
        isBidIdValid(bidId_);
        return _buyerInfo[bidId_].entryId;
    }

    function buyerPricePaid(uint256 bidId_) public view returns (uint256) {
        isBidIdValid(bidId_);
        return _buyerInfo[bidId_].pricePaid;
    }

    function buyerBidInstallment(uint256 bidId_) public view returns (InstallmentPlan) {
        isBidIdValid(bidId_);
        return _buyerInfo[bidId_].bidInstallment;
    }

    function totalEntryIds() public view returns (uint256) {
        return _entryIdTracker.current();
    }

    function totalBidIds() public view returns (uint256) {
        return _bidIdTracker.current();
    }

    function isEntryIdValid(uint256 entryId_) public view returns (bool isValid_) {
        require(
            isValid_ = (_sellerInfo[entryId_].sellerAddress != address(0)),
            "ProjectY: Invalid entryId"
        );
    }

    function isBidIdValid(uint256 bidId_) public view returns (bool isValid_) {
        require(
            isValid_ = (_buyerInfo[bidId_].buyerAddress != address(0)),
            "ProjectY: Invalid bidId"
        );
    }

    function sell(
        address contractAddress_,
        uint256 tokenId_,
        uint256 sellingPrice_,
        InstallmentPlan installment_
    ) public returns (uint256) {
        require(sellingPrice_ != 0, "ProjectY: Invalid Price");

        uint64 blockTimestamp_ = uint64(block.timestamp);

        // create unique entryId
        _entryIdTracker.increment();
        uint256 entryId_ = _entryIdTracker.current();

        // transfer NFT to this contract
        IERC721(contractAddress_).safeTransferFrom(_msgSender(), address(this), tokenId_);

        // update mapping
        _sellerInfo[entryId_] = SellerInfo({
            onSale: true,
            sellerAddress: _msgSender(),
            contractAddress: contractAddress_,
            timestamp: blockTimestamp_,
            tokenId: tokenId_,
            sellingPrice: sellingPrice_,
            totalBids: 0,
            selectedBidId: 0,
            installment: installment_
        });

        emit Sell(_msgSender(), contractAddress_, tokenId_, entryId_, blockTimestamp_);
        return entryId_;
    }

    function bid(
        uint256 entryId_,
        uint256 bidPrice_,
        InstallmentPlan installment_
    ) public payable returns (uint256) {
        uint256 value_ = msg.value;
        uint64 blockTimestamp_ = uint64(block.timestamp);

        // create unique bidId
        _bidIdTracker.increment();
        uint256 bidId_ = _bidIdTracker.current();

        _buyerInfo[bidId_].buyerAddress = _msgSender();

        uint256 downPayment_ = downPayment(entryId_, bidId_);

        require(
            value_ != 0 && value_ == downPayment_,
            "ProjectY: value must be equal to down payment"
        );

        require(
            blockTimestamp_ <= _sellerInfo[entryId_].timestamp + biddingPeriod,
            "ProjectY: Bidding period over"
        );

        _buyerInfo[bidId_] = BuyerInfo({
            isSelected: false,
            buyerAddress: _msgSender(),
            timestamp: blockTimestamp_,
            bidPrice: bidPrice_,
            entryId: entryId_,
            pricePaid: value_,
            bidInstallment: installment_
        });

        _sellerInfo[entryId_].totalBids += 1;

        emit Bid(_msgSender(), entryId_, bidId_, blockTimestamp_);
        return bidId_;
    }

    function selectBid(uint256 bidId_) public {
        uint64 blockTimestamp_ = uint64(block.timestamp);
        isBidIdValid(bidId_);
        uint256 entryId_ = _buyerInfo[bidId_].entryId;
        isEntryIdValid(entryId_);

        require(
            _msgSender() == _sellerInfo[entryId_].sellerAddress,
            "ProjectY: Caller must be seller"
        );

        require(
            blockTimestamp_ >= _sellerInfo[entryId_].timestamp + biddingPeriod,
            "ProjectY: Bidding period not over"
        );

        // update buyer info
        _buyerInfo[bidId_].isSelected = true;
        _buyerInfo[bidId_].timestamp = blockTimestamp_;

        // make NFT onSale off and set selected bidId
        _sellerInfo[entryId_].onSale = false;
        _sellerInfo[entryId_].selectedBidId = bidId_;

        _sellerInfo[entryId_].installment = _buyerInfo[bidId_].bidInstallment;
        _sellerInfo[entryId_].sellingPrice = _buyerInfo[bidId_].bidPrice;

        emit BidSelected(bidId_, entryId_);
    }

    function downPayment(uint256 entryId_, uint256 bidId_) public view returns (uint256) {
        isEntryIdValid(entryId_);
        isBidIdValid(bidId_);

        BuyerInfo memory buyerInfo_ = _buyerInfo[bidId_];

        require(buyerInfo_.pricePaid == 0, "ProjectY: Down payment done");

        InstallmentPlan installment_ = buyerInfo_.bidInstallment;
        uint256 bidPrice_ = buyerInfo_.bidPrice;

        if (installment_ == InstallmentPlan.ThreeMonths) {
            return (bidPrice_ * 34) / 100; // 34%
        } else if (installment_ == InstallmentPlan.SixMonths) {
            return (bidPrice_ * 175) / 1000; // 17.5%
        } else if (installment_ == InstallmentPlan.NineMonths) {
            return (bidPrice_ * 12) / 100; // 12%
        } else {
            return bidPrice_;
        }
    }

    function currentInstallmentToBePaid(uint256 entryId_) public view returns (uint256) {
        isEntryIdValid(entryId_);
        SellerInfo memory sellerInfo_ = _sellerInfo[entryId_];

        uint256 bidId_ = sellerInfo_.selectedBidId;
        isBidIdValid(bidId_);

        BuyerInfo memory buyerInfo_ = _buyerInfo[bidId_];

        if (buyerInfo_.bidPrice == buyerInfo_.pricePaid) {
            return 0;
        }

        InstallmentPlan installment_ = buyerInfo_.bidInstallment;
        uint256 bidPrice_ = buyerInfo_.bidPrice;

        if (installment_ == InstallmentPlan.ThreeMonths) {
            return (bidPrice_ * 33) / 100; // 33%
        } else if (installment_ == InstallmentPlan.SixMonths) {
            return (bidPrice_ * 165) / 1000; // 16.5%
        } else if (installment_ == InstallmentPlan.NineMonths) {
            return (bidPrice_ * 11) / 100; // 11%
        } else {
            return 0; // InstallmentPlan.None
        }
    }

    function getInstallmentPhase(uint256 bidId_) public view returns (InstallmentPhase) {
        // assuming no revert

        uint64 blockTimestamp_ = uint64(block.timestamp);
        uint64 firstMonthTimestamp_ = _buyerInfo[bidId_].timestamp;
        InstallmentPlan installment_ = _buyerInfo[bidId_].bidInstallment;

        uint256 secondMonthTimestamp_ = firstMonthTimestamp_ + ONE_MONTH;
        uint256 thirdMonthTimestamp_ = firstMonthTimestamp_ + (2 * ONE_MONTH);
        uint256 fourthMonthTimestamp_ = firstMonthTimestamp_ + (3 * ONE_MONTH);
        uint256 fifthMonthTimestamp_ = firstMonthTimestamp_ + (4 * ONE_MONTH);
        uint256 sixthMonthTimestamp_ = firstMonthTimestamp_ + (5 * ONE_MONTH);
        uint256 seventhMonthTimestamp_ = firstMonthTimestamp_ + (6 * ONE_MONTH);
        uint256 eighthMonthTimestamp_ = firstMonthTimestamp_ + (7 * ONE_MONTH);
        uint256 ninthMonthTimestamp_ = firstMonthTimestamp_ + (8 * ONE_MONTH);

        if (installment_ == InstallmentPlan.ThreeMonths) {
            if (blockTimestamp_ > thirdMonthTimestamp_) {
                return InstallmentPhase.Third;
            }

            if (blockTimestamp_ > secondMonthTimestamp_) {
                return InstallmentPhase.Second;
            }

            if (blockTimestamp_ > firstMonthTimestamp_) {
                return InstallmentPhase.First;
            }
        } else if (installment_ == InstallmentPlan.SixMonths) {
            if (blockTimestamp_ > sixthMonthTimestamp_) {
                return InstallmentPhase.Sixth;
            }

            if (blockTimestamp_ > fifthMonthTimestamp_) {
                return InstallmentPhase.Fifth;
            }

            if (blockTimestamp_ > fourthMonthTimestamp_) {
                return InstallmentPhase.Fourth;
            }

            if (blockTimestamp_ > thirdMonthTimestamp_) {
                return InstallmentPhase.Third;
            }

            if (blockTimestamp_ > secondMonthTimestamp_) {
                return InstallmentPhase.Second;
            }

            if (blockTimestamp_ > firstMonthTimestamp_) {
                return InstallmentPhase.First;
            }
        } else if (installment_ == InstallmentPlan.NineMonths) {
            if (blockTimestamp_ > ninthMonthTimestamp_) {
                return InstallmentPhase.Ninth;
            }

            if (blockTimestamp_ > eighthMonthTimestamp_) {
                return InstallmentPhase.Eighth;
            }

            if (blockTimestamp_ > seventhMonthTimestamp_) {
                return InstallmentPhase.Seventh;
            }

            if (blockTimestamp_ > sixthMonthTimestamp_) {
                return InstallmentPhase.Sixth;
            }

            if (blockTimestamp_ > fifthMonthTimestamp_) {
                return InstallmentPhase.Fifth;
            }

            if (blockTimestamp_ > fourthMonthTimestamp_) {
                return InstallmentPhase.Fourth;
            }

            if (blockTimestamp_ > thirdMonthTimestamp_) {
                return InstallmentPhase.Third;
            }

            if (blockTimestamp_ > secondMonthTimestamp_) {
                return InstallmentPhase.Second;
            }

            if (blockTimestamp_ > firstMonthTimestamp_) {
                return InstallmentPhase.First;
            }
        }

        return InstallmentPhase.None;
    }

    function payInstallment(uint256 entryId_) public payable {
        uint256 value_ = msg.value;

        isEntryIdValid(entryId_);

        uint256 bidId_ = _sellerInfo[entryId_].selectedBidId;
        require(bidId_ != 0, "ProjectY: BidId not selected");

        BuyerInfo memory buyerInfo_ = _buyerInfo[bidId_];

        require(buyerInfo_.buyerAddress == _msgSender(), "ProjectY: Buyer must be caller");

        uint256 bidPrice_ = buyerInfo_.bidPrice;
        uint256 pricePaid_ = buyerInfo_.pricePaid;

        require(pricePaid_ != bidPrice_, "ProjectY: installment complete");

        uint256 installmentPayment_ = currentInstallmentToBePaid(entryId_);

        require(
            installmentPayment_ == value_ && value_ != 0 && installmentPayment_ != 0,
            "ProjectY: value must be equal to installment payment and non-zero"
        );

        _buyerInfo[bidId_].pricePaid += value_;

        // all installments done so transfer NFT to buyer
        if (_buyerInfo[bidId_].bidPrice == _buyerInfo[bidId_].pricePaid) {
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
        address buyer_ = buyerInfo_.buyerAddress;
        uint256 pricePaid_ = buyerInfo_.pricePaid;

        require(
            uint64(block.timestamp) >= _sellerInfo[entryId_].timestamp + biddingPeriod,
            "ProjectY: Bidding period not over"
        );

        require(!buyerInfo_.isSelected, "ProjectY: Bidder should not be selected");

        // delete bid
        delete _buyerInfo[bidId_];

        // return the price paid
        Address.sendValue(payable(buyer_), pricePaid_);
    }

    function getPaymentOfPhase(
        uint256 entryId_,
        uint256 bidId_,
        InstallmentPhase installmentPhase_
    ) public view returns (uint256) {
        return
            downPayment(entryId_, bidId_) +
            (uint256(installmentPhase_) * currentInstallmentToBePaid(entryId_));
    }

    function liquidate(uint256 entryId_) public payable {
        uint256 value_ = msg.value;

        isEntryIdValid(entryId_);
        SellerInfo memory sellerInfo_ = _sellerInfo[entryId_];

        uint256 bidId_ = sellerInfo_.selectedBidId;
        isBidIdValid(bidId_);
        BuyerInfo memory buyerInfo_ = _buyerInfo[bidId_];

        InstallmentPhase installmentPhase_ = getInstallmentPhase(bidId_);
        address oldbuyer_ = buyerInfo_.buyerAddress;
        uint256 priceToBePaidByLiquidator_ = (buyerInfo_.pricePaid * 95) / 100;
        uint256 currentInstallmentToBePaid_ = currentInstallmentToBePaid(entryId_);

        // second phase me agr second payment done nhi he
        uint256 paymentOfPhase_ = getPaymentOfPhase(entryId_, bidId_, installmentPhase_);

        require(paymentOfPhase_ != buyerInfo_.pricePaid, "ProjectY: Phase price paid");

        require(
            currentInstallmentToBePaid_ != 0,
            "ProjectY: no liquidate opportunity as no installment left"
        );

        require(
            priceToBePaidByLiquidator_ == value_,
            "ProjectY: value must be equal to 95% pricePaid by old buyer"
        );

        // update new buyer
        _buyerInfo[bidId_].buyerAddress = _msgSender();

        // transfer 95% of pricePaid to old buyer
        Address.sendValue(payable(oldbuyer_), priceToBePaidByLiquidator_);
    }

    function setBiddingPeriod(uint64 biddingPeriod_) public onlyOwner {
        require(biddingPeriod_ != 0, "ProjectY: Invalid bidding period");
        biddingPeriod = biddingPeriod_;
    }
}
