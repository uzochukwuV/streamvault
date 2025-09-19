// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./ICreatorMetricsManager.sol";

interface IBalancedCreatorToken {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function creator() external view returns (address);
    function tradingPaused() external view returns (bool);
}

interface ICreatorTokenFactory {
    function getCreatorCoinInfo(address creator) external view returns (
        address coinAddress,
        uint256 intrinsicValue,
        uint256 circulatingSupply,
        uint256 reserveRatio,
        bool hasRevenueBacking
    );
}

contract IntegratedCreatorDEX is ReentrancyGuard, Ownable {
    using SafeMath for uint256;
    
    ICreatorTokenFactory public creatorTokenFactory;
    
    struct LiquidityPool {
        address creatorToken;
        uint256 filReserve;
        uint256 tokenReserve;
        uint256 totalLiquidity;
        uint256 liquidityLockUntil;
        bool isActive;
        mapping(address => uint256) liquidityBalances;
        mapping(address => uint256) liquidityLockTime;
    }
    
    struct TradingMetrics {
        uint256 volume24h;
        uint256 priceChange24h;
        uint256 lastPrice;
        uint256 allTimeHigh;
        uint256 allTimeLow;
        uint256 marketCap;
    }
    
    struct OrderBook {
        // uint256[] buyOrders;   // For limit orders (future feature)
        // uint256[] sellOrders;
        mapping(uint256 => address) orderOwners;
        uint256 u;
    }
    
    mapping(address => LiquidityPool) public pools;
    mapping(address => TradingMetrics) public tradingMetrics;
    mapping(address => OrderBook) public orderBooks;
    
    // Trading parameters
    uint256 public tradingFee = 30; // 0.3%
    uint256 public maxSlippage = 500; // 5%
    uint256 public minLiquidityLock = 30 days;
    
    // Circuit breakers for extreme volatility
    uint256 public maxPriceChangePercent = 5000; // 50% max change
    uint256 public circuitBreakerCooldown = 1 hours;
    
    mapping(address => uint256) public lastCircuitBreaker;
    
    event PoolCreated(address indexed creatorToken, address indexed creator);
    event LiquidityAdded(
        address indexed creatorToken, 
        address indexed provider, 
        uint256 filAmount, 
        uint256 tokenAmount,
        uint256 liquidityMinted
    );
    event LiquidityRemoved(
        address indexed creatorToken,
        address indexed provider,
        uint256 filAmount,
        uint256 tokenAmount,
        uint256 liquidityBurned
    );
    event TokensTraded(
        address indexed creatorToken,
        address indexed trader,
        uint256 filAmount,
        uint256 tokenAmount,
        bool isBuy,
        uint256 price
    );
    event CircuitBreakerTriggered(address indexed creatorToken, uint256 priceChange);
    
    constructor(address _creatorTokenFactory) {
        creatorTokenFactory = ICreatorTokenFactory(_creatorTokenFactory);
    }
    
    // Create liquidity pool for creator token
    function createPool(address creatorToken) external returns (bool) {
        require(pools[creatorToken].creatorToken == address(0), "Pool exists");
        require(!IBalancedCreatorToken(creatorToken).tradingPaused(), "Trading paused");
        
        // Verify this is a valid creator token
        (address coinAddress, uint256 intrinsicValue,,, bool hasRevenueBacking) = 
            creatorTokenFactory.getCreatorCoinInfo(IBalancedCreatorToken(creatorToken).creator());
        require(coinAddress == creatorToken, "Invalid creator token");
        require(intrinsicValue > 0, "No intrinsic value");
        
        pools[creatorToken].creatorToken = creatorToken;
        pools[creatorToken].isActive = true;
        
        // Initialize trading metrics
        tradingMetrics[creatorToken].lastPrice = intrinsicValue.div(1e18); // Convert to reasonable price
        tradingMetrics[creatorToken].allTimeHigh = tradingMetrics[creatorToken].lastPrice;
        tradingMetrics[creatorToken].allTimeLow = tradingMetrics[creatorToken].lastPrice;
        
        emit PoolCreated(creatorToken, IBalancedCreatorToken(creatorToken).creator());
        return true;
    }
    
    // Add liquidity to pool (creator or fans can provide)
    function addLiquidity(
        address creatorToken, 
        uint256 tokenAmount,
        uint256 lockDuration
    ) external payable nonReentrant returns (uint256 liquidityMinted) {
        
        LiquidityPool storage pool = pools[creatorToken];
        require(pool.isActive, "Pool not active");
        require(msg.value > 0 && tokenAmount > 0, "Invalid amounts");
        require(lockDuration >= minLiquidityLock, "Lock duration too short");
        
        // Transfer tokens from user
        require(
            IBalancedCreatorToken(creatorToken).transferFrom(msg.sender, address(this), tokenAmount),
            "Token transfer failed"
        );
        
        if (pool.totalLiquidity == 0) {
            // First liquidity provider sets initial ratio
            liquidityMinted = msg.value; // Use FIL amount as initial liquidity tokens
            pool.filReserve = msg.value;
            pool.tokenReserve = tokenAmount;
        } else {
            // Maintain existing ratio
            uint256 filRatio = msg.value.mul(pool.totalLiquidity).div(pool.filReserve);
            uint256 tokenRatio = tokenAmount.mul(pool.totalLiquidity).div(pool.tokenReserve);
            
            liquidityMinted = filRatio < tokenRatio ? filRatio : tokenRatio;
            
            // Calculate required amounts to maintain ratio
            uint256 requiredFil = liquidityMinted.mul(pool.filReserve).div(pool.totalLiquidity);
            uint256 requiredTokens = liquidityMinted.mul(pool.tokenReserve).div(pool.totalLiquidity);
            
            // Refund excess with safe call
            if (msg.value > requiredFil) {
                (bool success, ) = payable(msg.sender).call{value: msg.value.sub(requiredFil)}("");
                require(success, "Refund transfer failed");
            }
            if (tokenAmount > requiredTokens) {
                IBalancedCreatorToken(creatorToken).transfer(msg.sender, tokenAmount.sub(requiredTokens));
            }
            
            pool.filReserve = pool.filReserve.add(requiredFil);
            pool.tokenReserve = pool.tokenReserve.add(requiredTokens);
        }
        
        pool.totalLiquidity = pool.totalLiquidity.add(liquidityMinted);
        pool.liquidityBalances[msg.sender] = pool.liquidityBalances[msg.sender].add(liquidityMinted);
        pool.liquidityLockTime[msg.sender] = block.timestamp.add(lockDuration);
        
        emit LiquidityAdded(creatorToken, msg.sender, msg.value, tokenAmount, liquidityMinted);
    }
    
    // Remove liquidity (after lock period)
    function removeLiquidity(
        address creatorToken, 
        uint256 liquidityAmount
    ) external nonReentrant returns (uint256 filAmount, uint256 tokenAmount) {
        
        LiquidityPool storage pool = pools[creatorToken];
        require(liquidityAmount > 0, "Invalid amount");
        require(pool.liquidityBalances[msg.sender] >= liquidityAmount, "Insufficient liquidity");
        require(block.timestamp >= pool.liquidityLockTime[msg.sender], "Liquidity still locked");
        
        // Calculate amounts to return
        filAmount = liquidityAmount.mul(pool.filReserve).div(pool.totalLiquidity);
        tokenAmount = liquidityAmount.mul(pool.tokenReserve).div(pool.totalLiquidity);
        
        // Update pool state
        pool.liquidityBalances[msg.sender] = pool.liquidityBalances[msg.sender].sub(liquidityAmount);
        pool.totalLiquidity = pool.totalLiquidity.sub(liquidityAmount);
        pool.filReserve = pool.filReserve.sub(filAmount);
        pool.tokenReserve = pool.tokenReserve.sub(tokenAmount);
        
        // Transfer assets back with safe call
        (bool success, ) = payable(msg.sender).call{value: filAmount}("");
        require(success, "FIL transfer failed");
        IBalancedCreatorToken(creatorToken).transfer(msg.sender, tokenAmount);
        
        emit LiquidityRemoved(creatorToken, msg.sender, filAmount, tokenAmount, liquidityAmount);
    }
    
    // Buy creator tokens with FIL
    function buyTokens(
        address creatorToken,
        uint256 minTokensOut
    ) external payable nonReentrant returns (uint256 tokensOut) {
        
        require(msg.value > 0, "Must send FIL");
        
        LiquidityPool storage pool = pools[creatorToken];
        require(pool.isActive, "Pool not active");
        require(!IBalancedCreatorToken(creatorToken).tradingPaused(), "Trading paused");
        
        // Check circuit breaker
        require(
            block.timestamp >= lastCircuitBreaker[creatorToken].add(circuitBreakerCooldown),
            "Circuit breaker active"
        );
        
        // Calculate output with fee
        uint256 filWithFee = msg.value.mul(uint256(10000).sub(tradingFee)).div(10000);
        tokensOut = filWithFee.mul(pool.tokenReserve).div(pool.filReserve.add(filWithFee));
        
        require(tokensOut >= minTokensOut, "Insufficient output amount");
        require(tokensOut < pool.tokenReserve, "Insufficient liquidity");
        
        // Calculate price change and check circuit breaker
        uint256 newPrice = pool.filReserve.add(msg.value).mul(1e18).div(pool.tokenReserve.sub(tokensOut));
        
        // Skip circuit breaker for first few trades to establish price history
        if (tradingMetrics[creatorToken].lastPrice > 0 && tradingMetrics[creatorToken].volume24h > msg.value.mul(2)) {
            uint256 priceChange = newPrice > tradingMetrics[creatorToken].lastPrice ?
                newPrice.sub(tradingMetrics[creatorToken].lastPrice).mul(10000).div(tradingMetrics[creatorToken].lastPrice) :
                tradingMetrics[creatorToken].lastPrice.sub(newPrice).mul(10000).div(tradingMetrics[creatorToken].lastPrice);
            
            if (priceChange > maxPriceChangePercent) {
                lastCircuitBreaker[creatorToken] = block.timestamp;
                emit CircuitBreakerTriggered(creatorToken, priceChange);
                revert("Price change too large - circuit breaker triggered");
            }
        }
        
        // Update pool reserves
        pool.filReserve = pool.filReserve.add(msg.value);
        pool.tokenReserve = pool.tokenReserve.sub(tokensOut);
        
        // Update trading metrics
        _updateTradingMetrics(creatorToken, newPrice, msg.value);
        
        // Transfer tokens (this will trigger BalancedCreatorToken anti-manipulation checks)
        require(
            IBalancedCreatorToken(creatorToken).transfer(msg.sender, tokensOut),
            "Token transfer failed"
        );
        
        emit TokensTraded(creatorToken, msg.sender, msg.value, tokensOut, true, newPrice);
    }
    
    // Sell creator tokens for FIL
    function sellTokens(
        address creatorToken,
        uint256 tokenAmount,
        uint256 minFilOut
    ) external nonReentrant returns (uint256 filOut) {
        
        require(tokenAmount > 0, "Must send tokens");
        
        LiquidityPool storage pool = pools[creatorToken];
        require(pool.isActive, "Pool not active");
        require(!IBalancedCreatorToken(creatorToken).tradingPaused(), "Trading paused");
        
        // Transfer tokens from user (triggers anti-manipulation checks)
        require(
            IBalancedCreatorToken(creatorToken).transferFrom(msg.sender, address(this), tokenAmount),
            "Token transfer failed"
        );
        
        // Calculate FIL output with fee
        uint256 tokenAmountWithFee = tokenAmount.mul(uint256(10000).sub(tradingFee)).div(10000);
        filOut = tokenAmountWithFee.mul(pool.filReserve).div(pool.tokenReserve.add(tokenAmountWithFee));
        
        require(filOut >= minFilOut, "Insufficient output amount");
        require(filOut < pool.filReserve, "Insufficient liquidity");
        
        // Update pool reserves
        pool.tokenReserve = pool.tokenReserve.add(tokenAmount);
        pool.filReserve = pool.filReserve.sub(filOut);
        
        // Calculate new price
        uint256 newPrice = pool.filReserve.mul(1e18).div(pool.tokenReserve);
        
        // Update trading metrics
        _updateTradingMetrics(creatorToken, newPrice, filOut);
        
        // Transfer FIL to user with safe call
        (bool success, ) = payable(msg.sender).call{value: filOut}("");
        require(success, "FIL transfer failed");
        
        emit TokensTraded(creatorToken, msg.sender, filOut, tokenAmount, false, newPrice);
    }
    
    // Internal function to update trading metrics
    function _updateTradingMetrics(address creatorToken, uint256 newPrice, uint256 volume) internal {
        TradingMetrics storage metrics = tradingMetrics[creatorToken];
        
        // Update 24h volume (simplified - would need time-based tracking in production)
        metrics.volume24h = metrics.volume24h.add(volume);
        
        // Update price change
        if (metrics.lastPrice > 0) {
            metrics.priceChange24h = newPrice > metrics.lastPrice ?
                newPrice.sub(metrics.lastPrice).mul(10000).div(metrics.lastPrice) :
                metrics.lastPrice.sub(newPrice).mul(10000).div(metrics.lastPrice);
        }
        
        metrics.lastPrice = newPrice;
        
        // Update all-time high/low
        if (newPrice > metrics.allTimeHigh) {
            metrics.allTimeHigh = newPrice;
        }
        if (newPrice < metrics.allTimeLow) {
            metrics.allTimeLow = newPrice;
        }
        
        // Update market cap
        uint256 totalSupply = IBalancedCreatorToken(creatorToken).totalSupply();
        metrics.marketCap = newPrice.mul(totalSupply).div(1e18);
    }
    
    // Get expected output for buying tokens
    function getTokensOut(address creatorToken, uint256 filIn) external view returns (uint256) {
        LiquidityPool storage pool = pools[creatorToken];
        if (pool.filReserve == 0 || pool.tokenReserve == 0) return 0;
        
        uint256 filWithFee = filIn.mul(uint256(10000).sub(tradingFee)).div(10000);
        return filWithFee.mul(pool.tokenReserve).div(pool.filReserve.add(filWithFee));
    }
    
    // Get expected output for selling tokens
    function getFilOut(address creatorToken, uint256 tokenIn) external view returns (uint256) {
        LiquidityPool storage pool = pools[creatorToken];
        if (pool.filReserve == 0 || pool.tokenReserve == 0) return 0;
        
        uint256 tokenWithFee = tokenIn.mul(uint256(10000).sub(tradingFee)).div(10000);
        return tokenWithFee.mul(pool.filReserve).div(pool.tokenReserve.add(tokenWithFee));
    }
    
    // Get current token price
    function getCurrentPrice(address creatorToken) external view returns (uint256) {
        LiquidityPool storage pool = pools[creatorToken];
        if (pool.tokenReserve == 0) return 0;
        return pool.filReserve.mul(1e18).div(pool.tokenReserve);
    }
    
    // Get pool info
    function getPoolInfo(address creatorToken) external view returns (
        uint256 filReserve,
        uint256 tokenReserve,
        uint256 totalLiquidity,
        uint256 currentPrice,
        bool isActive
    ) {
        LiquidityPool storage pool = pools[creatorToken];
        currentPrice = pool.tokenReserve > 0 ? pool.filReserve.mul(1e18).div(pool.tokenReserve) : 0;
        return (
            pool.filReserve,
            pool.tokenReserve,
            pool.totalLiquidity,
            currentPrice,
            pool.isActive
        );
    }
    
    // Admin functions
    function setTradingFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, "Fee too high"); // Max 10%
        tradingFee = _fee;
    }
    
    function pausePool(address creatorToken) external onlyOwner {
        pools[creatorToken].isActive = false;
    }
    
    function unpausePool(address creatorToken) external onlyOwner {
        pools[creatorToken].isActive = true;
    }
}