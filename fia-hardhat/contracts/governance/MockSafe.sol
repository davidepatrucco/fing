// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @notice Minimal mock of an external executor (e.g., Gnosis Safe).
 * It simply exposes an `callExecute` helper that calls a target contract's function.
 * Used only for testing CI flows where an external executor calls `FIACoinV6.execute`.
 */
contract MockSafe {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function callExecute(address target, bytes calldata data) external returns (bytes memory) {
    // Only the Safe owner may instruct the Safe to execute
    require(msg.sender == owner, "MockSafe: only owner");
    // Forward call to target
    (bool ok, bytes memory ret) = target.call(data);
        if (!ok) {
            // bubble up revert reason
            if (ret.length > 0) {
                // solhint-disable-next-line no-inline-assembly
                assembly {
                    let returndata_size := mload(ret)
                    revert(add(ret, 32), returndata_size)
                }
            } else {
                revert("MockSafe: call failed");
            }
        }
        return ret;
    }
}
