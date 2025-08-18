// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FIACoin v3
 * @dev ERC20 token with transfer fees and burn mechanism
 * @notice This token implements a fee system on transfers with three destinations:
 *         - Treasury: operational funds
 *         - Founder: team allocation  
 *         - Burn: deflationary mechanism
 * 
 * SECURITY CONSIDERATIONS:
 * ✅ Uses OpenZeppelin battle-tested contracts
 * ✅ Fee exemption system for DEX compatibility
 * ✅ Maximum fee cap protection (2%)
 * ⚠️  Fee logic in _update can be gas expensive
 * ⚠️  Multiple transfers per transaction increase complexity
 */
contract FIACoin is ERC20, Ownable {
    // =============================================================
    //                     CONSTANTS & IMMUTABLES
    // =============================================================
    
    /// @dev Maximum total fee allowed (2% = 200 basis points)
    /// @notice Prevents owner from setting excessive fees
    uint256 public constant MAX_TOTAL_FEE_BP = 200;
    
    // =============================================================
    //                        FEE CONFIGURATION
    // =============================================================
    
    /// @notice Total fee percentage in basis points (100 = 1%)
    /// @dev Can be adjusted by owner but capped at MAX_TOTAL_FEE_BP
    uint256 public totalFeeBP = 100;     // Default: 1%
    
    /// @notice Fee allocation to treasury in basis points relative to totalFeeBP
    /// @dev 50/100 = 50% of total fee goes to treasury
    uint256 public feeToTreasuryBP = 50; // 0.5% of transfer
    
    /// @notice Fee allocation to founder in basis points relative to totalFeeBP  
    /// @dev 20/100 = 20% of total fee goes to founder
    uint256 public feeToFounderBP  = 20; // 0.2% of transfer
    
    /// @notice Fee allocation to burn in basis points relative to totalFeeBP
    /// @dev 30/100 = 30% of total fee gets burned (deflationary)
    uint256 public feeToBurnBP     = 30; // 0.3% of transfer

    
    // =============================================================
    //                      WALLETS & EXEMPTIONS
    // =============================================================
    
    /// @notice Treasury wallet address for operational funds
    /// @dev Set during construction, cannot be zero address
    address public treasury;
    
    /// @notice Founder wallet address for team allocation
    /// @dev Set during construction, cannot be zero address  
    address public founderWallet;

    /// @notice Mapping of addresses exempt from transfer fees
    /// @dev Critical for DEX functionality - pools/routers must be exempt
    mapping(address => bool) public isFeeExempt;

    // =============================================================
    //                           EVENTS
    // =============================================================
    
    /// @notice Emitted on every transfer (including fee transfers)
    /// @dev Fun naming convention - "Fingered" represents token movement
    event Fingered(address indexed from, address indexed to, uint256 amount);
    
    /// @notice Emitted when fee exemption status changes
    /// @dev Important for tracking DEX integrations
    event FeeExemptionSet(address indexed account, bool exempt);

    
    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================
    
    /**
     * @notice Initialize FIACoin with treasury and founder addresses
     * @param _treasury Address to receive treasury fees (cannot be zero)
     * @param _founder Address to receive founder fees (cannot be zero)
     * @dev Mints 1 billion tokens to deployer and exempts key addresses from fees
     * 
     * SECURITY ANALYSIS:
     * ✅ Zero address validation
     * ✅ Reasonable initial supply (1B tokens)  
     * ✅ Auto-exempts deployer, treasury, founder
     * ⚠️  Large initial mint to single address (consider vesting)
     */
    constructor(address _treasury, address _founder)
        ERC20("FiaCoin v3", "FIA")
        Ownable(msg.sender)
    {
        require(_treasury != address(0) && _founder != address(0), "zero addr");
        treasury = _treasury;
        founderWallet = _founder;
        
        // Mint 1 billion tokens with 18 decimals
        _mint(msg.sender, 1_000_000_000 * 10 ** decimals());
        
        // Exempt key addresses from fees to prevent recursive fee issues
        isFeeExempt[msg.sender] = true;
        isFeeExempt[_treasury]  = true;
        isFeeExempt[_founder]   = true;
    }

    
    // =============================================================
    //                      ADMIN FUNCTIONS
    // =============================================================

    /**
     * @notice Set fee exemption status for an address
     * @param account Address to modify exemption for
     * @param exempt True to exempt from fees, false to include in fees
     * @dev CRITICAL for Uniswap integration - pools/routers must be exempt
     * 
     * SECURITY ANALYSIS:
     * ✅ OnlyOwner protection
     * ✅ Event emission for transparency
     * ⚠️  No validation on account address (could be zero)
     * 💡 IMPROVEMENT: Add address(0) validation
     */
    function setFeeExempt(address account, bool exempt) external onlyOwner {
        require(account != address(0), "Cannot exempt zero address");
        isFeeExempt[account] = exempt;
        emit FeeExemptionSet(account, exempt);
    }

    /**
     * @notice Adjust total fee percentage
     * @param _totalFeeBP New total fee in basis points (max 200 = 2%)
     * @dev Useful for temporary fee adjustments during pool creation
     * 
     * SECURITY ANALYSIS:
     * ✅ OnlyOwner protection
     * ✅ Maximum fee cap enforcement
     * ✅ No risk of excessive fees
     * 💡 IMPROVEMENT: Add event emission for transparency
     */
    function setTotalFeeBP(uint256 _totalFeeBP) external onlyOwner {
        require(_totalFeeBP <= MAX_TOTAL_FEE_BP, "Fee too high");
        uint256 oldFee = totalFeeBP;
        totalFeeBP = _totalFeeBP;
        emit FeeConfigurationChanged(oldFee, _totalFeeBP);
    }

    /**
     * @notice Allow users to burn their own tokens
     * @param amount Amount of tokens to burn
     * @dev Simple burn function for deflationary mechanics
     * 
     * SECURITY ANALYSIS:
     * ✅ Users can only burn their own tokens
     * ✅ Uses OpenZeppelin's safe _burn function
     * ✅ No admin privileges required
     */
    function burn(uint256 amount) external { 
        _burn(msg.sender, amount); 
    }

    
    // =============================================================
    //                      CORE TRANSFER LOGIC
    // =============================================================

    /**
     * @notice Core transfer function with fee logic
     * @param from Sender address
     * @param to Recipient address  
     * @param value Amount to transfer
     * @dev Overrides OpenZeppelin's _update to implement fee system
     * 
     * TRANSFER FLOW:
     * 1. Check if fees should be applied (exemptions, zero addresses, zero fees)
     * 2. If no fees: execute normal transfer + emit Fingered event
     * 3. If fees apply: calculate fee distributions and execute multiple transfers
     * 
     * FEE CALCULATION:
     * - Total Fee: (value * totalFeeBP) / 10,000
     * - Treasury: (feeAmount * feeToTreasuryBP) / totalFeeBP  
     * - Founder: (feeAmount * feeToFounderBP) / totalFeeBP
     * - Burn: (feeAmount * feeToBurnBP) / totalFeeBP
     * - User receives: value - feeAmount
     * 
     * SECURITY ANALYSIS:
     * ✅ Proper exemption logic for minting/burning
     * ✅ Fee calculations use safe math (no overflow in modern Solidity)
     * ✅ Burns happen after transfers to prevent balance issues
     * ⚠️  Multiple transfers increase gas cost significantly  
     * ⚠️  No validation that fee percentages sum to totalFeeBP
     * ⚠️  Potential for rounding errors in fee distribution
     * 
     * GAS OPTIMIZATION OPPORTUNITIES:
     * - Batch multiple transfers in single operation
     * - Pre-calculate fee amounts to avoid repeated calculations
     * - Consider using assembly for gas savings
     * 
     * POTENTIAL VULNERABILITIES:
     * - Fee-on-transfer tokens can break DEX integrations if not handled properly
     * - Multiple _update calls could theoretically trigger reentrancy (mitigated by ERC20 design)
     * - Rounding down in fee calculations could lead to dust accumulation
     */
    function _update(address from, address to, uint256 value) internal override {
        // Skip fees for mint/burn operations, zero fees, or exempt addresses
        if (from == address(0) || to == address(0) || totalFeeBP == 0 || isFeeExempt[from] || isFeeExempt[to]) {
            super._update(from, to, value);
            if (from != address(0) && to != address(0)) emit Fingered(from, to, value);
            return;
        }
        
        // Calculate total fee amount
        uint256 feeAmount = (value * totalFeeBP) / 10_000;
        
        // Calculate individual fee distributions
        // NOTE: These calculations could result in rounding errors
        uint256 toTreasury = (feeAmount * feeToTreasuryBP) / totalFeeBP;
        uint256 toFounder  = (feeAmount * feeToFounderBP)  / totalFeeBP;
        uint256 toBurn     = (feeAmount * feeToBurnBP)     / totalFeeBP;
        
        // Calculate amount recipient actually receives
        uint256 sendAmount = value - feeAmount;
        
        // Execute main transfer (user receives reduced amount)
        super._update(from, to, sendAmount);
        
        // Execute fee transfers (only if amounts > 0 to save gas)
        if (toTreasury > 0) super._update(from, treasury, toTreasury);
        if (toFounder  > 0) super._update(from, founderWallet, toFounder);
        if (toBurn     > 0) _burn(from, toBurn);
        
        // Emit event with original transfer amount for transparency
        emit Fingered(from, to, value);
    }
    
    // =============================================================
    //                      MISSING EVENTS
    // =============================================================
    
    /// @notice Emitted when fee configuration changes
    event FeeConfigurationChanged(uint256 oldFee, uint256 newFee);
}
