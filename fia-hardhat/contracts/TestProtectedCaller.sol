// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFIA {
    function protectedTransfer(address to, uint256 amount, uint256 nonce) external returns (bool);
}

/**
 * @title TestProtectedCaller
 * @notice Small helper used by tests to deterministically exercise FIACoinV5 anti-MEV checks.
 *
 * Rationale:
 * - Some anti-MEV behaviors are miner-dependent (automine vs manual mining) and flaky.
 * - Calling `protectedTransfer` twice from a single external transaction forces the contract
 *   to perform both calls within the same block context, producing deterministic reverts for
 *   same-block protection.
 *
 * Additional helper `reuseNonceInOneTx` allows testing nonce-reuse detection when the same
 * nonce is supplied twice inside one transaction.
 */
contract TestProtectedCaller {
    /// Call protectedTransfer twice with two (possibly different) nonces.
    function callTwice(address fia, address to, uint256 amount, uint256 n1, uint256 n2) external {
        // First call
        IFIA(fia).protectedTransfer(to, amount, n1);
        // Second call - expected to revert for same-block protection when using different nonces
        IFIA(fia).protectedTransfer(to, amount, n2);
    }

    /// Call protectedTransfer twice using the exact same nonce to trigger "Nonce used" detection
    function reuseNonceInOneTx(address fia, address to, uint256 amount, uint256 nonce) external {
        IFIA(fia).protectedTransfer(to, amount, nonce);
        // Second call should revert with 'Nonce used' or equivalent
        IFIA(fia).protectedTransfer(to, amount, nonce);
    }
}
