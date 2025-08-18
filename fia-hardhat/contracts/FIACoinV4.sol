// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title FIACoin v4 - Enhanced Security Version
 * @dev ERC20 token with transfer fees, burn mechanism, and enhanced security
 * @notice Improved version with security fixes and gas optimizations
 * 
 * KEY IMPROVEMENTS:
 * ✅ Emergency pause functionality
 * ✅ Better fee distribution validation
 * ✅ Fixed rounding errors in fee calculations
 * ✅ Enhanced event emissions
 * ✅ Gas optimization in transfer logic
 */
contract FIACoinV4 is ERC20, Ownable, Pausable {
    // =============================================================
    //                     CONSTANTS & LIMITS
    // =============================================================
    
    /// @dev Maximum total fee allowed (2% = 200 basis points)
    uint256 public constant MAX_TOTAL_FEE_BP = 200;
    
    /// @dev Minimum time between fee changes (governance protection)
    uint256 public constant FEE_CHANGE_DELAY = 24 hours;
    
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
    //                           EVENTS
    // =============================================================
    
    event Fingered(address indexed from, address indexed to, uint256 amount);
    event FeeExemptionSet(address indexed account, bool exempt);
    event FeeConfigurationChanged(uint256 oldFee, uint256 newFee);
    event FeeDistributionChanged(uint256 treasury, uint256 founder, uint256 burn);
    event EmergencyAction(string action, address actor);
    
    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================
    
    constructor(address _treasury, address _founder)
        ERC20("FiaCoin v4", "FIA")
        Ownable(msg.sender)
    {
        require(_treasury != address(0) && _founder != address(0), "Zero address not allowed");
        
        treasury = _treasury;
        founderWallet = _founder;
        lastFeeChange = block.timestamp;
        
        // Validate initial fee distribution
        require(
            feeToTreasuryBP + feeToFounderBP + feeToBurnBP == totalFeeBP,
            "Invalid fee distribution"
        );
        
        _mint(msg.sender, 1_000_000_000 * 10 ** decimals());
        
        // Auto-exempt key addresses
        isFeeExempt[msg.sender] = true;
        isFeeExempt[_treasury]  = true;
        isFeeExempt[_founder]   = true;
        isFeeExempt[address(this)] = true; // Contract itself exempt
    }
    
    // =============================================================
    //                      ADMIN FUNCTIONS
    // =============================================================
    
    /**
     * @notice Set fee exemption with validation
     * @param account Address to modify (cannot be zero)
     * @param exempt Fee exemption status
     */
    function setFeeExempt(address account, bool exempt) external onlyOwner {
        require(account != address(0), "Cannot exempt zero address");
        isFeeExempt[account] = exempt;
        emit FeeExemptionSet(account, exempt);
    }
    
    /**
     * @notice Set total fee with rate limiting
     * @param _totalFeeBP New total fee (max 200 = 2%)
     */
    function setTotalFeeBP(uint256 _totalFeeBP) external onlyOwner {
        require(_totalFeeBP <= MAX_TOTAL_FEE_BP, "Fee exceeds maximum");
        require(block.timestamp >= lastFeeChange + FEE_CHANGE_DELAY, "Fee change too frequent");
        
        uint256 oldFee = totalFeeBP;
        totalFeeBP = _totalFeeBP;
        lastFeeChange = block.timestamp;
        
        emit FeeConfigurationChanged(oldFee, _totalFeeBP);
    }
    
    /**
     * @notice Set fee distribution with validation
     * @param _treasury Treasury allocation in basis points
     * @param _founder Founder allocation in basis points  
     * @param _burn Burn allocation in basis points
     */
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
    
    /**
     * @notice Emergency pause (stops all transfers)
     */
    function emergencyPause() external onlyOwner {
        _pause();
        emit EmergencyAction("PAUSE", msg.sender);
    }
    
    /**
     * @notice Resume operations after pause
     */
    function emergencyUnpause() external onlyOwner {
        _unpause();
        emit EmergencyAction("UNPAUSE", msg.sender);
    }
    
    /**
     * @notice User burn function
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
    
    // =============================================================
    //                   OPTIMIZED TRANSFER LOGIC
    // =============================================================
    
    /**
     * @notice Enhanced transfer logic with gas optimization and rounding fix
     */
    function _update(address from, address to, uint256 value) internal override whenNotPaused {
        // Skip fees for mint/burn, zero fees, or exempt addresses
        if (from == address(0) || to == address(0) || totalFeeBP == 0 || 
            isFeeExempt[from] || isFeeExempt[to]) {
            super._update(from, to, value);
            if (from != address(0) && to != address(0)) {
                emit Fingered(from, to, value);
            }
            return;
        }
        
        // Calculate fees with rounding fix
        uint256 feeAmount = (value * totalFeeBP) / 10_000;
        uint256 toTreasury = (feeAmount * feeToTreasuryBP) / totalFeeBP;
        uint256 toFounder = (feeAmount * feeToFounderBP) / totalFeeBP;
        uint256 toBurn = feeAmount - toTreasury - toFounder; // Fixes rounding errors
        uint256 sendAmount = value - feeAmount;
        
        // Execute transfers in optimal order
        super._update(from, to, sendAmount);           // Main transfer
        
        if (toTreasury > 0) {
            super._update(from, treasury, toTreasury);  // Treasury fee
        }
        if (toFounder > 0) {
            super._update(from, founderWallet, toFounder); // Founder fee
        }
        if (toBurn > 0) {
            _burn(from, toBurn);                       // Burn fee (after transfers)
        }
        
        emit Fingered(from, to, value);
    }
    
    // =============================================================
    //                      VIEW FUNCTIONS
    // =============================================================
    
    /**
     * @notice Calculate actual transfer amounts including fees
     * @param amount Original transfer amount
     * @return received Amount recipient will receive
     * @return fees Total fees deducted
     */
    function calculateTransferAmounts(uint256 amount) external view returns (uint256 received, uint256 fees) {
        if (totalFeeBP == 0) {
            return (amount, 0);
        }
        
        fees = (amount * totalFeeBP) / 10_000;
        received = amount - fees;
    }
    
    /**
     * @notice Get current fee distribution breakdown
     */
    function getFeeBreakdown() external view returns (
        uint256 total,
        uint256 treasury,
        uint256 founder,
        uint256 burn
    ) {
        return (totalFeeBP, feeToTreasuryBP, feeToFounderBP, feeToBurnBP);
    }
}
