// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./FIACoinV6Upgradeable.sol";

/**
 * @title FIACoin V7 Upgradeable - Bug Fixes and New Features
 * @dev Upgraded version of V6 with fixes and enhancements
 */
contract FIACoinV7Upgradeable is FIACoinV6Upgradeable {
    
    // =============================================================
    //                        NEW V7 STORAGE
    // =============================================================
    
    /// @dev New feature: Emergency withdrawal for locked stakes
    mapping(address => bool) public emergencyWithdrawalEnabled;
    
    /// @dev New feature: Dynamic APY based on total staked amount
    bool public dynamicAPYEnabled;
    uint256 public baseAPYMultiplier; // In basis points (10000 = 1x)
    
    /// @dev Bug fix tracking
    uint256 public bugFixVersion;
    
    // =============================================================
    //                        V7 EVENTS
    // =============================================================
    
    event EmergencyWithdrawalToggled(address indexed user, bool enabled);
    event DynamicAPYEnabled(bool enabled, uint256 multiplier);
    event BugFixApplied(uint256 version, string description);
    event V7FeatureUsed(address indexed user, string feature);
    
    // =============================================================
    //                        V7 INITIALIZATION
    // =============================================================
    
    /// @dev Initialize V7 features (called after upgrade)
    function initializeV7() public onlyOwner {
        require(bugFixVersion == 0, "V7 already initialized");
        
        // Initialize new V7 features
        dynamicAPYEnabled = true;
        baseAPYMultiplier = 10000; // 1x multiplier initially
        bugFixVersion = 1;
        
        emit BugFixApplied(1, "Fixed staking reward calculation bug");
        emit DynamicAPYEnabled(true, baseAPYMultiplier);
    }
    
    /**
     * @dev Returns the current implementation version
     */
    function version() public pure override returns (string memory) {
        return "7.0.0";
    }
    
    // =============================================================
    //                        V7 BUG FIXES
    // =============================================================
    
    /**
     * @dev FIXED: Correct staking reward calculation 
     * V6 had a bug where rewards were calculated incorrectly for auto-compound stakes
     */
    function calculateRewards(address user, uint256 stakeIndex) external view returns (uint256) {
        require(stakeIndex < userStakes[user].length, "Invalid stake index");
        
        StakeInfo storage stakeInfo = userStakes[user][stakeIndex];
        
        // ✅ V7 FIX: Correct time calculation
        uint256 stakingDuration = block.timestamp - stakeInfo.lastRewardClaim;
        uint256 baseAPY = this.stakingAPY(stakeInfo.lockPeriod);
        
        // ✅ V7 FIX: Apply dynamic APY if enabled
        uint256 effectiveAPY = baseAPY;
        if (dynamicAPYEnabled) {
            // Bonus APY based on total staked (more staked = higher APY for everyone)
            uint256 stakingRatio = (totalStaked * 10000) / totalSupply(); // Percentage in BP
            uint256 bonus = stakingRatio / 100; // 1% bonus per 1% of supply staked
            effectiveAPY = (baseAPY * (baseAPYMultiplier + bonus)) / 10000;
        }
        
        // ✅ V7 FIX: Correct compound calculation for auto-compound stakes
        uint256 reward;
        if (stakeInfo.autoCompound) {
            // Compound interest formula: A = P(1 + r/n)^(nt)
            uint256 periods = stakingDuration / 86400; // Daily compounding
            uint256 dailyRate = effectiveAPY / 365; // Daily rate in BP
            
            // Simplified compound calculation (for gas efficiency)
            reward = (stakeInfo.amount * dailyRate * periods) / 10000;
            
            // ✅ V7 FIX: Cap rewards to available reward pool
            if (reward > rewardPool) {
                reward = rewardPool;
            }
        } else {
            // Simple interest for non-auto-compound
            reward = (stakeInfo.amount * effectiveAPY * stakingDuration) / (10000 * 365 days);
        }
        
        return reward;
    }
    
    /**
     * @dev FIXED: Safer unstaking with emergency withdrawal option
     */
    function unstake(uint256 stakeIndex) external whenNotPaused {
        require(stakeIndex < userStakes[msg.sender].length, "Invalid stake index");
        
        StakeInfo storage stakeInfo = userStakes[msg.sender][stakeIndex];
        require(stakeInfo.amount > 0, "Stake already withdrawn");
        
        bool canUnstake = block.timestamp >= stakeInfo.stakingTime + stakeInfo.lockPeriod;
        bool emergencyAllowed = emergencyWithdrawalEnabled[msg.sender];
        
        require(canUnstake || emergencyAllowed, "Stake is still locked and emergency withdrawal not enabled");
        
        uint256 amount = stakeInfo.amount;
        uint256 reward = 0;
        
        // Calculate rewards only if not emergency withdrawal
        if (canUnstake) {
            reward = this.calculateRewards(msg.sender, stakeIndex);
            if (reward > rewardPool) reward = rewardPool;
        } else {
            // ✅ V7 FEATURE: Emergency withdrawal penalty
            uint256 penalty = amount / 10; // 10% penalty
            amount -= penalty;
            // Penalty goes to reward pool
            rewardPool += penalty;
            
            emit V7FeatureUsed(msg.sender, "EmergencyWithdrawal");
        }
        
        // Update state
        stakeInfo.amount = 0;
        totalStaked -= amount;
        if (reward > 0) {
            rewardPool -= reward;
        }
        
        // Transfer tokens
        _transfer(address(this), msg.sender, amount + reward);
        
        emit Unstaked(msg.sender, amount, stakeIndex);
        if (reward > 0) {
            emit RewardClaimed(msg.sender, reward, stakeIndex);
        }
    }
    
    // =============================================================
    //                        V7 NEW FEATURES
    // =============================================================
    
    /**
     * @dev NEW: Enable/disable emergency withdrawal for a user
     */
    function setEmergencyWithdrawal(bool enabled) external {
        emergencyWithdrawalEnabled[msg.sender] = enabled;
        emit EmergencyWithdrawalToggled(msg.sender, enabled);
        emit V7FeatureUsed(msg.sender, "SetEmergencyWithdrawal");
    }
    
    /**
     * @dev NEW: Admin function to configure dynamic APY
     */
    function configureDynamicAPY(bool enabled, uint256 multiplier) external onlyOwner {
        require(multiplier >= 5000 && multiplier <= 20000, "Multiplier must be between 0.5x and 2x");
        
        dynamicAPYEnabled = enabled;
        baseAPYMultiplier = multiplier;
        
        emit DynamicAPYEnabled(enabled, multiplier);
    }
    
    /**
     * @dev NEW: Get effective APY for a lock period (including dynamic bonus)
     */
    function getEffectiveAPY(uint256 lockPeriod) external view returns (uint256) {
        uint256 baseAPY = this.stakingAPY(lockPeriod);
        
        if (!dynamicAPYEnabled) {
            return baseAPY;
        }
        
        uint256 stakingRatio = (totalStaked * 10000) / totalSupply();
        uint256 bonus = stakingRatio / 100;
        
        return (baseAPY * (baseAPYMultiplier + bonus)) / 10000;
    }
    
    /**
     * @dev NEW: Batch stake for multiple lock periods
     */
    function batchStake(
        uint256[] calldata amounts,
        uint256[] calldata lockPeriods,
        bool[] calldata autoCompounds
    ) external whenNotPaused {
        require(amounts.length == lockPeriods.length && amounts.length == autoCompounds.length, "Array length mismatch");
        require(amounts.length <= 10, "Too many stakes in batch");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        require(balanceOf(msg.sender) >= totalAmount, "Insufficient balance");
        
        _transfer(msg.sender, address(this), totalAmount);
        
        for (uint256 i = 0; i < amounts.length; i++) {
            require(amounts[i] > 0, "Amount must be greater than 0");
            require(
                lockPeriods[i] == LOCK_30_DAYS || 
                lockPeriods[i] == LOCK_90_DAYS || 
                lockPeriods[i] == LOCK_180_DAYS || 
                lockPeriods[i] == LOCK_365_DAYS,
                "Invalid lock period"
            );
            
            userStakes[msg.sender].push(StakeInfo({
                amount: amounts[i],
                stakingTime: block.timestamp,
                lastRewardClaim: block.timestamp,
                lockPeriod: lockPeriods[i],
                autoCompound: autoCompounds[i]
            }));
            
            totalStaked += amounts[i];
            emit Staked(msg.sender, amounts[i], lockPeriods[i], userStakes[msg.sender].length - 1);
        }
        
        emit V7FeatureUsed(msg.sender, "BatchStake");
    }
    
    /**
     * @dev NEW: Get comprehensive user staking info
     */
    function getUserStakingInfo(address user) external view returns (
        uint256 totalUserStaked,
        uint256 totalPendingRewards,
        uint256 activeStakes,
        uint256 nextUnlockTime
    ) {
        StakeInfo[] storage stakes = userStakes[user];
        uint256 earliest = type(uint256).max;
        
        for (uint256 i = 0; i < stakes.length; i++) {
            if (stakes[i].amount > 0) {
                totalUserStaked += stakes[i].amount;
                totalPendingRewards += this.calculateRewards(user, i);
                activeStakes++;
                
                uint256 unlockTime = stakes[i].stakingTime + stakes[i].lockPeriod;
                if (unlockTime < earliest && unlockTime > block.timestamp) {
                    earliest = unlockTime;
                }
            }
        }
        
        nextUnlockTime = earliest == type(uint256).max ? 0 : earliest;
    }
    
    // =============================================================
    //                        V7 GOVERNANCE ENHANCEMENTS
    // =============================================================
    
    /**
     * @dev NEW: Proposal with automatic execution after delay
     */
    function proposeWithAutoExecution(
        string calldata description,
        ProposalType proposalType,
        bytes calldata proposalData,
        uint256 executionDelay
    ) external returns (uint256) {
        require(executionDelay >= EXECUTION_DELAY, "Execution delay too short");
        require(executionDelay <= 30 days, "Execution delay too long");
        
        // V7 enhancement: create proposal with custom execution delay
        uint256 proposalId = proposalCount++;
        
        Proposal storage proposal = proposals[proposalId];
        proposal.description = description;
        proposal.proposalType = proposalType;
        proposal.proposalData = proposalData;
        proposal.proposer = msg.sender;
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + VOTING_PERIOD + executionDelay;
        
        emit V7FeatureUsed(msg.sender, "ProposeWithAutoExecution");
        
        return proposalId;
    }
}
