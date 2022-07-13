// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@rari-capital/solmate/src/auth/Owned.sol";
import "../ERC4907/ERC4907.sol";
import "./IWNFT.sol";

contract WNFT is IWNFT, Owned, ERC4907 {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdTracker;

    event WNFTCreated(uint256 indexed tokenId, address indexed user, string tokenURI);
    event WNFTBurned(uint256 indexed tokenId);

    constructor(
        address owner_,
        string memory name_,
        string memory symbol_
    ) Owned(owner_) ERC4907(name_, symbol_) {}

    /// @inheritdoc IWNFT
    function create(
        address user_,
        uint64 expires_,
        string memory tokenURI_
    ) external override onlyOwner returns (uint256) {
        _tokenIdTracker.increment();
        uint256 tokenId_ = _tokenIdTracker.current();

        // mint WNFT to user
        _mint(user_, tokenId_);
        _setTokenURI(tokenId_, tokenURI_);

        // update ERC4907
        setUser(tokenId_, user_, expires_);

        emit WNFTCreated(tokenId_, user_, tokenURI_);

        return tokenId_;
    }

    /// @inheritdoc IWNFT
    function burn(uint256 tokenId_) external override onlyOwner {
        require(block.timestamp >= userExpires(tokenId_), "WNFT: Cannot burn before expires");
        _burn(tokenId_);

        emit WNFTBurned(tokenId_);
    }

    /// @inheritdoc ERC4907
    function setUser(
        uint256 tokenId,
        address user,
        uint64 expires
    ) public virtual override(ERC4907) onlyOwner {
        super.setUser(tokenId, user, expires);
    }

    /// @dev See {ERC721-_baseURI}.
    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://";
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC4907) {
        super._beforeTokenTransfer(from, to, tokenId);

        require(from == address(0) || to == address(0), "WNFT: Not allowed to transfer token");
    }
}
