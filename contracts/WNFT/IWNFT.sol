// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

interface IWNFT {
    /// @notice creates a new nft and transfers to `user_`
    /// @dev setUser, mint and setTokenURI of new tokenId for `user_`
    /// @param user_ user address
    /// @param expires_ timestamp when the rent expires and token to be burned
    /// @param tokenURI_ metadata uri of token
    /// @return tokenId
    function create(
        address user_,
        uint64 expires_,
        string memory tokenURI_
    ) external returns (uint256);

    /// @notice burns tokenId
    /// @dev cleares all data associated to this tokenId
    /// @param tokenId_ tokenId to be burned
    function burn(uint256 tokenId_) external;
}
