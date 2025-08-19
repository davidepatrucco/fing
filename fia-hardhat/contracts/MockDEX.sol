// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockLP is ERC20 {
    address public minter;
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        minter = msg.sender;
    }
    function mint(address to, uint256 amount) external {
        require(msg.sender == minter, "Only minter");
        _mint(to, amount);
    }
    function burn(address from, uint256 amount) external {
        require(msg.sender == minter, "Only minter");
        _burn(from, amount);
    }
    // notify DEX on LP transfers/mints/burns
    function _afterTokenTransfer(address from, address to, uint256 amount) internal {
        // call back to DEX to sync balances, swallow failures to remain test-friendly
        if (minter != address(0)) {
            // Using low-level call to avoid ABI dependency
            (bool success, ) = minter.call(abi.encodeWithSignature("onLPTransfer(address,address,address,uint256)", address(this), from, to, amount));
            success; // ignore result
        }
    }
}

contract MockDEX {
    // mapping of pair hash to LP token and reserves
    struct Pair {
        address token0;
        address token1;
        address lp;
        uint256 reserve0; // corresponds to token0
        uint256 reserve1; // corresponds to token1
    }

    mapping(bytes32 => Pair) public pairs;
    // map LP token address -> pair hash for quick lookup in hooks
    mapping(address => bytes32) public lpToPair;
    // track LP holder balances per pair
    mapping(bytes32 => mapping(address => uint256)) public lpHolderBalance;

    event LiquidityAdded(address indexed provider, address tokenA, address tokenB, uint256 amountA, uint256 amountB, address lp);
    event LiquidityRemoved(address indexed provider, address tokenA, address tokenB, uint256 amountA, uint256 amountB, address lp);
    event Swapped(address indexed user, address fromToken, address toToken, uint256 amountIn, uint256 amountOut);

    function _pairHash(address a, address b) internal pure returns (bytes32) {
        if (a < b) {
            return keccak256(abi.encodePacked(a, b));
        }
        return keccak256(abi.encodePacked(b, a));
    }

    function addLiquidity(address tokenA, address tokenB, uint256 amountA, uint256 amountB) external returns (address) {
        require(amountA > 0 && amountB > 0, "Invalid amounts");
        IERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).transferFrom(msg.sender, address(this), amountB);

        bytes32 h = _pairHash(tokenA, tokenB);
        Pair storage p = pairs[h];

        address token0 = tokenA;
        address token1 = tokenB;
        uint256 amt0 = amountA;
        uint256 amt1 = amountB;
        if (token1 < token0) {
            // ensure ordering
            token0 = tokenB;
            token1 = tokenA;
            amt0 = amountB;
            amt1 = amountA;
        }

        if (p.lp == address(0)) {
            // deploy a new LP token
            string memory name = "Mock LP";
            string memory symbol = "MLP";
            MockLP lp = new MockLP(name, symbol);
            p.lp = address(lp);
            lpToPair[p.lp] = h;
            p.token0 = token0;
            p.token1 = token1;
            // initial reserves
            p.reserve0 = amt0;
            p.reserve1 = amt1;

            // mint initial LP equal to sqrt(amt0 * amt1) approximated by geometric mean
            uint256 liquidity = _sqrt(amt0 * amt1);
            MockLP(p.lp).mint(msg.sender, liquidity);
            // onLPTransfer hook will update lpHolderBalance via callback, but set initial balance explicitly as well
            lpHolderBalance[h][msg.sender] = MockLP(p.lp).balanceOf(msg.sender);
        } else {
            // existing pool: mint LP proportionally
            uint256 totalSupply = MockLP(p.lp).totalSupply();
            // compute amounts in correct order
            uint256 add0 = amt0;
            uint256 add1 = amt1;
            if (p.token0 != token0) {
                // swap mapping if needed
                add0 = amt1;
                add1 = amt0;
            }

            // liquidity minted = min(add0 * totalSupply / reserve0, add1 * totalSupply / reserve1)
            uint256 liq0 = (add0 * totalSupply) / p.reserve0;
            uint256 liq1 = (add1 * totalSupply) / p.reserve1;
            uint256 liquidity = liq0 < liq1 ? liq0 : liq1;
            MockLP(p.lp).mint(msg.sender, liquidity);

            // update holder mapping
            lpHolderBalance[h][msg.sender] = MockLP(p.lp).balanceOf(msg.sender);

            // update reserves
            if (p.token0 == token0) {
                p.reserve0 += add0;
                p.reserve1 += add1;
            } else {
                p.reserve0 += add1;
                p.reserve1 += add0;
            }
        }

        emit LiquidityAdded(msg.sender, tokenA, tokenB, amountA, amountB, p.lp);
        return p.lp;
    }

    // Uniswap-like swap with 0.3% fee
    function swap(address fromToken, address toToken, uint256 amountIn) external returns (uint256) {
        require(amountIn > 0, "Invalid amount");
        bytes32 h = _pairHash(fromToken, toToken);
        Pair storage p = pairs[h];
        require(p.lp != address(0), "Pair not found");

        // determine reserves ordering
        bool fromIs0 = (fromToken == p.token0);
        (uint256 reserveIn, uint256 reserveOut) = fromIs0 ? (p.reserve0, p.reserve1) : (p.reserve1, p.reserve0);

        // transfer in
        IERC20(fromToken).transferFrom(msg.sender, address(this), amountIn);

        // Uniswap v2 formula with 0.3% fee
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        uint256 amountOut = numerator / denominator;

        require(amountOut > 0 && reserveOut >= amountOut, "Insufficient liquidity");

        // transfer out
        IERC20(toToken).transfer(msg.sender, amountOut);

        // update reserves
        if (fromIs0) {
            p.reserve0 += amountIn;
            p.reserve1 -= amountOut;
        } else {
            p.reserve1 += amountIn;
            p.reserve0 -= amountOut;
        }

        emit Swapped(msg.sender, fromToken, toToken, amountIn, amountOut);
        return amountOut;
    }

    /**
     * @notice Remove liquidity by burning LP tokens and returning proportional underlying tokens
     */
    function removeLiquidity(address tokenA, address tokenB, uint256 lpAmount) external returns (uint256 amountA, uint256 amountB) {
        require(lpAmount > 0, "Invalid lp amount");
        bytes32 h = _pairHash(tokenA, tokenB);
        Pair storage p = pairs[h];
        require(p.lp != address(0), "Pair not found");

        MockLP lp = MockLP(p.lp);
        uint256 totalSupply = lp.totalSupply();
        require(totalSupply > 0, "No liquidity");
        uint256 userBalance = lp.balanceOf(msg.sender);
        require(userBalance >= lpAmount, "Insufficient LP balance");

        // compute amounts based on reserves
        // ensure ordering matches token0/token1
        uint256 out0 = (lpAmount * p.reserve0) / totalSupply;
        uint256 out1 = (lpAmount * p.reserve1) / totalSupply;

    // burn LP tokens from user (MockLP burn callable only by DEX)
    lp.burn(msg.sender, lpAmount);

    // update holder mapping
    lpHolderBalance[h][msg.sender] = lp.balanceOf(msg.sender);

        // update reserves and transfer underlying
        p.reserve0 -= out0;
        p.reserve1 -= out1;

        // map ordering: tokenA and tokenB can be in either order compared to token0/token1
        if (tokenA == p.token0) {
            IERC20(tokenA).transfer(msg.sender, out0);
            IERC20(tokenB).transfer(msg.sender, out1);
            amountA = out0;
            amountB = out1;
        } else {
            IERC20(tokenA).transfer(msg.sender, out1);
            IERC20(tokenB).transfer(msg.sender, out0);
            amountA = out1;
            amountB = out0;
        }

        emit LiquidityRemoved(msg.sender, tokenA, tokenB, amountA, amountB, p.lp);
        return (amountA, amountB);
    }

    // Called by MockLP via transfer hooks to keep lpHolderBalance in sync
    function onLPTransfer(address lpAddr, address from, address to, uint256 /*amount*/) external {
        // only accept calls from LP token
        bytes32 h = lpToPair[lpAddr];
        require(h != bytes32(0), "Unknown LP");
        // update both from and to balances
        if (from != address(0)) {
            lpHolderBalance[h][from] = MockLP(lpAddr).balanceOf(from);
        }
        if (to != address(0)) {
            lpHolderBalance[h][to] = MockLP(lpAddr).balanceOf(to);
        }
    }

    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
