// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

contract LPTimelock {
    address public owner;
    IERC20 public immutable lp;
    uint256 public immutable unlockTime;

    constructor(address _lp, uint256 _unlockTime) {
        owner = msg.sender;
        lp = IERC20(_lp);
        unlockTime = _unlockTime;
    }

    function deposit(uint256 amount) external {
        require(msg.sender == owner, "not owner");
        require(lp.transferFrom(msg.sender, address(this), amount), "transferFrom failed");
    }

    function withdraw() external {
        require(msg.sender == owner, "not owner");
        require(block.timestamp >= unlockTime, "locked");
        uint256 bal = lp.balanceOf(address(this));
        require(lp.transfer(owner, bal), "transfer failed");
    }
}
