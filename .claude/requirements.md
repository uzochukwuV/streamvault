# Requirements Document

## Introduction

Fluididy is an automated liquidity management system for Uniswap v4 that solves the active management burden faced by Liquidity Providers (LPs) in concentrated liquidity pools. The system uses Uniswap v4 hooks to automatically rebalance LP positions, Chainlink Automation to trigger rebalancing events, and Fhenix for confidential strategy execution to protect users from MEV attacks and strategy copying.

The core problem being solved is that Uniswap v3/v4 LPs must actively monitor and manually adjust their concentrated liquidity ranges when prices move outside their chosen bounds, or risk earning no fees and suffering impermanent loss. Fluididy automates this entire process while keeping LP strategies private.

## Requirements

### Requirement 1

**User Story:** As a liquidity provider, I want to deposit my tokens into an automated vault that manages my Uniswap v4 position, so that I can earn fees without actively monitoring and rebalancing my position.

#### Acceptance Criteria

1. WHEN a user deposits two tokens (e.g., ETH/USDC) THEN the system SHALL create a Uniswap v4 liquidity position with an initial price range
2. WHEN the user specifies deposit amounts THEN the system SHALL calculate the optimal initial liquidity range based on current market conditions
3. WHEN a deposit is made THEN the system SHALL mint fungible ERC20 LP tokens representing the user's proportional share of the vault's total assets
4. IF insufficient liquidity is provided THEN the system SHALL reject the deposit with a clear error message
5. WHEN a user wants to withdraw THEN the system SHALL allow withdrawal of their proportional share of vault assets
6. WHEN a user requests partial withdrawal THEN the system SHALL allow withdrawal of a specified percentage while maintaining their remaining position
7. WHEN fees are accrued THEN the system SHALL automatically compound them back into the user's position to increase returns
8. IF the contract is paused for emergency or upgrade THEN users SHALL still be able to withdraw their underlying assets through emergency functions

### Requirement 2

**User Story:** As a liquidity provider, I want my position to automatically rebalance when the price moves outside my range, so that my capital continues earning fees without manual intervention.

#### Acceptance Criteria

1. WHEN the asset price moves beyond the configured threshold from the liquidity range center THEN the system SHALL trigger an automatic rebalancing
2. WHEN rebalancing occurs THEN the system SHALL withdraw liquidity from the current range, calculate a new optimal range, and redeploy liquidity
3. WHEN rebalancing is triggered THEN the system SHALL use Chainlink Price Feeds to get accurate, tamper-proof price data
4. IF rebalancing fails due to slippage or other issues THEN the system SHALL retry with adjusted parameters or maintain the current position
5. WHEN rebalancing completes THEN the system SHALL emit an event with the new range parameters

### Requirement 3

**User Story:** As a liquidity provider, I want to configure my rebalancing strategy parameters, so that the automation matches my risk tolerance and investment goals.

#### Acceptance Criteria

1. WHEN setting up a position THEN the user SHALL be able to specify rebalancing threshold percentage (e.g., 2% price movement)
2. WHEN configuring strategy THEN the user SHALL be able to set liquidity range width (e.g., ±5% around current price)
3. WHEN defining parameters THEN the user SHALL be able to set minimum time between rebalances to avoid excessive gas costs
4. IF invalid parameters are provided THEN the system SHALL reject the configuration with specific validation errors
5. WHEN strategy parameters are updated THEN the system SHALL apply changes to future rebalancing events
6. WHEN the system is designed THEN it SHALL use a modular architecture that allows for future addition of new strategy types without requiring contract migration

### Requirement 4

**User Story:** As a liquidity provider, I want my rebalancing strategy to remain private, so that MEV bots and competitors cannot front-run my transactions or copy my strategy.

#### Acceptance Criteria

1. WHEN a user sets strategy parameters THEN the system SHALL encrypt and store them using Fhenix's FHE capabilities
2. WHEN rebalancing logic executes THEN the system SHALL perform computations on encrypted strategy data without revealing parameters
3. WHEN rebalancing occurs THEN external observers SHALL only see the transaction result, not the triggering conditions or strategy logic
4. IF strategy decryption fails THEN the system SHALL use safe default parameters and alert the user
5. WHEN a user connects their wallet THEN the system SHALL use their signature to grant temporary access to view their decrypted strategy parameters
6. WHEN querying position status THEN only the position owner SHALL be able to view their encrypted strategy parameters

### Requirement 5

**User Story:** As a system operator, I want Chainlink Automation to reliably trigger rebalancing when conditions are met, so that the system operates autonomously without manual intervention.

#### Acceptance Criteria

1. WHEN market conditions change THEN Chainlink Keepers SHALL check if rebalancing conditions are met for each active position
2. WHEN rebalancing conditions are satisfied THEN Chainlink Automation SHALL call the rebalance function and pay gas fees
3. WHEN the checkUpkeep function is called THEN it SHALL return true only if rebalancing is needed and profitable after gas costs
4. WHEN performUpkeep is executed THEN it SHALL re-validate that the rebalancing action is still profitable after accounting for current gas prices and potential slippage, canceling if not
5. IF Chainlink Automation fails THEN the system SHALL have fallback mechanisms to prevent positions from becoming permanently inactive
6. WHEN automation triggers THEN the system SHALL validate that the caller is an authorized Chainlink Keeper

### Requirement 6

**User Story:** As a liquidity provider, I want to monitor my position performance and rebalancing history, so that I can track returns and optimize my strategy.

#### Acceptance Criteria

1. WHEN viewing position details THEN the user SHALL see current liquidity range, total value locked, and fees earned
2. WHEN checking history THEN the user SHALL see a log of all rebalancing events with timestamps and price ranges
3. WHEN calculating performance THEN the system SHALL display APY, impermanent loss, and total returns compared to holding
4. IF data is unavailable THEN the system SHALL show appropriate loading states or error messages
5. WHEN exporting data THEN the user SHALL be able to download their position history for tax or analysis purposes

### Requirement 7

**User Story:** As a developer, I want the system's hook contract to be secure, efficient, and expose the necessary functions for external automation, so that it integrates seamlessly with Uniswap v4 and Chainlink.

#### Acceptance Criteria

1. WHEN the rebalance function is designed THEN it SHALL be securely callable only by authorized Chainlink Keepers or the contract owner
2. WHEN rebalancing executes THEN it SHALL minimize gas costs by performing all liquidity removal and addition within a single transaction
3. WHEN the hook is deployed THEN it SHALL implement proper access controls and reentrancy guards on all critical functions
4. IF hook execution fails THEN it SHALL not prevent normal pool operations from continuing
5. WHEN deploying the hook THEN it SHALL be compatible with Uniswap v4's security and governance requirements

### Requirement 8

**User Story:** As a system stakeholder, I want the system to meet high security and performance standards, so that it can safely manage significant amounts of user funds.

#### Acceptance Criteria

1. WHEN the system is deployed to mainnet THEN it SHALL be audited by a reputable third-party security firm
2. WHEN performing any state-changing operation THEN the system SHALL implement reentrancy guards to prevent attack vectors
3. WHEN administrative functions are needed THEN they SHALL be restricted to a multisig wallet with appropriate timelock delays
4. WHEN measuring gas efficiency THEN the cost for a standard rebalancing operation SHALL be benchmarked and optimized to be competitive with similar protocols
5. IF emergency situations arise THEN the system SHALL have pause functionality that allows safe user withdrawals while preventing new deposits