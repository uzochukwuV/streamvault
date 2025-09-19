#!/usr/bin/env node

/**
 * Database Migration Script
 *
 * Sets up the PostgreSQL database for StreamVault V2 with blockchain integration
 *
 * Usage:
 *   npm run db:migrate
 *
 * Environment variables required:
 *   - DATABASE_URL: PostgreSQL connection string
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { checkDatabaseConnection } from '../lib/database';

const execAsync = promisify(exec);

async function main() {
  console.log(`🗄️  Starting database migration at ${new Date().toISOString()}`);

  try {
    // Check if database connection is available
    console.log('🔌 Testing database connection...');
    const isConnected = await checkDatabaseConnection();

    if (!isConnected) {
      console.error('❌ Database connection failed');
      console.error('Please check your DATABASE_URL environment variable');
      process.exit(1);
    }

    console.log('✅ Database connection successful');

    // Generate Prisma client
    console.log('🔧 Generating Prisma client...');
    await execAsync('npx prisma generate');
    console.log('✅ Prisma client generated');

    // Run database migrations
    console.log('🚀 Running database migrations...');
    await execAsync('npx prisma db push');
    console.log('✅ Database schema updated');

    // Seed initial data if needed
    console.log('🌱 Checking for seed data...');
    await seedInitialData();

    console.log(`✅ Database migration completed at ${new Date().toISOString()}`);
    process.exit(0);

  } catch (error: any) {
    console.error(`❌ Migration failed:`, error.message);
    console.error(error.stdout || error.stderr || error.stack);
    process.exit(1);
  }
}

/**
 * Seed initial data for development/testing
 */
async function seedInitialData(): Promise<void> {
  const { prisma } = await import('../lib/database');

  try {
    // Check if we need to seed data
    const userCount = await prisma.user.count();

    if (userCount > 0) {
      console.log(`📊 Database already has ${userCount} users, skipping seed`);
      return;
    }

    console.log('🌱 Seeding initial development data...');

    // Create test users and creators
    const testUser1 = await prisma.user.create({
      data: {
        username: 'test-artist-1',
        displayName: 'Test Artist One',
        email: 'artist1@example.com',
        walletAddress: '0x1234567890123456789012345678901234567890',
        bio: 'A test artist for development',
        isVerified: true,
      },
    });

    const testCreator1 = await prisma.creator.create({
      data: {
        userId: testUser1.id,
        stageName: 'Test Artist',
        genre: ['Electronic', 'Ambient'],
        description: 'Test creator for oracle development',
        walletAddress: '0x1234567890123456789012345678901234567890',
        totalPlays: 25000,
        followerCount: 3000,
        monthlyRevenue: '50.0',
        engagementScore: 75,
      },
    });

    // Create sample tracks
    await prisma.track.create({
      data: {
        title: 'Test Track 1',
        description: 'A sample track for testing',
        genre: 'Electronic',
        duration: 240,
        fileHash: 'QmTestHash1234567890',
        fileName: 'test-track-1.mp3',
        fileSize: 5242880, // 5MB
        playCount: 15000,
        likeCount: 450,
        creatorId: testCreator1.id,
        publishedAt: new Date(),
      },
    });

    await prisma.track.create({
      data: {
        title: 'Test Track 2',
        description: 'Another sample track',
        genre: 'Ambient',
        duration: 360,
        fileHash: 'QmTestHash0987654321',
        fileName: 'test-track-2.mp3',
        fileSize: 7340032, // 7MB
        playCount: 10000,
        likeCount: 320,
        creatorId: testCreator1.id,
        publishedAt: new Date(),
      },
    });

    console.log('✅ Development seed data created');
    console.log('📊 Created 1 test user, 1 creator, and 2 tracks');

  } catch (error: any) {
    console.error('❌ Seeding failed:', error.message);
    throw error;
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

// Run the migration
main();