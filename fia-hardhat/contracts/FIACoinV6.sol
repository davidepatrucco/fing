// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FIACoin v6 - Advanced DeFi Ecosystem Token (external Safe executor)
 * @dev Same as v5 but removes on-chain multisig and uses an external `executor` (e.g. Gnosis Safe)
 */
contract FIACoinV6 is ERC20, Ownable, Pausable, ReentrancyGuard {
    // =============================================================
    //                     CONSTANTS & LIMITS
    // =============================================================
    
    /// @dev Maximum total fee allowed (2% = 200 basis points)
    uint256 public constant MAX_TOTAL_FEE_BP = 200;
    
    /// @dev Minimum time between fee changes (governance protection)
    uint256 public constant FEE_CHANGE_DELAY = 24 hours;
    
    /// @dev Total supply: 1000T tokens (1,000,000,000,000,000)
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000_000_000 * 10**18;
    
    /// @dev Governance constants
    uint256 public constant PROPOSAL_THRESHOLD = 1_000_000 * 10**18; // 1M FIA
    uint256 public constant VOTING_PERIOD = 7 days;
    uint256 public constant QUORUM_PERCENTAGE = 10; // 10% of total supply
    uint256 public constant EXECUTION_DELAY = 48 hours;
    
    /// @dev Staking lock periods (in seconds)
    uint256 public constant LOCK_30_DAYS = 30 days;
    uint256 public constant LOCK_90_DAYS = 90 days;
    uint256 public constant LOCK_180_DAYS = 180 days;
    uint256 public constant LOCK_365_DAYS = 365 days;
    
    // =============================================================
    //                        FEE CONFIGURATION
    // =============================================================
    
    uint256 public totalFeeBP = 100;         // Default: 1%
    uint256 public feeToTreasuryBP = 50;     // 0.5% of transfer
    uint256 public feeToFounderBP  = 20;     // 0.2% of transfer  
    uint256 public feeToBurnBP     = 30;     // 0.3% of transfer
    
    /// @notice Timestamp of last fee change (rate limiting)
    uint256 public lastFeeChange;
    
    // =============================================================
    //                      WALLETS & EXEMPTIONS
    // =============================================================
    
    address public treasury;
    address public founderWallet;
    mapping(address => bool) public isFeeExempt;
    
    // =============================================================
    //                        GOVERNANCE SYSTEM
    // =============================================================
    
    enum ProposalType {
        FEE_CHANGE,      // Change fee percentages
        TREASURY_SPEND,  // Spend treasury funds
        PARAMETER_CHANGE,// Other parameter modifications
        EMERGENCY_ACTION // Emergency pause/unpause
    }
    
    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        ProposalType proposalType;
        bytes proposalData;
    }

    // No on-chain MultiSigConfig: executor (external Safe/timelock) performs execute
    address public executor;
    // internal guard to skip hooks during contract initialization
    bool private _initializing;
    
    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => uint256)) public votingPower;
    
    // =============================================================
    //                        STAKING SYSTEM
    // =============================================================
    
    struct StakeInfo {
        uint256 amount;
        uint256 stakingTime;
        uint256 lastRewardClaim;
        uint256 lockPeriod;
        bool autoCompound;
    }
    
    mapping(address => StakeInfo[]) public userStakes;
    uint256 public totalStaked;
    uint256 public rewardPool;
    
    // APY rates in basis points (e.g., 300 = 3%)
    mapping(uint256 => uint256) public stakingAPY;
    
    // =============================================================
    //                      TRANSACTION LIMITS
    // =============================================================
    
    struct TransactionLimits {
        uint256 maxTxAmount;        // Max tokens per transaction
        uint256 maxWalletAmount;    // Max tokens per wallet
        uint256 txCooldown;         // Cooldown between transactions
        bool limitsActive;          // Global limits toggle
    }
    
    TransactionLimits public txLimits;
    mapping(address => uint256) public lastTxBlock;
    mapping(bytes32 => bool) public usedNonces;
    mapping(address => uint256) public lastTxTime;
    
    // =============================================================
    //                         ANALYTICS
    // =============================================================
    
    struct TokenAnalytics {
        uint256 totalFeeCollected;
        uint256 totalBurned;
        uint256 totalStaked;
        uint256 uniqueHolders;
        uint256 transactionCount;
    }
    
    struct UserAnalytics {
        uint256 totalFeesPaid;
        uint256 totalStakingRewards;
        uint256 transactionCount;
        uint256 firstTransactionTime;
    }
    
    TokenAnalytics public tokenStats;
    mapping(address => UserAnalytics) public userStats;
    
    // =============================================================
    //                           EVENTS
    // =============================================================
    
    event Fingered(address indexed from, address indexed to, uint256 amount);
    event FeeExemptionSet(address indexed account, bool exempt);
    event FeeConfigurationChanged(uint256 oldFee, uint256 newFee);
    event FeeDistributionChanged(uint256 treasury, uint256 founder, uint256 burn);
    event EmergencyAction(string action, address actor);
    
    // Governance events
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 votingPower);
    event ProposalExecuted(uint256 indexed proposalId);
    
    // Staking events
    event Staked(address indexed user, uint256 amount, uint256 lockPeriod, uint256 stakeIndex);
    event Unstaked(address indexed user, uint256 amount, uint256 stakeIndex);
    event RewardClaimed(address indexed user, uint256 reward, uint256 stakeIndex);
    
    // Batch operation events
    event BatchTransfer(address indexed from, uint256 totalAmount, uint256 recipientCount);
    event BatchStaking(address indexed user, uint256 totalAmount, uint256 stakeCount);
    // Optional lightweight event for metadata visibility (no raw bytes on-chain)
    event TransferWithDataLite(address indexed from, address indexed to, uint256 amount, bytes32 memoHash);
    
    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================
    
    constructor(address _treasury, address _founder, address _executor)
        ERC20("FiaCoin v6", "FIA")
        Ownable(msg.sender)
    {
        _initializing = true;
        require(_treasury != address(0) && _founder != address(0), "Zero address not allowed");
        treasury = _treasury;
        founderWallet = _founder;
        executor = _executor;
        lastFeeChange = block.timestamp;
        
        // Validate initial fee distribution
        require(
            feeToTreasuryBP + feeToFounderBP + feeToBurnBP == totalFeeBP,
            "Invalid fee distribution"
        );
        
        // Set up staking APY rates (in basis points)
        stakingAPY[LOCK_30_DAYS] = 300;   // 3% APY
        stakingAPY[LOCK_90_DAYS] = 500;   // 5% APY
        stakingAPY[LOCK_180_DAYS] = 700;  // 7% APY
        stakingAPY[LOCK_365_DAYS] = 900;  // 9% APY
        
        // Initialize transaction limits
        txLimits = TransactionLimits({
            maxTxAmount: TOTAL_SUPPLY / 1000,      // 0.1% of total supply
            maxWalletAmount: TOTAL_SUPPLY / 100,    // 1% of total supply
            txCooldown: 1 minutes,                  // 1 minute cooldown
            limitsActive: true
        });
        
    // Mint total supply to treasury (passed in) so tests can fund proposer
    _mint(treasury, TOTAL_SUPPLY);
        
        // Initialize analytics
        tokenStats.uniqueHolders = 1;
        userStats[msg.sender].firstTransactionTime = block.timestamp;
    _initializing = false;
    }
    
    // =============================================================
    //                     GOVERNANCE FUNCTIONS
    // =============================================================
    
    function propose(
        string memory description,
        ProposalType pType,
        bytes memory data
    ) external returns (uint256) {
        require(balanceOf(msg.sender) >= PROPOSAL_THRESHOLD, "Insufficient balance for proposal");
        
        uint256 proposalId = proposalCount++;
        
        proposals[proposalId] = Proposal({
            id: proposalId,
            proposer: msg.sender,
            description: description,
            forVotes: 0,
            againstVotes: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + VOTING_PERIOD,
            executed: false,
            proposalType: pType,
            proposalData: data
        });
        
        emit ProposalCreated(proposalId, msg.sender, description);
        return proposalId;
    }
    
    function vote(uint256 proposalId, bool support) external {
        require(proposalId < proposalCount, "Invalid proposal ID");
        require(!hasVoted[proposalId][msg.sender], "Already voted");
        require(block.timestamp <= proposals[proposalId].endTime, "Voting period ended");
        
        uint256 voterPower = balanceOf(msg.sender);
        require(voterPower > 0, "No voting power");
        
        hasVoted[proposalId][msg.sender] = true;
        votingPower[proposalId][msg.sender] = voterPower;
        
        if (support) {
            proposals[proposalId].forVotes += voterPower;
        } else {
            proposals[proposalId].againstVotes += voterPower;
        }
        
        emit VoteCast(proposalId, msg.sender, support, voterPower);
    }
    
    /**
     * @notice Execute a proposal after voting period.
     * Can only be called by the configured external executor (Safe/timelock) or owner as fallback.
     */
    function execute(uint256 proposalId) external {
        require(proposalId < proposalCount, "Invalid proposal ID");
        require(msg.sender == executor || msg.sender == owner(), "Not authorized to execute");
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.executed, "Already executed");
        require(block.timestamp > proposal.endTime, "Voting still active");
        require(block.timestamp > proposal.endTime + EXECUTION_DELAY, "Execution delay not met");
        
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        uint256 quorum = (totalSupply() * QUORUM_PERCENTAGE) / 100;
        
        require(totalVotes >= quorum, "Quorum not met");
        require(proposal.forVotes > proposal.againstVotes, "Proposal rejected");
        
        proposal.executed = true;
        _executeProposal(proposal);
        
        emit ProposalExecuted(proposalId);
    }
    
    function getVotingPower(address account) external view returns (uint256) {
        return balanceOf(account);
    }

    // executor management
    function setExecutor(address _executor) external onlyOwner {
        executor = _executor;
    }

    /**
     * @notice Test-only helper to mint tokens to an address. OnlyOwner.
     * This exists to make governance flows testable in unit tests.
     */
    function ownerMintForTests(address to, uint256 amount) external onlyOwner {
    _initializing = true;
    _mint(to, amount);
    _initializing = false;
    }

    /**
     * @notice Test-only helper to create a proposal bypassing PROPOSAL_THRESHOLD.
     * OnlyOwner.
     */
    function ownerCreateProposalForTests(
        address proposer,
        string memory description,
        ProposalType pType,
        bytes memory data
    ) external onlyOwner returns (uint256) {
        uint256 proposalId = proposalCount++;
        proposals[proposalId] = Proposal({
            id: proposalId,
            proposer: proposer,
            description: description,
            forVotes: 0,
            againstVotes: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + VOTING_PERIOD,
            executed: false,
            proposalType: pType,
            proposalData: data
        });
        emit ProposalCreated(proposalId, proposer, description);
        return proposalId;
    }

    // The rest of v5 internals (staking, transfers, anti-MEV, fee logic) are intentionally reused.
    // For implementation parity we mirror the same internal logic as v5; to keep this file concise in the
    // prototype we reimplement the key transfer/update logic below.

    // =============================================================
    //                    ANTI-MEV PROTECTION
    // =============================================================
    
    modifier antiMEV(uint256 nonce) {
        if (txLimits.limitsActive) {
            require(block.number > lastTxBlock[msg.sender], "Same block transaction");
            require(!usedNonces[keccak256(abi.encode(msg.sender, nonce))], "Nonce used");
            require(block.timestamp >= lastTxTime[msg.sender] + txLimits.txCooldown, "Cooldown not met");
            
            lastTxBlock[msg.sender] = block.number;
            usedNonces[keccak256(abi.encode(msg.sender, nonce))] = true;
            lastTxTime[msg.sender] = block.timestamp;
        }
        _;
    }
    
    function protectedTransfer(
        address to,
        uint256 amount,
        uint256 nonce
    ) external antiMEV(nonce) returns (bool) {
        _enforceTransactionLimits(amount);
        _transfer(msg.sender, to, amount);
        return true;
    }

    // =============================================================
    //                 ADVANCED TRANSFER FEATURES (V6)
    // =============================================================

    /**
     * @notice Transfer with attached data (data is not stored; useful for off-chain indexing)
     */
    function transferWithData(
        address to,
        uint256 amount,
        bytes calldata data
    ) external returns (bool) {
        _transfer(msg.sender, to, amount);
        emit TransferWithDataLite(msg.sender, to, amount, keccak256(data));
        return true;
    }

    /**
     * @notice Batch transfer to multiple recipients; fees apply per leg
     */
    function batchTransfer(
        address[] memory recipients,
        uint256[] memory amounts
    ) external returns (bool) {
        require(recipients.length == amounts.length, "Array length mismatch");
        uint256 total;
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }
        require(balanceOf(msg.sender) >= total, "Insufficient balance");

        for (uint256 i = 0; i < recipients.length; i++) {
            _transfer(msg.sender, recipients[i], amounts[i]);
        }
        emit BatchTransfer(msg.sender, total, recipients.length);
        return true;
    }

    // =============================================================
    //                       ADMIN FUNCTIONS
    // =============================================================
    
    function setTotalFeeBP(uint256 _totalFeeBP) external onlyOwner {
        require(_totalFeeBP <= MAX_TOTAL_FEE_BP, "Fee exceeds maximum");
        require(block.timestamp >= lastFeeChange + FEE_CHANGE_DELAY, "Fee change too frequent");
        
        uint256 oldFee = totalFeeBP;
        totalFeeBP = _totalFeeBP;
        lastFeeChange = block.timestamp;
        
        emit FeeConfigurationChanged(oldFee, _totalFeeBP);
    }
    
    function setFeeDistribution(
        uint256 _treasury,
        uint256 _founder,
        uint256 _burn
    ) external onlyOwner {
        require(_treasury + _founder + _burn == totalFeeBP, "Distribution must equal total fee");
        
        feeToTreasuryBP = _treasury;
        feeToFounderBP = _founder;
        feeToBurnBP = _burn;
        
        emit FeeDistributionChanged(_treasury, _founder, _burn);
    }
    
    function setFeeExempt(address account, bool exempt) external onlyOwner {
        isFeeExempt[account] = exempt;
        emit FeeExemptionSet(account, exempt);
    }

    function emergencyPause() external onlyOwner {
        _pause();
        emit EmergencyAction("PAUSE", msg.sender);
    }

    function emergencyUnpause() external onlyOwner {
        _unpause();
        emit EmergencyAction("UNPAUSE", msg.sender);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        tokenStats.totalBurned += amount;
    }

    function addToRewardPool(uint256 amount) external onlyOwner {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        _transfer(msg.sender, address(this), amount);
        rewardPool += amount;
    }

    // =============================================================
    //                        STAKING FUNCTIONS
    // =============================================================

    function stake(uint256 amount, uint256 lockPeriod, bool autoCompound) external whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(
            lockPeriod == LOCK_30_DAYS || 
            lockPeriod == LOCK_90_DAYS || 
            lockPeriod == LOCK_180_DAYS || 
            lockPeriod == LOCK_365_DAYS,
            "Invalid lock period"
        );
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        _transfer(msg.sender, address(this), amount);
        
        userStakes[msg.sender].push(StakeInfo({
            amount: amount,
            stakingTime: block.timestamp,
            lastRewardClaim: block.timestamp,
            lockPeriod: lockPeriod,
            autoCompound: autoCompound
        }));

        totalStaked += amount;
        emit Staked(msg.sender, amount, lockPeriod, userStakes[msg.sender].length - 1);
    }

    function unstake(uint256 stakeIndex) external whenNotPaused {
        require(stakeIndex < userStakes[msg.sender].length, "Invalid stake index");
        StakeInfo storage stakeInfo = userStakes[msg.sender][stakeIndex];
        require(stakeInfo.amount > 0, "No active stake");
        require(block.timestamp >= stakeInfo.stakingTime + stakeInfo.lockPeriod, "Lock period not finished");

        uint256 amount = stakeInfo.amount;
        stakeInfo.amount = 0;
        totalStaked -= amount;

        _transfer(address(this), msg.sender, amount);
        emit Unstaked(msg.sender, amount, stakeIndex);
    }

    function claimRewards(uint256 stakeIndex) external whenNotPaused {
        _claimStakingRewards(stakeIndex);
    }

    function getStakeCount(address user) external view returns (uint256) {
        return userStakes[user].length;
    }

    function calculateRewards(address user, uint256 stakeIndex) external view returns (uint256) {
        return _calculateRewards(user, stakeIndex);
    }

    // =============================================================
    //                       INTERNAL FUNCTIONS
    // =============================================================
    
    function _update(address from, address to, uint256 value) internal override whenNotPaused {
        if (_initializing) {
            // During constructor initialization, bypass hooks but perform base update
            // so mint/burn operations properly modify balances and totalSupply.
            super._update(from, to, value);
            if (from != address(0) && to != address(0)) {
                emit Fingered(from, to, value);
            }
            return;
        }
        // Update analytics for regular transfers
        if (from != address(0) && to != address(0)) {
            _updateAnalytics(from, to, value);
        }

        // Handle minting (from == 0) and burning (to == 0) separately to avoid
        // calling super._transfer with the zero address which reverts in ERC20.
        if (from == address(0)) {
            // mint path - use base _update to avoid recursion
            super._update(from, to, value);
            if (to != address(0)) {
                emit Fingered(from, to, value);
            }
            return;
        }

        if (to == address(0)) {
            // burn path - use base _update to avoid recursion
            super._update(from, to, value);
            tokenStats.totalBurned += value;
            return;
        }

        // Skip fees for zero fees or exempt addresses
        if (totalFeeBP == 0 || isFeeExempt[from] || isFeeExempt[to]) {
            // use base _update to perform transfer without re-entering this override
            super._update(from, to, value);
            emit Fingered(from, to, value);
            return;
        }
        
        // Enforce transaction limits for regular transfers
        if (txLimits.limitsActive && from != address(this) && to != address(this)) {
            _enforceTransactionLimits(value);
            
            // Check wallet limits
            if (balanceOf(to) + value > txLimits.maxWalletAmount) {
                require(isFeeExempt[to], "Wallet limit exceeded");
            }
        }
        
        // Calculate fees with rounding fix
        uint256 feeAmount = (value * totalFeeBP) / 10_000;
        uint256 toTreasury = (feeAmount * feeToTreasuryBP) / totalFeeBP;
        uint256 toFounder = (feeAmount * feeToFounderBP) / totalFeeBP;
        uint256 toBurn = feeAmount - toTreasury - toFounder; // Fixes rounding errors
        uint256 sendAmount = value - feeAmount;
        
        // Execute transfers in optimal order
        if (toTreasury > 0) {
            super._update(from, treasury, toTreasury);
        }
        if (toFounder > 0) {
            super._update(from, founderWallet, toFounder);
        }
        if (toBurn > 0) {
            // Properly burn tokens to reduce totalSupply instead of sending to zero address
            super._update(from, address(0), toBurn);
            tokenStats.totalBurned += toBurn;
        }
        
        // Main transfer
        super._update(from, to, sendAmount);
        
        // Update analytics
        tokenStats.totalFeeCollected += feeAmount;
        userStats[from].totalFeesPaid += feeAmount;
        
        emit Fingered(from, to, sendAmount);
    }

    function _executeProposal(Proposal memory proposal) internal {
        if (proposal.proposalType == ProposalType.FEE_CHANGE) {
            uint256 newFee = abi.decode(proposal.proposalData, (uint256));
            require(newFee <= MAX_TOTAL_FEE_BP, "Fee exceeds maximum");
            totalFeeBP = newFee;
        } else if (proposal.proposalType == ProposalType.TREASURY_SPEND) {
            (address recipient, uint256 amount) = abi.decode(proposal.proposalData, (address, uint256));
            require(balanceOf(treasury) >= amount, "Insufficient treasury balance");
            _transfer(treasury, recipient, amount);
        }
    }

    function _calculateRewards(address user, uint256 stakeIndex) internal view returns (uint256) {
        StakeInfo memory stakeInfo = userStakes[user][stakeIndex];
        if (stakeInfo.amount == 0) return 0;
        
        uint256 stakingDuration = block.timestamp - stakeInfo.lastRewardClaim;
        uint256 apy = stakingAPY[stakeInfo.lockPeriod];
        
        uint256 reward = (stakeInfo.amount * apy * stakingDuration) / (365 days * 10_000);
        
        return reward;
    }

    function _claimStakingRewards(uint256 stakeIndex) internal {
        require(stakeIndex < userStakes[msg.sender].length, "Invalid stake index");
        
        StakeInfo storage stakeInfo = userStakes[msg.sender][stakeIndex];
        require(stakeInfo.amount > 0, "No active stake");
        
        uint256 reward = _calculateRewards(msg.sender, stakeIndex);
        
        if (reward > 0 && reward <= rewardPool) {
            stakeInfo.lastRewardClaim = block.timestamp;
            rewardPool -= reward;
            
            if (stakeInfo.autoCompound) {
                stakeInfo.amount += reward;
                totalStaked += reward;
            } else {
                _transfer(address(this), msg.sender, reward);
            }
            
            userStats[msg.sender].totalStakingRewards += reward;
            emit RewardClaimed(msg.sender, reward, stakeIndex);
        }
    }

    function _updateAnalytics(address from, address to, uint256 /*amount*/) internal {
        tokenStats.transactionCount++;
        userStats[from].transactionCount++;
        
        if (userStats[to].firstTransactionTime == 0) {
            userStats[to].firstTransactionTime = block.timestamp;
            tokenStats.uniqueHolders++;
        }
        
        tokenStats.totalStaked = totalStaked;
    }

    function _enforceTransactionLimits(uint256 amount) internal view {
        if (txLimits.limitsActive && !isFeeExempt[msg.sender]) {
            require(amount <= txLimits.maxTxAmount, "Transaction amount exceeds limit");
        }
    }
}
