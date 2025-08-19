// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC721 {
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract NFTTimelock {
    address public owner;
    IERC721 public immutable nft;
    uint256 public immutable tokenId;
    uint256 public immutable unlockTime;

    constructor(address _nft, uint256 _tokenId, uint256 _unlockTime) {
        owner = msg.sender;
        nft = IERC721(_nft);
        tokenId = _tokenId;
        unlockTime = _unlockTime;
    }

    function withdraw() external {
        require(msg.sender == owner, "not owner");
        require(block.timestamp >= unlockTime, "locked");
        nft.safeTransferFrom(address(this), owner, tokenId);
    }
}
