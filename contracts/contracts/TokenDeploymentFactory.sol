// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./BalancedCreatorToken.sol";
import "./IBalancedCreatorToken.sol";

/**
 * @title TokenDeploymentFactory
 * @dev Separate factory contract for deploying creator tokens
 * This keeps the main factory contract smaller by isolating deployment logic
 */
contract TokenDeploymentFactory is Ownable {
    
    // Track deployed tokens
    mapping(address => address[]) public creatorTokens; // creator => token addresses
    address[] public allTokens;
    
    event TokenDeployed(
        address indexed creator,
        address indexed tokenAddress,
        string name,
        string symbol,
        uint256 initialSupply,
        address platformContract
    );
    
    constructor() Ownable() {}
    
   
    // Authorized contracts that can deploy tokens
    mapping(address => bool) public authorizedDeployers;
    
    modifier onlyAuthorizedDeployer() {
        require(authorizedDeployers[msg.sender] || msg.sender == owner(), "Not authorized deployer");
        _;
    }
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
    ) external onlyAuthorizedDeployer returns (address tokenAddress) {
        
        // Deploy new BalancedCreatorToken
        BalancedCreatorToken newToken = new BalancedCreatorToken(
            name,
            symbol,
            creator,
            platformContract,
            initialSupply
        );
        
        tokenAddress = address(newToken);
        
        // Track the deployed token
        creatorTokens[creator].push(tokenAddress);
        allTokens.push(tokenAddress);
        
        emit TokenDeployed(
            creator,
            tokenAddress,
            name,
            symbol,
            initialSupply,
            platformContract
        );
        
        return tokenAddress;
    }
    
    /**
     * @dev Get all tokens deployed for a creator
     */
    function getCreatorTokens(address creator) external view returns (address[] memory) {
        return creatorTokens[creator];
    }
    
    /**
     * @dev Get all deployed tokens
     */
    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }
    
    /**
     * @dev Get total number of deployed tokens
     */
    function getTotalTokensDeployed() external view returns (uint256) {
        return allTokens.length;
    }
    
    /**
     * @dev Authorize a contract to deploy tokens
     */
    function authorizeDeployer(address deployer) external onlyOwner {
        authorizedDeployers[deployer] = true;
    }
    
    /**
     * @dev Remove authorization from a deployer
     */
    function revokeDeployer(address deployer) external onlyOwner {
        authorizedDeployers[deployer] = false;
    }
}