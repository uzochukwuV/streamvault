// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ITokenDeploymentFactory
 * @dev Interface for TokenDeploymentFactory to enable loose coupling
 */
interface ITokenDeploymentFactory {
    
    /**
     * @dev Deploy a new BalancedCreatorToken
     * @param creator The creator address
     * @param name Token name
     * @param symbol Token symbol  
     * @param platformContract Address of the platform contract that will manage this token
     * @param initialSupply Initial token supply
     * @return tokenAddress Address of the deployed token
     */
    function deployToken(
        address creator,
        string memory name,
        string memory symbol,
        address platformContract,
        uint256 initialSupply
    ) external returns (address tokenAddress);
    
    /**
     * @dev Get all tokens deployed for a creator
     */
    function getCreatorTokens(address creator) external view returns (address[] memory);
    
    /**
     * @dev Get all deployed tokens
     */
    function getAllTokens() external view returns (address[] memory);
    
    /**
     * @dev Get total number of deployed tokens
     */
    function getTotalTokensDeployed() external view returns (uint256);
    
    // Events
    event TokenDeployed(
        address indexed creator,
        address indexed tokenAddress,
        string name,
        string symbol,
        uint256 initialSupply,
        address platformContract
    );
}