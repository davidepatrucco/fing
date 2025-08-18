// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimpleMultiSig {
    address[] public owners;
    uint256 public required;

    struct Tx {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 confirmations;
    }

    Tx[] public transactions;
    mapping(uint256 => mapping(address => bool)) public isConfirmed;
    mapping(address => bool) public isOwner;

    event Submit(uint256 indexed txId, address indexed proposer, address to, uint256 value);
    event Confirm(address indexed owner, uint256 indexed txId);
    event Execute(uint256 indexed txId);

    constructor(address[] memory _owners, uint256 _required) {
        require(_owners.length >= _required && _required > 0, "Invalid multisig config");
        for (uint i = 0; i < _owners.length; i++) {
            address o = _owners[i];
            require(o != address(0), "Zero owner");
            require(!isOwner[o], "Duplicate owner");
            isOwner[o] = true;
            owners.push(o);
        }
        required = _required;
    }

    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not owner");
        _;
    }

    function submitTransaction(address to, uint256 value, bytes memory data) external onlyOwner returns (uint256) {
        Tx memory txObj = Tx({to: to, value: value, data: data, executed: false, confirmations: 0});
        transactions.push(txObj);
        uint256 txId = transactions.length - 1;
        emit Submit(txId, msg.sender, to, value);
        _confirm(txId);
        return txId;
    }

    function _confirm(uint256 txId) internal {
        require(txId < transactions.length, "Invalid tx");
        require(!isConfirmed[txId][msg.sender], "Already confirmed");
        isConfirmed[txId][msg.sender] = true;
        transactions[txId].confirmations++;
        emit Confirm(msg.sender, txId);
    }

    function confirmTransaction(uint256 txId) external onlyOwner {
        _confirm(txId);
    }

    function executeTransaction(uint256 txId) external {
        require(txId < transactions.length, "Invalid tx");
        Tx storage txObj = transactions[txId];
        require(!txObj.executed, "Already executed");
        require(txObj.confirmations >= required, "Not enough confirmations");

        txObj.executed = true;
        (bool success, ) = txObj.to.call{value: txObj.value}(txObj.data);
        require(success, "Execution failed");
        emit Execute(txId);
    }

    // allow contract to receive ETH if needed
    receive() external payable {}
}
