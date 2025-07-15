#!/usr/bin/env node

/**
 * Weekly Rewards Scheduler
 * 
 * This script runs weekly to:
 * 1. Analyze all active channels
 * 2. Identify top contributors
 * 3. Mint NFT rewards
 * 4. Send notifications
 */

import dotenv from 'dotenv';
import { DatabaseService } from './src/services/database.js';
import { AnalyticsService } from './src/services/analytics.js';
import { TONConnectService } from './src/services/tonConnect.js';
import { TelegramBot } from './src/services/telegramBot.js';
import { AIService } from './src/services/ai.js';

dotenv.config();

class WeeklyRewardsScheduler {
  constructor() {
    this.database = new DatabaseService();
    this.aiService = new AIService();
    this.analytics = new AnalyticsService(this.database, this.aiService);
    this.tonConnect = new TONConnectService();
    this.telegramBot = new TelegramBot(
      this.database,
      this.tonConnect,
      this.analytics,
      this.aiService
    );
  }

  async initialize() {
    await this.database.initialize();
    await this.telegramBot.initialize();
    console.log('Weekly rewards scheduler initialized');
  }

  async run() {
    try {
      console.log('🚀 Starting weekly rewards process...');
      
      // Get all active channels
      const activeChannels = await this.database.getActiveChannels();
      console.log(`📊 Found ${activeChannels.length} active channels`);

      let totalRewards = 0;

      for (const channel of activeChannels) {
        try {
          console.log(`\n📈 Processing channel: ${channel.title || channel.chatId}`);
          
          // Generate weekly report
          const report = await this.analytics.generateWeeklyReport(channel.chatId);
          
          if (report.eligibleForRewards.length === 0) {
            console.log(`   ⚠️  No users eligible for rewards`);
            continue;
          }

          console.log(`   💎 ${report.eligibleForRewards.length} users eligible for rewards`);

          // Mint NFT rewards for eligible users
          const rewardResults = await this.tonConnect.batchMintRewards(
            report.eligibleForRewards.map((user, index) => ({
              userId: user.user_id,
              rank: index + 1,
              score: user.engagementScore,
              messageCount: user.messageCount
            })),
            channel.chatId
          );

          // Process reward results
          for (const result of rewardResults) {
            if (result.success) {
              // Save reward to database
              await this.database.saveNFTReward(result.userId, channel.chatId, {
                nftAddress: result.nftAddress,
                transactionHash: result.transactionHash,
                metadata: {
                  name: `Weekly Champion #${Date.now()}`,
                  channel: channel.title || channel.chatId,
                  week: new Date().toISOString().split('T')[0]
                }
              });

              // Send notification to user
              await this.telegramBot.sendNFTRewardNotification(result.userId, {
                name: `Weekly Champion #${Date.now()}`,
                channelName: channel.title || 'Channel',
                address: result.nftAddress
              });

              totalRewards++;
              console.log(`   ✅ Rewarded user ${result.userId} with NFT`);
            } else {
              console.log(`   ❌ Failed to reward user ${result.userId}: ${result.error}`);
            }
          }

          // Send channel summary
          await this.sendChannelSummary(channel.chatId, report);

        } catch (error) {
          console.error(`Error processing channel ${channel.chatId}:`, error);
        }
      }

      console.log(`\n🎉 Weekly rewards process completed!`);
      console.log(`📊 Total channels processed: ${activeChannels.length}`);
      console.log(`💎 Total NFT rewards minted: ${totalRewards}`);

    } catch (error) {
      console.error('Error in weekly rewards process:', error);
    }
  }

  async sendChannelSummary(chatId, report) {
    try {
      const summaryMessage = `
📊 **Weekly Analytics Report**

🔢 **Activity Summary:**
• Messages: ${report.summary.totalMessages}
• Active Users: ${report.summary.activeUsers}
• Growth: ${report.summary.growth > 0 ? '+' : ''}${report.summary.growth}%

🏆 **Top Contributors (Rewarded):**
${report.eligibleForRewards.slice(0, 3).map((user, index) => 
  `${index + 1}. ${user.username || user.firstName || 'Unknown'} - ${user.messageCount} messages`
).join('\n')}

🎭 **Community Sentiment:** ${report.sentiment.overall}

🤖 **AI Insights:**
${report.insights}

💡 **Recommendations:**
${report.recommendations.map(rec => `• ${rec.title}: ${rec.description}`).join('\n')}

🎁 **NFT Rewards:** ${report.eligibleForRewards.length} members received weekly champion NFTs!

Keep up the great community engagement! 🚀
      `;

      await this.telegramBot.sendToChannel(chatId, summaryMessage, { 
        parse_mode: 'Markdown' 
      });

    } catch (error) {
      console.error('Error sending channel summary:', error);
    }
  }

  async cleanup() {
    if (this.database) {
      await this.database.close();
    }
  }
}

// Main execution
async function main() {
  const scheduler = new WeeklyRewardsScheduler();
  
  try {
    await scheduler.initialize();
    await scheduler.run();
  } catch (error) {
    console.error('Scheduler error:', error);
    process.exit(1);
  } finally {
    await scheduler.cleanup();
    process.exit(0);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { WeeklyRewardsScheduler };
