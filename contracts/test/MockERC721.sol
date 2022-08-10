// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockERC721 is ERC721 {
    uint256 public totalSupply;

    constructor() ERC721("Mock ERC721", "MERC721") {
        // solhint-disable-previous-line no-empty-blocks
    }

    function mint(address to, uint256 tokenId) public {
        _mint(to, tokenId);
        totalSupply++;
    }

    function burn(uint256 tokenId) public {
        _burn(tokenId);
        totalSupply--;
    }

    function _baseURI() internal pure override returns (string memory) {
        return "https://ikzttp.mypinata.cloud/ipfs/QmQFkLSQysj94s5GvTHPyzTxrawwtjgiiYS2TBLgrvw8CW/";
    }
}
