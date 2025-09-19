# 🗄️ Database Integration Documentation

## Overview

StreamVault V2 uses PostgreSQL with Prisma ORM for comprehensive data management, designed to bridge Web2 streaming analytics with Web3 creator coin economics.

## 🏗️ Architecture

### Database Design Philosophy

- **Hybrid Web3 Architecture**: 99% off-chain interactions, 1% on-chain financial transactions
- **Oracle Bridge Pattern**: Automated sync between PostgreSQL analytics and Filecoin smart contracts
- **Creator-Centric Design**: Built around creator coins, milestones, and revenue distribution
- **Analytics-First**: Optimized for high-frequency streaming analytics and engagement tracking

## 📊 Database Schema

### Core Tables

#### Users & Creators
- **`users`** - Platform users with optional wallet addresses
- **`creators`** - Verified creators with blockchain integration fields
- **`follows`** - Social following relationships

#### Content Management
- **`tracks`** - Audio content stored on Filecoin with metadata
- **`playlists`** - User-created playlists with track ordering
- **`plays`** - Individual track play events with analytics
- **`likes`**, **`comments`** - User engagement data

#### Blockchain Integration
- **`creator_milestones`** - Achievement tracking (plays, followers, revenue)
- **`oracle_sync_logs`** - Blockchain sync history and error tracking
- **`revenue_distributions`** - Quarterly profit sharing records

#### Analytics
- **`daily_stats`** - Platform-wide daily metrics
- **`creator_daily_stats`** - Creator-specific daily performance

## 🚀 Quick Setup

### 1. Database Setup

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL

# Run migrations and seed data
npm run db:migrate
```

### 2. Environment Configuration

```env
DATABASE_URL="postgresql://username:password@localhost:5432/streamvault?schema=public"
PRIVATE_KEY="your_oracle_wallet_private_key"
```

### 3. Verify Setup

```bash
# Test database connection
npm run oracle:test

# View database in browser
npm run db:studio
```

## 🔄 Oracle Integration

### Automated Metrics Sync

The oracle system automatically syncs creator metrics from PostgreSQL to Filecoin smart contracts:

```bash
# Manual sync
npm run oracle:sync

# Set up cron job (hourly)
0 * * * * cd /path/to/streamvaultv2 && npm run oracle:sync >> logs/oracle.log 2>&1
```

### Milestone Detection

Automatic creator coin creation when milestones are reached:

| Milestone | Threshold | Action |
|-----------|-----------|---------|
| Plays | 50,000 | Create creator coin (if 5K+ followers) |
| Followers | 5,000+ | Enable coin creation eligibility |
| Revenue | 100 FIL/month | Enable revenue sharing |

### Oracle Logging

All blockchain operations are logged for monitoring:

```typescript
// Sync logs include:
- Operation type (UPDATE_METRICS, CREATE_COIN, etc.)
- Transaction details (hash, gas used, block number)
- Error tracking and retry attempts
- Performance metrics
```

## 📈 Analytics & Metrics

### Creator Metrics Calculation

```typescript
// Engagement Score (0-100)
const engagementScore = {
  playToFollowerRatio: Math.min(totalPlays / followers / 10, 40), // up to 40 points
  interactionRate: Math.min((likes + comments * 2) / plays * 100, 30), // up to 30 points
  contentConsistency: Math.min(tracksPerMonth * 10, 30) // up to 30 points
};
```

### Revenue Tracking

```typescript
// Monthly revenue calculation
const monthlyRevenue = {
  trackSales: premiumTrackPurchases * trackPrices,
  tippingRevenue: fanTipsReceived,
  coinValue: creatorCoinMarketCap * 0.1, // 10% to token holders
};
```

## 🔧 Database Operations

### Common Queries

```typescript
import { prisma, creatorDB, analyticsDB } from './lib/database';

// Get creators eligible for sync
const creators = await creatorDB.getEligibleForSync();

// Calculate engagement metrics
const engagementScore = await analyticsDB.calculateEngagementScore(creatorId);

// Log milestone achievement
await milestoneDB.create(creatorId, {
  type: 'PLAYS',
  threshold: 50000,
  description: '50K plays milestone',
  currentValue: 55000
});
```

### Database Utilities

```typescript
// Health check
const isHealthy = await checkDatabaseConnection();

// Graceful shutdown
await disconnectDatabase();

// Monitoring
const syncStats = await oracleLogDB.getSyncStats(24); // last 24 hours
```

## 🔍 Monitoring & Health

### Sync Health Metrics

- **Success Rate**: Target >90% (warning <90%, critical <70%)
- **Failed Transactions**: Monitor threshold <10 per hour
- **Response Times**: Average <30 seconds
- **Data Freshness**: No sync gaps >2 hours

### Database Performance

```sql
-- Monitor table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables WHERE schemaname = 'public';

-- Index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes;
```

## 🚨 Error Handling

### Common Issues

1. **Database Connection Failures**
   ```bash
   # Check connection
   npm run oracle:test
   # Verify DATABASE_URL in .env
   ```

2. **Migration Errors**
   ```bash
   # Reset and remigrate
   npx prisma db push --force-reset
   npm run db:migrate
   ```

3. **Oracle Sync Failures**
   ```typescript
   // Check sync logs
   const recentErrors = await oracleLogDB.getRecentLogs(1);
   ```

### Retry Logic

- **Exponential Backoff**: 2s, 4s, 8s, 16s, 30s maximum
- **Gas Price Adjustment**: +20% on retry for network congestion
- **Error Classification**: Network, gas, nonce, execution errors
- **Circuit Breaker**: Automatic pause on critical failures

## 📝 Development Workflow

### Adding New Tables

1. Update `prisma/schema.prisma`
2. Run `npx prisma db push`
3. Update TypeScript types: `npx prisma generate`
4. Add database utilities in `lib/database.ts`

### Testing Changes

```bash
# Test with development data
npm run db:migrate

# Verify oracle integration
npm run oracle:test

# Monitor in real-time
npm run db:studio
```

## 🔐 Security Considerations

### Data Protection
- **Wallet Addresses**: Optional fields, encrypted at rest
- **Private Keys**: Environment variables only, never in database
- **User Data**: GDPR-compliant with soft deletion
- **Analytics**: Anonymized IP addresses and user agents

### Access Control
- **Read-Only Replicas**: For analytics dashboards
- **Connection Pooling**: Limited concurrent connections
- **Query Timeouts**: Prevent long-running queries
- **Audit Logging**: All administrative actions logged

## 🎯 Success Metrics

### Database Health
- **Uptime**: >99.9% availability
- **Query Performance**: <100ms average response time
- **Storage Growth**: Predictable scaling with user growth
- **Backup Recovery**: <1 hour RTO, <15 minutes RPO

### Oracle Performance
- **Sync Reliability**: >95% success rate
- **Blockchain Integration**: <5% failed transactions
- **Real-time Updates**: <1 hour sync delay
- **Cost Efficiency**: <$50/month in gas fees

## 🚀 Next Steps

### Task 4: Backend API Endpoints
- REST/GraphQL APIs for database access
- Authentication middleware
- Rate limiting and caching
- Real-time subscriptions

### Task 5: Enhanced Media Upload
- Filecoin storage integration
- Encryption for premium content
- CDN optimization
- Metadata extraction

---

**Task 3 Complete! ✅**

Database integration is ready with comprehensive schema, oracle bridge, and monitoring systems. The platform can now handle high-frequency streaming analytics while maintaining blockchain synchronization for creator coin economics.