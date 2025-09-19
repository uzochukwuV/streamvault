#!/usr/bin/env node

/**
 * Creator Metrics Sync Script
 *
 * This script runs as a cron job to sync creator metrics from PostgreSQL to blockchain
 * Recommended schedule: Every hour
 *
 * Usage:
 *   node scripts/sync-creator-metrics.ts
 *
 * Environment variables required:
 *   - PRIVATE_KEY: Oracle wallet private key
 *   - DATABASE_URL: PostgreSQL connection string
 */

import { creatorMetricsOracle } from "../services/CreatorMetricsOracle";
import { checkDatabaseConnection, oracleLogDB } from "../lib/database";

async function main() {
  console.log(`🚀 Starting creator metrics sync job at ${new Date().toISOString()}`);

  try {
    // Check database connection
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    console.log('✅ Database connection verified');

    // Sync all creator metrics with detailed logging
    await creatorMetricsOracle.syncAllCreatorMetrics();

    // Log successful completion
    console.log(`✅ Sync job completed successfully at ${new Date().toISOString()}`);

    // Get recent sync statistics for reporting
    const stats = await oracleLogDB.getSyncStats(1); // Last hour
    console.log(`📊 Sync stats: ${stats.success}/${stats.total} successful (${(stats.successRate * 100).toFixed(1)}%)`);

    process.exit(0);

  } catch (error: any) {
    console.error(`❌ Sync job failed:`, error.message);
    console.error("Stack trace:", error.stack);

    // Exit with error code for cron job monitoring
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled promise rejection:', reason);
  process.exit(1);
});

// Run the sync job
main();