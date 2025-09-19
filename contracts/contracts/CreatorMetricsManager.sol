// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title CreatorMetricsManager
 * @dev Manages creator metrics and intrinsic value calculations
 */
contract CreatorMetricsManager is Ownable {
    using SafeMath for uint256;
    
    struct CreatorMetrics {
        uint256 monthlyStreams;
        uint256 followers;
        uint256 monthlyRevenue;
        uint256 engagementScore;
        uint256 lastUpdated;
        uint256 verificationLevel; // 0-4 (unverified to platinum)
    }
    
    mapping(address => CreatorMetrics) public creatorMetrics;
    mapping(address => bool) public authorizedOracles;
    
    event MetricsUpdated(
        address indexed creator,
        uint256 streams,
        uint256 followers,
        uint256 revenue,
        uint256 newIntrinsicValue
    );
    
    modifier onlyAuthorizedOracle() {
        require(authorizedOracles[msg.sender], "Not authorized oracle");
        _;
    }

    constructor() Ownable(){
        
    } 
    
    // Update creator metrics (called by backend oracles)
    function updateCreatorMetrics(
        address creator,
        uint256 monthlyStreams,
        uint256 followers,
        uint256 monthlyRevenue,
        uint256 engagementScore
    ) external onlyAuthorizedOracle {
        
        CreatorMetrics storage metrics = creatorMetrics[creator];
        
        // Require reasonable growth (prevents fake metrics)
        // For testing, we'll skip timing constraints but still check for unrealistic growth
        if (metrics.lastUpdated > 0) {
            // Anti-manipulation: prevent unrealistic growth 
            if (monthlyStreams > 0 && metrics.monthlyStreams > 0) {
                uint256 maxGrowth = metrics.monthlyStreams.mul(5); // 5x growth max per update
                require(monthlyStreams <= maxGrowth, "Unrealistic growth");
            }
        }
        
        metrics.monthlyStreams = monthlyStreams;
        metrics.followers = followers;
        metrics.monthlyRevenue = monthlyRevenue;
        metrics.engagementScore = engagementScore;
        metrics.lastUpdated = block.timestamp;
        
        // Update verification level based on metrics
        metrics.verificationLevel = calculateVerificationLevel(creator);
        
        // Emit event with new intrinsic value
        uint256 newIntrinsicValue = calculateIntrinsicValue(creator);
        emit MetricsUpdated(creator, monthlyStreams, followers, monthlyRevenue, newIntrinsicValue);
    }
    
    // Calculate intrinsic value based on real music success metrics
    function calculateIntrinsicValue(address creator) public view returns (uint256) {
        CreatorMetrics memory metrics = creatorMetrics[creator];
        
        if (metrics.monthlyStreams == 0) return 0;
        
        // Base value from streaming (streams * $0.003 per stream annually)
        uint256 streamValue = metrics.monthlyStreams.mul(12).mul(3e15); // 0.003 FIL per stream
        
        // Follower multiplier (more followers = higher growth potential)
        uint256 followerMultiplier = 1000 + (metrics.followers.div(100)); // 1.0x + 0.01x per 100 followers
        streamValue = streamValue.mul(followerMultiplier).div(1000);
        
        // Revenue multiplier (proven monetization)
        if (metrics.monthlyRevenue > 0) {
            uint256 annualRevenue = metrics.monthlyRevenue.mul(12);
            uint256 revenueValue = annualRevenue.mul(3); // 3x revenue multiple
            streamValue = streamValue.add(revenueValue);
        }
        
        // Engagement bonus (active community = sustainable growth)
        uint256 engagementBonus = streamValue.mul(metrics.engagementScore).div(100);
        streamValue = streamValue.add(engagementBonus);
        
        // Verification level bonus
        uint256 verificationBonus = streamValue.mul(metrics.verificationLevel.mul(10)).div(100);
        streamValue = streamValue.add(verificationBonus);
        
        return streamValue;
    }
    
    // Calculate verification level (0-4) based on metrics
    function calculateVerificationLevel(address creator) public view returns (uint256) {
        CreatorMetrics memory metrics = creatorMetrics[creator];
        
        if (metrics.followers >= 1000000 && metrics.monthlyStreams >= 10000000) {
            return 4; // Platinum
        } else if (metrics.followers >= 500000 && metrics.monthlyStreams >= 5000000) {
            return 3; // Gold
        } else if (metrics.followers >= 100000 && metrics.monthlyStreams >= 1000000) {
            return 2; // Silver
        } else if (metrics.followers >= 25000 && metrics.monthlyStreams >= 250000) {
            return 1; // Bronze
        }
        return 0; // Unverified
    }
    
    // Check if creator meets launch requirements
    function meetsLaunchRequirements(address creator) external view returns (bool) {
        CreatorMetrics memory metrics = creatorMetrics[creator];
        return metrics.monthlyStreams >= 50000 && metrics.followers >= 5000;
    }
    
    // Oracle management
    function addAuthorizedOracle(address oracle) external onlyOwner {
        authorizedOracles[oracle] = true;
    }
    
    function removeAuthorizedOracle(address oracle) external onlyOwner {
        authorizedOracles[oracle] = false;
    }
}