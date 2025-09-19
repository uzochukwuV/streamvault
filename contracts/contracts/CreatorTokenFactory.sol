// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./ICreatorMetricsManager.sol";
import "./ITokenDeploymentFactory.sol";
import "./IBalancedCreatorToken.sol";

/**
 * @title CreatorTokenFactory
 * @dev Creates and manages creator tokens with balanced tokenomics
 * Now uses a separate deployment factory to keep contract size manageable
 */
contract CreatorTokenFactory is ReentrancyGuard, Ownable {
    using SafeMath for uint256;
    
    struct CreatorCoin {
        address coinAddress;
        address creator;
        uint256 createdAt;
        uint256 totalSupply;
        uint256 circulatingSupply;
        uint256 reserveRatio; // Percentage backed by revenue
        uint256 intrinsicValue; // Calculated from real metrics
        bool hasRevenueBacking;
        uint256 liquidityLockUntil; // Prevents rugpulls
    }
    
    // Platform configuration
    uint256 public constant PLATFORM_FEE = 250; // 2.5%
    uint256 public constant MIN_LIQUIDITY_LOCK = 365 days;
    
    // External contracts
    ICreatorMetricsManager public metricsManager;
    ITokenDeploymentFactory public tokenDeploymentFactory;
    
    mapping(address => CreatorCoin) public creatorCoins;
    address[] public allCreatorCoins;
    
    event CreatorCoinLaunched(
        address indexed creator,
        address indexed coinAddress,
        uint256 intrinsicValue,
        uint256 reserveRatio
    );
    
    event RevenueDistributed(
        address indexed creator,
        uint256 amount,
        uint256 perTokenAmount
    );
    
    constructor(
        address _metricsManager,
        address _tokenDeploymentFactory
    ) Ownable() {
        metricsManager = ICreatorMetricsManager(_metricsManager);
        tokenDeploymentFactory = ITokenDeploymentFactory(_tokenDeploymentFactory);
    }
    
    modifier validCreator(address creator) {
        require(creatorCoins[creator].coinAddress != address(0), "Creator not found");
        _;
    }
    
    /**
     * @dev Launch creator coin only when metrics justify it
     * Now uses external deployment factory to keep this contract smaller
     */
    function launchCreatorCoin(
        address creator,
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) external onlyOwner returns (address) {
        require(creatorCoins[creator].coinAddress == address(0), "Coin already exists");
        require(metricsManager.meetsLaunchRequirements(creator), "Insufficient metrics");
        
        // Calculate intrinsic value based on real metrics
        uint256 intrinsicValue = metricsManager.calculateIntrinsicValue(creator);
        require(intrinsicValue > 0, "Insufficient value metrics");
        
        // Deploy new creator coin using deployment factory
        address tokenAddress = tokenDeploymentFactory.deployToken(
            creator,
            name,
            symbol,
            address(this), // This contract manages the token
            initialSupply
        );
        
        // Get creator metrics for reserve ratio calculation
        (,, uint256 monthlyRevenue,,,) = metricsManager.creatorMetrics(creator);
        
        // Set up coin data
        creatorCoins[creator] = CreatorCoin({
            coinAddress: tokenAddress,
            creator: creator,
            createdAt: block.timestamp,
            totalSupply: initialSupply,
            circulatingSupply: initialSupply.div(4), // Only 25% initially circulating
            reserveRatio: monthlyRevenue > 0 ? 2000 : 1000, // 20% or 10% reserve
            intrinsicValue: intrinsicValue,
            hasRevenueBacking: monthlyRevenue >= 1 ether, // 1 FIL minimum
            liquidityLockUntil: block.timestamp + MIN_LIQUIDITY_LOCK
        });
        
        allCreatorCoins.push(tokenAddress);
        
        emit CreatorCoinLaunched(creator, tokenAddress, intrinsicValue, creatorCoins[creator].reserveRatio);
        return tokenAddress;
    }
    
    /**
     * @dev Distribute creator revenue to token holders (monthly)
     */
    function distributeRevenue(address creator) external payable nonReentrant validCreator(creator) {
        require(msg.sender == creator, "Only creator can distribute");
        require(msg.value > 0, "No revenue to distribute");
        
        CreatorCoin storage coin = creatorCoins[creator];
        require(coin.hasRevenueBacking, "Revenue backing not enabled");
        
        // Platform takes small fee
        uint256 platformFee = msg.value.mul(PLATFORM_FEE).div(10000);
        uint256 distributionAmount = msg.value.sub(platformFee);
        
        // Calculate per-token distribution with precision check
        uint256 perTokenAmount = distributionAmount.div(coin.circulatingSupply);
        
        // Ensure minimum viable distribution to prevent precision loss
        require(perTokenAmount > 0, "Distribution amount too small for token supply");
        require(distributionAmount >= coin.circulatingSupply, "Minimum 1 wei per circulating token required");
        
        // Update coin with revenue backing
        IBalancedCreatorToken(coin.coinAddress).distributeRevenue{value: distributionAmount}(perTokenAmount);
        
        emit RevenueDistributed(creator, distributionAmount, perTokenAmount);
    }
    
    /**
     * @dev Release more tokens as creator grows (prevents initial pump)
     */
    function releaseMoreTokens(address creator, uint256 amount) external onlyOwner validCreator(creator) {
        CreatorCoin storage coin = creatorCoins[creator];
        
        // Only release based on growth milestones
        uint256 maxRelease = coin.totalSupply.sub(coin.circulatingSupply).div(4); // Max 25% at once
        require(amount <= maxRelease, "Release amount too large");
        
        // Require growth to justify release
        uint256 currentValue = metricsManager.calculateIntrinsicValue(creator);
        uint256 lastValue = coin.intrinsicValue;
        require(currentValue >= lastValue.mul(120).div(100), "Insufficient growth for release");
        
        coin.circulatingSupply = coin.circulatingSupply.add(amount);
        coin.intrinsicValue = currentValue;
        IBalancedCreatorToken(coin.coinAddress).mint(creator, amount);
    }
    
    /**
     * @dev Emergency functions for market manipulation
     */
    function pauseTrading(address creator) external onlyOwner validCreator(creator) {
        IBalancedCreatorToken(creatorCoins[creator].coinAddress).pauseTrading();
    }
    
    function unpauseTrading(address creator) external onlyOwner validCreator(creator) {
        IBalancedCreatorToken(creatorCoins[creator].coinAddress).unpauseTrading();
    }
    
    /**
     * @dev View functions
     */
    function getCreatorCoinInfo(address creator) external view returns (
        address coinAddress,
        uint256 intrinsicValue,
        uint256 circulatingSupply,
        uint256 reserveRatio,
        bool hasRevenueBacking
    ) {
        CreatorCoin memory coin = creatorCoins[creator];
        return (
            coin.coinAddress,
            coin.intrinsicValue,
            coin.circulatingSupply,
            coin.reserveRatio,
            coin.hasRevenueBacking
        );
    }
    
    function getAllCreatorCoins() external view returns (address[] memory) {
        return allCreatorCoins;
    }
    
    /**
     * @dev Update external contract addresses
     */
    function setMetricsManager(address _metricsManager) external onlyOwner {
        metricsManager = ICreatorMetricsManager(_metricsManager);
    }
    
    function setTokenDeploymentFactory(address _tokenDeploymentFactory) external onlyOwner {
        tokenDeploymentFactory = ITokenDeploymentFactory(_tokenDeploymentFactory);
    }
}