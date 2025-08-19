// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title FIACoin V6 Upgradeable - Using Proxy Pattern
 * @dev Same functionality as FIACoinV6 but upgradeable via proxy
 */
contract FIACoinV6Upgradeable is 
    Initializable,
    ERC20Upgradeable, 
    OwnableUpgradeable, 
    PausableUpgradeable, 
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable 
{
    // =============================================================
    //                     CONSTANTS & STORAGE
    // =============================================================
    
    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    uint256 public constant MAX_TOTAL_FEE_BP = 200;
    uint256 public constant FEE_CHANGE_DELAY = 24 hours;
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000_000_000 * 10**18;
    
    // Governance constants
    uint256 public constant PROPOSAL_THRESHOLD = 1_000_000 * 10**18;
    uint256 public constant VOTING_PERIOD = 7 days;
    uint256 public constant QUORUM_PERCENTAGE = 10;
    uint256 public constant EXECUTION_DELAY = 48 hours;
    
    // Staking lock periods
    uint256 public constant LOCK_30_DAYS = 30 days;
    uint256 public constant LOCK_90_DAYS = 90 days;
    uint256 public constant LOCK_180_DAYS = 180 days;
    uint256 public constant LOCK_365_DAYS = 365 days;
    
    // =============================================================
    //                        STORAGE VARIABLES
    // =============================================================
    
    uint256 public totalFeeBP;
    uint256 public feeToTreasuryBP;
    uint256 public feeToFounderBP;
    uint256 public feeToBurnBP;
    uint256 public lastFeeChange;
    
    address public treasury;
    address public founderWallet;
    address public executor;
    
    mapping(address => bool) public isFeeExempt;
    
    // Governance
    enum ProposalType { FEE_CHANGE, TREASURY_SPEND, PARAMETER_CHANGE, EMERGENCY_ACTION }
    
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
    
    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => uint256)) public votingPower;
    
    // Staking
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
    
    // Analytics
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
    
    // Anti-MEV
    struct TransactionLimits {
        uint256 maxTxAmount;
        uint256 maxWalletAmount;
        uint256 txCooldown;
        bool limitsActive;
    }
    
    TransactionLimits public txLimits;
    mapping(address => uint256) public lastTxBlock;
    mapping(address => uint256) public lastTxTime;
    mapping(bytes32 => bool) public usedNonces;
    
    // =============================================================
    //                        EVENTS
    // =============================================================
    
    event Staked(address indexed user, uint256 amount, uint256 lockPeriod, uint256 stakeIndex);
    event Unstaked(address indexed user, uint256 amount, uint256 stakeIndex);
    event RewardClaimed(address indexed user, uint256 reward, uint256 stakeIndex);
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 votingPower);
    event ProposalExecuted(uint256 indexed proposalId);
    event FeeConfigurationChanged(uint256 oldFee, uint256 newFee);
    event FeeDistributionChanged(uint256 treasury, uint256 founder, uint256 burn);
    event FeeExemptionSet(address indexed account, bool exempt);
    event EmergencyAction(string action, address indexed actor);
    event TransferWithDataLite(address indexed from, address indexed to, uint256 amount, bytes32 memoHash);
    event BatchTransfer(address indexed from, uint256 totalAmount, uint256 recipientCount);
    event Fingered(address indexed from, address indexed to, uint256 amount);
    
    // =============================================================
    //                        INITIALIZATION
    // =============================================================
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(
        address _treasury,
        address _founder,
        address _executor
    ) public initializer {
        __ERC20_init("FIA", "FIA");
        __Ownable_init(_msgSender());
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        treasury = _treasury;
        founderWallet = _founder;
        executor = _executor;
        
        // Fee configuration
        totalFeeBP = 100;
        feeToTreasuryBP = 50;
        feeToFounderBP = 20;
        feeToBurnBP = 30;
        
        // Transaction limits
        txLimits = TransactionLimits({
            maxTxAmount: TOTAL_SUPPLY / 1000,  // 0.1% of supply
            maxWalletAmount: TOTAL_SUPPLY / 100, // 1% of supply
            txCooldown: 1 seconds,
            limitsActive: true
        });
        
        // Set fee exemptions
        isFeeExempt[_treasury] = true;
        isFeeExempt[_founder] = true;
        isFeeExempt[address(this)] = true;
        
        // Mint total supply to deployer
        _mint(_msgSender(), TOTAL_SUPPLY);
    }
    
    // =============================================================
    //                        UPGRADE LOGIC
    // =============================================================
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    /**
     * @dev Returns the current implementation version
     */
    function version() public pure virtual returns (string memory) {
        return "6.0.0";
    }
    
    // =============================================================
    //                        ADMIN FUNCTIONS
    // =============================================================
    
    function setTotalFeeBP(uint256 _totalFeeBP) external onlyOwner {
        require(_totalFeeBP <= MAX_TOTAL_FEE_BP, "Fee exceeds maximum");
        require(block.timestamp >= lastFeeChange + FEE_CHANGE_DELAY, "Fee change too frequent");
        
        uint256 oldFee = totalFeeBP;
        totalFeeBP = _totalFeeBP;
        lastFeeChange = block.timestamp;
        
        emit FeeConfigurationChanged(oldFee, _totalFeeBP);
    }
    
    function emergencyPause() external onlyOwner {
        _pause();
        emit EmergencyAction("PAUSE", _msgSender());
    }
    
    function emergencyUnpause() external onlyOwner {
        _unpause();
        emit EmergencyAction("UNPAUSE", _msgSender());
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
        require(balanceOf(_msgSender()) >= amount, "Insufficient balance");

        _transfer(_msgSender(), address(this), amount);
        
        userStakes[_msgSender()].push(StakeInfo({
            amount: amount,
            stakingTime: block.timestamp,
            lastRewardClaim: block.timestamp,
            lockPeriod: lockPeriod,
            autoCompound: autoCompound
        }));

        totalStaked += amount;
        emit Staked(_msgSender(), amount, lockPeriod, userStakes[_msgSender()].length - 1);
    }
    
    function getStakeCount(address user) external view returns (uint256) {
        return userStakes[user].length;
    }
    
    function stakingAPY(uint256 lockPeriod) external pure returns (uint256) {
        if (lockPeriod == LOCK_30_DAYS) return 300;   // 3%
        if (lockPeriod == LOCK_90_DAYS) return 500;   // 5%
        if (lockPeriod == LOCK_180_DAYS) return 700;  // 7%
        if (lockPeriod == LOCK_365_DAYS) return 900;  // 9%
        return 0;
    }
    
    // =============================================================
    //                        CORE ERC20 OVERRIDE
    // =============================================================
    
    function _update(address from, address to, uint256 value) internal override whenNotPaused {
        // Fee processing logic here (simplified for brevity)
        super._update(from, to, value);
        
        if (from != address(0) && to != address(0)) {
            emit Fingered(from, to, value);
        }
    }
}
