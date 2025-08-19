// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../FIACoinV6.sol";

/**
 * @title FIACoin Migration Contract
 * @dev Handles migration from V6 to V7 in case of critical bugs
 */
contract FIACoinMigration {
    FIACoinV6 public immutable oldContract;
    address public newContract;
    address public owner;
    bool public migrationEnabled;
    
    mapping(address => bool) public hasMigrated;
    mapping(address => uint256) public migratedAmount;
    
    event MigrationEnabled(address newContract);
    event UserMigrated(address user, uint256 amount, uint256 stakeCount);
    
    constructor(address _oldContract) {
        oldContract = FIACoinV6(_oldContract);
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    /**
     * @dev Enable migration to new contract (after emergency pause)
     */
    function enableMigration(address _newContract) external onlyOwner {
        require(_newContract != address(0), "Invalid new contract");
        require(!migrationEnabled, "Migration already enabled");
        
        newContract = _newContract;
        migrationEnabled = true;
        
        emit MigrationEnabled(_newContract);
    }
    
    /**
     * @dev User migrates their tokens and stakes from V6 to V7
     */
    function migrate() external {
        require(migrationEnabled, "Migration not enabled");
        require(!hasMigrated[msg.sender], "Already migrated");
        
        // Get user's V6 balance
        uint256 balance = oldContract.balanceOf(msg.sender);
        
        // Get user's V6 stakes
        uint256 stakeCount = oldContract.getStakeCount(msg.sender);
        
        // Mark as migrated
        hasMigrated[msg.sender] = true;
        migratedAmount[msg.sender] = balance;
        
        // Call new contract to mint equivalent tokens + recreate stakes
        // (This requires the new contract to have a special migration function)
        IFIACoinV7(newContract).migrateFromV6(msg.sender, balance, stakeCount);
        
        emit UserMigrated(msg.sender, balance, stakeCount);
    }
    
    /**
     * @dev Get migration status for user
     */
    function getMigrationStatus(address user) external view returns (
        bool eligible,
        bool completed,
        uint256 balance,
        uint256 stakeCount
    ) {
        eligible = migrationEnabled;
        completed = hasMigrated[user];
        balance = oldContract.balanceOf(user);
        stakeCount = oldContract.getStakeCount(user);
    }
}

interface IFIACoinV7 {
    function migrateFromV6(address user, uint256 balance, uint256 stakeCount) external;
}
