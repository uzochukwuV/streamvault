// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IBalancedCreatorToken
 * @dev Interface for BalancedCreatorToken to enable loose coupling
 */
interface IBalancedCreatorToken {
    // ERC20 functions
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    
    // Creator token specific functions
    function creator() external view returns (address);
    function tradingPaused() external view returns (bool);
    function platformContract() external view returns (address);
    
    // Revenue functions
    function distributeRevenue(uint256 perTokenAmount) external payable;
    function claimRevenue() external;
    function pendingRevenue(address holder) external view returns (uint256);
    
    // Platform management
    function mint(address to, uint256 amount) external;
    function pauseTrading() external;
    function unpauseTrading() external;
    
    // Anti-manipulation tracking
    function lastTradeTime(address user) external view returns (uint256);
    function dailyTradeVolume(address user) external view returns (uint256);
    function dailyVolumeResetTime(address user) external view returns (uint256);
}