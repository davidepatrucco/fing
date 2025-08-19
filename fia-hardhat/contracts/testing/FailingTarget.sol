// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FailingTarget {
    function doSomething() external pure {
        // does nothing
    }

    function willRevert() external pure {
        revert("Target failed");
    }
}
