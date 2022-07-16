// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "./WNFT/IWNFT.sol";
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

    uint64 public constant NFT_LOCKING_PERIOD = 90 days;
    uint64 public constant ONE_MONTH = 30 days;
    uint64 public constant BIDDING_PERIOD = 7 days;

    IWNFT public immutable wnft;

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

    enum InstallmentPhases {
        PhaseOne,
        PhaseTwo,
        PhaseThree
    }

    struct SellerInfo {
        bool onSale;
        address sellerAddress;
        address contractAddress;
        uint64 timestamp;
        uint256 tokenId;
        uint256 howMuchToSell;
        uint256 selectedBidId;
    }
    // entryId -> SellerInfo
    mapping(uint256 => SellerInfo) internal _sellerInfo;

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

    function sellerHowMuchToSell(uint256 entryId_) public view returns (uint256) {
        isEntryIdValid(entryId_);
        return _sellerInfo[entryId_].howMuchToSell;
    }

    function sellerSelectedBidId(uint256 entryId_) public view returns (uint256) {
        isEntryIdValid(entryId_);
        return _sellerInfo[entryId_].selectedBidId;
    }

    struct BuyerInfo {
        bool isSelected;
        address buyerAddress;
        uint64 timestamp;
        uint256 bidPrice;
        uint256 entryId;
        uint256 pricePaid; // initially 34% of bidPrice
        uint256 wnftTokenId;
    }
    // bidId -> BuyerInfo
    mapping(uint256 => BuyerInfo) public _buyerInfo;

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

    function buyerWNFTTokenId(uint256 bidId_) public view returns (uint256) {
        isBidIdValid(bidId_);
        return _buyerInfo[bidId_].wnftTokenId;
    }

    constructor(address owner_, address wnft_) Owned(owner_) {
        wnft = IWNFT(wnft_);
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
        uint256 howMuchToSell_
    ) public returns (uint256) {
        require(howMuchToSell_ != 0, "ProjectY: Invalid Price");

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
            howMuchToSell: howMuchToSell_,
            selectedBidId: 0
        });

        emit Sell(_msgSender(), contractAddress_, tokenId_, entryId_, blockTimestamp_);
        return entryId_;
    }

    function bid(uint256 entryId_, uint256 bidPrice_) public payable {
        uint256 value_ = msg.value;
        uint64 blockTimestamp_ = uint64(block.timestamp);

        isEntryIdValid(entryId_);
        require((bidPrice_ * 34) / 100 == value_, "ProjectY: value must be 34% of BidPrice");

        require(
            blockTimestamp_ <= _sellerInfo[entryId_].timestamp + BIDDING_PERIOD,
            "ProjectY: Bidding period over"
        );

        // create unique bidId
        _bidIdTracker.increment();
        uint256 bidId_ = _bidIdTracker.current();

        _buyerInfo[bidId_] = BuyerInfo({
            isSelected: false,
            buyerAddress: _msgSender(),
            timestamp: blockTimestamp_,
            bidPrice: bidPrice_,
            entryId: entryId_,
            pricePaid: value_,
            wnftTokenId: 0
        });

        emit Bid(_msgSender(), entryId_, bidId_, blockTimestamp_);
    }

    function selectBid(uint256 bidId_, string memory wnftURI_) public {
        uint64 blockTimestamp_ = uint64(block.timestamp);
        uint256 entryId_ = _buyerInfo[bidId_].entryId;

        isBidIdValid(bidId_);
        require(
            blockTimestamp_ >= _sellerInfo[entryId_].timestamp + BIDDING_PERIOD,
            "ProjectY: Bidding period not over"
        );

        // update buyer info
        _buyerInfo[bidId_].isSelected = true;
        _buyerInfo[bidId_].timestamp = blockTimestamp_;

        uint64 expires_ = blockTimestamp_ + NFT_LOCKING_PERIOD;

        // make NFT onSale off and set selected bidId
        _sellerInfo[entryId_].onSale = false;
        _sellerInfo[entryId_].selectedBidId = bidId_;

        // mint WNFT to buyer
        wnft.create(_buyerInfo[bidId_].buyerAddress, expires_, wnftURI_);
    }

    function payInstallment(uint256 entryId_) public payable {
        uint256 value_ = msg.value;
        uint64 blockTimestamp_ = uint64(block.timestamp);

        isEntryIdValid(entryId_);

        uint256 bidId_ = _sellerInfo[entryId_].selectedBidId;
        require(bidId_ != 0, "ProjectY: BidId not selected");

        uint256 bidPrice_ = _buyerInfo[bidId_].bidPrice;
        uint256 pricePaid_ = _buyerInfo[bidId_].pricePaid;

        // time at which 1st installment is done
        uint256 timestampWhenFirstInstallmentIsDone_ = _buyerInfo[bidId_].timestamp;

        // if (
        //     ((bidPrice_ * 34) / 100 == pricePaid_) &&
        //     (blockTimestamp_ > timestampWhenFirstInstallmentIsDone_ &&
        //         blockTimestamp_ <= timestampWhenFirstInstallmentIsDone_ + ONE_MONTH)
        // ) {
        //     // first installment done (34%) and can pay next 33% installment
        //     require((bidPrice_ * 33) / 100 == value_, "ProjectY: value must be 33% of BidPrice");

        //     _buyerInfo[bidId_].pricePaid += value_;
        // }
        require((bidPrice_ * 33) / 100 == value_, "ProjectY: value must be 33% of BidPrice");

        _buyerInfo[bidId_].pricePaid += value_;

        if (
            ((bidPrice_ * 67) / 100 == pricePaid_) &&
            (blockTimestamp_ > timestampWhenFirstInstallmentIsDone_ + ONE_MONTH &&
                blockTimestamp_ <= timestampWhenFirstInstallmentIsDone_ + (2 * ONE_MONTH))
        ) {
            // second installment done (67%) and can pay next 33% installment to complete 100%

            // all installments done so transfer NFT to buyer and burn WNFT
            IERC721(_sellerInfo[entryId_].contractAddress).safeTransferFrom(
                address(this),
                _msgSender(),
                _sellerInfo[entryId_].tokenId
            );
            wnft.burn(_buyerInfo[bidId_].wnftTokenId);
        }
    }

    function slash(uint256 entryId_) public {
        uint64 blockTimestamp_ = uint64(block.timestamp);

        isEntryIdValid(entryId_);

        uint256 bidId_ = _sellerInfo[entryId_].selectedBidId;
        require(bidId_ != 0, "ProjectY: BidId not selected");

        uint256 bidPrice_ = _buyerInfo[bidId_].bidPrice;
        uint256 pricePaid_ = _buyerInfo[bidId_].pricePaid;

        // time at which 1st installment is done
        uint256 timestampWhenFirstInstallmentIsDone_ = _buyerInfo[bidId_].timestamp;

        // one month passed since first payment but second installment (total 67%) still not done only 34% done
        if (
            (blockTimestamp_ >= timestampWhenFirstInstallmentIsDone_ + ONE_MONTH) &&
            // ((bidPrice_ * 67) / 100 != pricePaid_)
            ((bidPrice_ * 34) / 100 == pricePaid_)
        ) {
            // first payment goes to seller
            Address.sendValue(payable(_sellerInfo[entryId_].sellerAddress), (bidPrice_ * 34) / 100);
        }

        // two months passed since first payment but third installment (total 100%) still not done
        if (
            (blockTimestamp_ >= timestampWhenFirstInstallmentIsDone_ + (2 * ONE_MONTH)) &&
            (bidPrice_ != pricePaid_)
        ) {
            // first payment to seller
            Address.sendValue(payable(_sellerInfo[entryId_].sellerAddress), (bidPrice_ * 34) / 100);

            // second payment to buyer
            Address.sendValue(payable(_buyerInfo[bidId_].buyerAddress), (bidPrice_ * 33) / 100);
        }

        // one month passed since first payment but second installment (total 67%) still not done
        // or
        // two months passed since first payment but third installment (total 100%) still not done
        if (
            ((blockTimestamp_ >= timestampWhenFirstInstallmentIsDone_ + ONE_MONTH) &&
                ((bidPrice_ * 34) / 100 == pricePaid_)) ||
            ((blockTimestamp_ > timestampWhenFirstInstallmentIsDone_ + (2 * ONE_MONTH)) &&
                (bidPrice_ != pricePaid_))
        ) {
            // transfer NFT to seller and burn WNFT
            IERC721(_sellerInfo[entryId_].contractAddress).safeTransferFrom(
                address(this),
                _sellerInfo[entryId_].sellerAddress,
                _sellerInfo[entryId_].tokenId
            );
            wnft.burn(_buyerInfo[bidId_].wnftTokenId);
        }
    }

    function withdraw(uint256 entryId_) public {
        uint64 blockTimestamp_ = uint64(block.timestamp);

        isEntryIdValid(entryId_);

        uint256 bidId_ = _sellerInfo[entryId_].selectedBidId;
        require(bidId_ != 0, "ProjectY: BidId not selected");

        uint256 bidPrice_ = _buyerInfo[bidId_].bidPrice;
        uint256 pricePaid_ = _buyerInfo[bidId_].pricePaid;

        // time at which 1st installment is done
        uint256 timestampWhenFirstInstallmentIsDone_ = _buyerInfo[bidId_].timestamp;

        // first month passed and second payment is done
        if (
            (blockTimestamp_ >= timestampWhenFirstInstallmentIsDone_ + ONE_MONTH) &&
            ((bidPrice_ * 67) / 100 == pricePaid_)
        ) {
            // send first payment to seller (always)
            Address.sendValue(payable(_sellerInfo[entryId_].sellerAddress), (bidPrice_ * 34) / 100);
        }

        // two months passed and third/last payment is done
        if (
            (blockTimestamp_ >= timestampWhenFirstInstallmentIsDone_ + (2 * ONE_MONTH)) &&
            (bidPrice_ == pricePaid_)
        ) {
            // send second payment to seller
            Address.sendValue(payable(_sellerInfo[entryId_].sellerAddress), (bidPrice_ * 33) / 100);
        }

        // three months passed and third/last payment is done
        if (
            (blockTimestamp_ >= timestampWhenFirstInstallmentIsDone_ + (3 * ONE_MONTH)) &&
            (bidPrice_ == pricePaid_)
        ) {
            // send third/last payment to seller
            Address.sendValue(payable(_sellerInfo[entryId_].sellerAddress), bidPrice_);
        }
    }

    // blockTimestamp_ >= timestampWhenFirstInstallmentIsDone_ + ONE_MONTH       // release first payment to seller
    // blockTimestamp_ >= timestampWhenFirstInstallmentIsDone_ + (2 * ONE_MONTH) // release second payment to seller
    // blockTimestamp_ >= timestampWhenFirstInstallmentIsDone_ + (3 * ONE_MONTH) // release third payment to seller
}
