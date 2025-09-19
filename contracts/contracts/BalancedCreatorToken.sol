// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title BalancedCreatorToken
 * @dev Individual Creator Token with balanced mechanics and anti-manipulation
 */
contract BalancedCreatorToken is ERC20, ReentrancyGuard {
    using SafeMath for uint256;
    
    address public creator;
    address public platformContract;
    bool public tradingPaused;
    
    mapping(address => uint256) public revenuePerToken;
    mapping(address => uint256) public claimedRevenue;
    uint256 public totalRevenueDistributed;
    
    // Anti-manipulation tracking
    mapping(address => uint256) public lastTradeTime;
    mapping(address => uint256) public dailyTradeVolume;
    mapping(address => uint256) public dailyVolumeResetTime;
    
    modifier onlyPlatform() {
        require(msg.sender == platformContract, "Only platform contract");
        _;
    }
    
    modifier tradingNotPaused() {
        require(!tradingPaused, "Trading is paused");
        _;
    }
    
    modifier antiManipulation(uint256 amount) {
        // Reset daily volume if new day
        if (block.timestamp >= dailyVolumeResetTime[msg.sender] + 1 days) {
            dailyTradeVolume[msg.sender] = 0;
            dailyVolumeResetTime[msg.sender] = block.timestamp;
        }
        
        // Check daily volume limits
        require(
            dailyTradeVolume[msg.sender].add(amount) <= totalSupply().div(10),
            "Daily volume limit exceeded"
        );
        
        // Check cooldown for large trades
        if (amount > totalSupply().div(100)) { // 1% of supply
            require(
                block.timestamp >= lastTradeTime[msg.sender] + 4 hours,
                "Large trade cooldown active"
            );
            lastTradeTime[msg.sender] = block.timestamp;
        }
        
        dailyTradeVolume[msg.sender] = dailyTradeVolume[msg.sender].add(amount);
        _;
    }
    
    constructor(
        string memory name,
        string memory symbol,
        address _creator,
        address _platformContract,
        uint256 _initialSupply
    ) ERC20(name, symbol) {
        creator = _creator;
        platformContract = _platformContract;
        _mint(_creator, _initialSupply.div(4)); // Only 25% to creator initially
        _mint(_platformContract, _initialSupply.mul(3).div(4)); // 75% held by platform for gradual release
    }
    
    // Override transfer to add anti-manipulation
    function transfer(address to, uint256 amount) 
        public 
        override 
        tradingNotPaused 
        antiManipulation(amount) 
        returns (bool) 
    {
        return super.transfer(to, amount);
    }
    
    function transferFrom(address from, address to, uint256 amount)
        public
        override
        tradingNotPaused
        antiManipulation(amount)
        returns (bool)
    {
        return super.transferFrom(from, to, amount);
    }
    
    // Distribute revenue to token holders
    function distributeRevenue(uint256 perTokenAmount) external payable onlyPlatform {
        require(msg.value > 0, "No revenue to distribute");
        
        revenuePerToken[address(this)] = revenuePerToken[address(this)].add(perTokenAmount);
        totalRevenueDistributed = totalRevenueDistributed.add(msg.value);
    }
    
    // Token holders claim their revenue share
    function claimRevenue() external nonReentrant {
        uint256 balance = balanceOf(msg.sender);
        require(balance > 0, "No tokens held");
        
        uint256 owed = balance.mul(revenuePerToken[address(this)]).sub(claimedRevenue[msg.sender]);
        require(owed > 0, "No revenue to claim");
        
        claimedRevenue[msg.sender] = claimedRevenue[msg.sender].add(owed);
        
        // Use safe call instead of transfer
        (bool success, ) = payable(msg.sender).call{value: owed}("");
        require(success, "Revenue transfer failed");
    }
    
    // Platform can mint new tokens for gradual release
    function mint(address to, uint256 amount) external onlyPlatform {
        _mint(to, amount);
    }
    
    // Emergency pause trading
    function pauseTrading() external onlyPlatform {
        tradingPaused = true;
    }
    
    function unpauseTrading() external onlyPlatform {
        tradingPaused = false;
    }
    
    // View pending revenue for holder
    function pendingRevenue(address holder) external view returns (uint256) {
        uint256 balance = balanceOf(holder);
        uint256 totalOwed = balance.mul(revenuePerToken[address(this)]);
        uint256 claimed = claimedRevenue[holder];
        
        if (totalOwed <= claimed) {
            return 0;
        }
        
        return totalOwed.sub(claimed);
    }
    
    // Prevent whale accumulation
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override {
        super._beforeTokenTransfer(from, to, amount);
        
        // Max 5% per wallet (except creator and platform)
        if (to != creator && to != platformContract && from != address(0)) {
            require(
                balanceOf(to).add(amount) <= totalSupply().div(20),
                "Max 5% per wallet exceeded"
            );
        }
    }
}