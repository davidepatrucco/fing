// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FIACoin is ERC20, Ownable {
    uint256 public constant MAX_TOTAL_FEE_BP = 200;
    uint256 public totalFeeBP = 100;     // 1%
    uint256 public feeToTreasuryBP = 50; // 0.5%
    uint256 public feeToFounderBP  = 20; // 0.2%
    uint256 public feeToBurnBP     = 30; // 0.3%

    address public treasury;
    address public founderWallet;

    mapping(address => bool) public isFeeExempt;

    event Fingered(address indexed from, address indexed to, uint256 amount);

    constructor(address _treasury, address _founder)
        ERC20("Finger In Ass", "FIA")
        Ownable(msg.sender)
    {
        require(_treasury != address(0) && _founder != address(0), "zero addr");
        treasury = _treasury;
        founderWallet = _founder;
        _mint(msg.sender, 1_000_000_000 * 10 ** decimals());
        isFeeExempt[msg.sender] = true;
        isFeeExempt[_treasury]  = true;
        isFeeExempt[_founder]   = true;
    }

    function burn(uint256 amount) external { _burn(msg.sender, amount); }

    function _update(address from, address to, uint256 value) internal override {
        if (from == address(0) || to == address(0) || totalFeeBP == 0 || isFeeExempt[from] || isFeeExempt[to]) {
            super._update(from, to, value);
            if (from != address(0) && to != address(0)) emit Fingered(from, to, value);
            return;
        }
        uint256 feeAmount = (value * totalFeeBP) / 10_000;
        uint256 toTreasury = (feeAmount * feeToTreasuryBP) / totalFeeBP;
        uint256 toFounder  = (feeAmount * feeToFounderBP)  / totalFeeBP;
        uint256 toBurn     = (feeAmount * feeToBurnBP)     / totalFeeBP;
        uint256 sendAmount = value - feeAmount;
        super._update(from, to, sendAmount);
        if (toTreasury > 0) super._update(from, treasury, toTreasury);
        if (toFounder  > 0) super._update(from, founderWallet, toFounder);
        if (toBurn     > 0) _burn(from, toBurn);
        emit Fingered(from, to, value);
    }
}
