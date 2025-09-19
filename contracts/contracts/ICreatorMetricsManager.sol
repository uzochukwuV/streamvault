// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ICreatorMetricsManager
 * @dev Interface for CreatorMetricsManager to enable loose coupling
 */
interface ICreatorMetricsManager {
    struct CreatorMetrics {
        uint256 monthlyStreams;
        uint256 followers;
        uint256 monthlyRevenue;
        uint256 engagementScore;
        uint256 lastUpdated;
        uint256 verificationLevel; // 0-4 (unverified to platinum)
    }
    
    // View functions
    function creatorMetrics(address creator) external view returns (
        uint256 monthlyStreams,
        uint256 followers,
        uint256 monthlyRevenue,
        uint256 engagementScore,
        uint256 lastUpdated,
        uint256 verificationLevel
    );
    
    function calculateIntrinsicValue(address creator) external view returns (uint256);
    
    function calculateVerificationLevel(address creator) external view returns (uint256);
    
    function meetsLaunchRequirements(address creator) external view returns (bool);
    
    // Management functions
    function updateCreatorMetrics(
        address creator,
        uint256 monthlyStreams,
        uint256 followers,
        uint256 monthlyRevenue,
        uint256 engagementScore
    ) external;
    
    function addAuthorizedOracle(address oracle) external;
    
    function removeAuthorizedOracle(address oracle) external;
    
    // Events
    event MetricsUpdated(
        address indexed creator,
        uint256 streams,
        uint256 followers,
        uint256 revenue,
        uint256 newIntrinsicValue
    );
}