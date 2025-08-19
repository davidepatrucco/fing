// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFIACoin {
    function protectedTransfer(address to, uint256 amount, uint256 nonce) external returns (bool);
}

contract TestCaller {
    // Calls protectedTransfer twice; swallows the revert from the second call
    function callTwo(address token, address to1, uint256 amount1, uint256 nonce1, address to2, uint256 amount2, uint256 nonce2) external returns (bool, bool) {
        bool ok1 = false;
        bool ok2 = false;
        try IFIACoin(token).protectedTransfer(to1, amount1, nonce1) returns (bool res1) {
            ok1 = res1;
        } catch {
            ok1 = false;
        }
        try IFIACoin(token).protectedTransfer(to2, amount2, nonce2) returns (bool res2) {
            ok2 = res2;
        } catch {
            ok2 = false;
        }
        return (ok1, ok2);
    }
}
