# 🔗 Creator Metrics Oracle System

## Overview

The Creator Metrics Oracle system bridges your PostgreSQL streaming analytics with the deployed Filecoin smart contracts, enabling automatic creator coin creation and milestone tracking.

## 📁 Files Created

### Core Services
- **`services/CreatorMetricsOracle.ts`** - Main oracle service that syncs creator metrics
- **`services/BlockchainErrorHandler.ts`** - Robust error handling with retry logic
- **`services/OracleMonitor.ts`** - Health monitoring and alerting system

### Scripts
- **`scripts/sync-creator-metrics.ts`** - Cron job script for automated syncing

## 🎯 Key Features

### ✅ Completed Functionality

1. **Automated Metrics Sync**
   - Hourly sync of creator analytics to blockchain
   - Engagement score calculation (0-100 based on user interactions)
   - Milestone detection (1K, 5K, 10K, 20K, 50K plays)

2. **Smart Contract Integration**
   - Connected to deployed contracts on Filecoin Calibration testnet
   - CreatorMetricsManager: `0x4e16A7a1c32AB270961F7796AdbB46452C9dE0eE`
   - CreatorTokenFactory: `0xBE62747E099F4a361F291eb41c0eA1673C414322`

3. **Milestone-Based Coin Creation**
   - Automatic creator coin creation at 50K plays + 5K followers
   - Configurable milestone thresholds
   - Token name/symbol generation from stage names

4. **Robust Error Handling**
   - Exponential backoff retry strategy
   - Gas price adjustment on failures
   - Network congestion detection
   - Transaction replacement for stuck transactions

5. **Health Monitoring**
   - Real-time success rate tracking
   - Failed transaction monitoring
   - Performance metrics collection
   - Automated alerting system

## 🚀 How to Use

### 1. Environment Setup

Create a `.env` file with:
```bash
PRIVATE_KEY=your_oracle_wallet_private_key
DATABASE_URL=postgresql://username:password@localhost:5432/streamvault
```

### 2. Install Dependencies

```bash
npm install ethers dotenv
```

### 3. Run Manual Sync

```bash
npx ts-node scripts/sync-creator-metrics.ts
```

### 4. Set Up Cron Job

Add to your system crontab for hourly syncing:
```bash
0 * * * * cd /path/to/streamvaultv2 && npx ts-node scripts/sync-creator-metrics.ts >> logs/oracle.log 2>&1
```

### 5. Start Monitoring

```typescript
import { oracleMonitor } from './services/OracleMonitor';

// Start monitoring every 5 minutes
oracleMonitor.startMonitoring(5);

// Check system status
const status = oracleMonitor.getSystemStatus();
console.log('System Status:', status);
```

## 📊 Milestone Thresholds

The oracle tracks these milestones automatically:

| Type | Threshold | Action |
|------|-----------|--------|
| Plays | 1K, 5K, 10K, 20K | Log milestone |
| Plays | **50K** | **Create creator coin** (if 5K+ followers) |
| Followers | 1K, 5K, 10K | Log milestone |
| Revenue | 100 FIL/month | Enable revenue sharing |

## 🔄 Oracle Workflow

1. **Hourly Sync Process**:
   ```
   Get creators from database
   → Calculate engagement scores
   → Update metrics on blockchain
   → Check milestone thresholds
   → Trigger coin creation if eligible
   → Log results and update database
   ```

2. **Error Handling Flow**:
   ```
   Transaction fails
   → Classify error type
   → Apply appropriate retry strategy
   → Increase gas if needed
   → Log failure if all retries fail
   → Alert monitoring system
   ```

3. **Monitoring Flow**:
   ```
   Collect health metrics
   → Check alert thresholds
   → Generate recommendations
   → Send alerts if needed
   → Update health history
   ```

## 🔗 Smart Contract Integration

### CreatorMetricsManager Functions Used:
- `updateCreatorMetrics(address, uint256, uint256, uint256, uint256)`
- `meetsLaunchRequirements(address)`
- `calculateIntrinsicValue(address)`

### CreatorTokenFactory Functions Used:
- `launchCreatorCoin(address, string, string, uint256)`
- `getCreatorCoinInfo(address)`

## 📈 Database Integration Needed

You'll need to implement these database methods in the oracle service:

```typescript
// In CreatorMetricsOracle.ts
private async getCreatorsFromDatabase(): Promise<CreatorMetrics[]>
private async getCreatorDetails(creatorId: string)
private async updateLastSyncTimestamp(creatorId: string)
private async updateCreatorCoinStatus(creatorId: string, hasCoin: boolean, txHash: string)
private async logMilestoneAchievement(creatorId: string, milestone: MilestoneThreshold)
```

## 🚨 Monitoring & Alerts

The system monitors:
- ✅ Success rate (warning <90%, critical <70%)
- ✅ Failed transaction count
- ✅ Response times
- ✅ Network connectivity
- ✅ Data freshness

Alerts are generated for:
- Critical success rate drops
- High failure counts
- Network issues
- Stale data (no sync >2 hours)

## 📋 Next Steps

**Task 2 Complete! ✅**

Ready to move to **Task 3: Database schema updates** to integrate with your PostgreSQL database and connect the oracle to real streaming data.

**Integration Points for Task 3**:
1. Add blockchain fields to creators table
2. Create milestone tracking tables
3. Implement oracle database methods
4. Set up automated cron job
5. Connect to real streaming analytics