// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFIACoin {
  function stake(uint256 amount, uint256 lockPeriod, bool autoCompound) external;
}

contract ReentrantReceiver {
  address public token;
  address public attacker;

  constructor(address _token) {
    token = _token;
    attacker = msg.sender;
  }

  fallback() external payable {
    // attempt to re-enter token contract
    IFIACoin(token).stake(1, 30 days, false);
  }

  receive() external payable {}
}
