// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "./WNFT/IWNFT.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@rari-capital/solmate/src/auth/Owned.sol";

contract ProjectY is Context, Owned, ERC721Holder {
    using Counters for Counters.Counter;

    Counters.Counter private _entryIdTracker;
    Counters.Counter private _bidIdTracker;

    uint256 public constant NFT_LOCKING_PERIOD = 90 days;
    uint256 public constant ETH_LOCKING_PERIOD = 30 days;
    uint256 public constant BIDDING_PERIOD = 7 days;

    IWNFT public immutable wnft;

    event NFTLocked(
        address indexed seller,
        address indexed contractAddress,
        uint256 indexed tokenId,
        uint64 timestamp
    );

    event Bid(
        address indexed buyer,
        uint256 indexed entryId,
        uint256 indexed bidId,
        uint64 timestamp
    );

    struct SellerInfo {
        bool onSale;
        address sellerAddress;
        address contractAddress;
        uint64 timestamp;
        uint256 tokenId;
        uint256 howMuchToSell;
    }
    // entryId -> SellerInfo
    mapping(uint256 => SellerInfo) internal _sellerInfo;

    struct BuyerInfo {
        bool isSelected;
        address buyerAddress;
        uint64 timestamp;
        uint256 bidPrice;
        uint256 entryId;
        uint256 pricePaid; // initially 34% of bidPrice
    }
    // bidId -> BuyerInfo
    mapping(uint256 => BuyerInfo) internal _buyerInfo;

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

    function lockNFT(
        address contractAddress_,
        uint256 howMuchToSell_,
        uint256 tokenId_
    ) public {
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
            howMuchToSell: howMuchToSell_
        });

        emit NFTLocked(_msgSender(), contractAddress_, tokenId_, blockTimestamp_);
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
            pricePaid: value_
        });

        emit Bid(_msgSender(), entryId_, bidId_, blockTimestamp_);
    }
}
