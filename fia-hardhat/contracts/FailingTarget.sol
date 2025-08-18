// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FailingTarget {
    bool public called;
    function willRevert() external {
        revert("target revert");
    }
    function doSomething() external payable {
        called = true;
    }
}
