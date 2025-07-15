#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { TelegramBot } from './services/telegramBot.js';
import { TONConnectService } from './services/tonConnect.js';
import { AnalyticsService } from './services/analytics.js';
import { DatabaseService } from './services/database.js';
import { AIService } from './services/ai.js';
import { WebServer } from './services/webServer.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Simple lock mechanism to prevent multiple instances
const lockFile = path.join(process.cwd(), '.bot-lock');

if (fs.existsSync(lockFile)) {
  console.error('Another instance of the bot is already running. Exiting...');
  process.exit(1);
}

// Create lock file
fs.writeFileSync(lockFile, process.pid.toString());

// Clean up lock file on exit
process.on('exit', () => {
  try {
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
    }
  } catch (error) {
    console.error('Error removing lock file:', error);
  }
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...');
  process.exit(0);
});

class ChannelSenseTONServer {
  constructor() {
    this.server = new Server(
      {
        name: 'channelsense-ton',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.initializeServices();
  }

  async initializeServices() {
    try {
      // Initialize database
      this.database = new DatabaseService();
      await this.database.initialize();

      // Initialize AI service
      this.aiService = new AIService();

      // Initialize TON Connect service
      this.tonConnect = new TONConnectService();

      // Initialize analytics service
      this.analytics = new AnalyticsService(this.database, this.aiService);

      // Initialize web server for TON Connect
      this.webServer = new WebServer(this.tonConnect, this.database);
      await this.webServer.start();

      // Initialize Telegram bot
      this.telegramBot = new TelegramBot(
        this.database,
        this.tonConnect,
        this.analytics,
        this.aiService
      );
      await this.telegramBot.initialize();

      // Set up TON Connect callback to notify Telegram bot
      this.tonConnect.setWalletConnectedCallback(async (userId, walletInfo) => {
        console.log(`Wallet connected for user ${userId}:`, walletInfo.address);
        // The telegram bot will handle the notification through the waitForConnection method
      });

      console.log('ChannelSense TON MCP Server initialized successfully');
    } catch (error) {
      console.error('Failed to initialize services:', error);
      process.exit(1);
    }
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'analyze_channel',
          description: 'Analyze Telegram channel activity and user engagement',
          inputSchema: {
            type: 'object',
            properties: {
              chatId: {
                type: 'string',
                description: 'Telegram chat ID to analyze',
              },
              period: {
                type: 'string',
                enum: ['day', 'week', 'month'],
                description: 'Analysis period',
              },
            },
            required: ['chatId'],
          },
        },
        {
          name: 'get_top_users',
          description: 'Get top active users in a channel',
          inputSchema: {
            type: 'object',
            properties: {
              chatId: {
                type: 'string',
                description: 'Telegram chat ID',
              },
              limit: {
                type: 'number',
                description: 'Number of top users to return (default: 10)',
              },
              period: {
                type: 'string',
                enum: ['day', 'week', 'month'],
                description: 'Period for analysis (default: week)',
              },
            },
            required: ['chatId'],
          },
        },
        {
          name: 'connect_wallet',
          description: 'Generate TON Connect link for user wallet connection',
          inputSchema: {
            type: 'object',
            properties: {
              userId: {
                type: 'string',
                description: 'Telegram user ID',
              },
            },
            required: ['userId'],
          },
        },
        {
          name: 'mint_nft_reward',
          description: 'Mint NFT reward for top users',
          inputSchema: {
            type: 'object',
            properties: {
              chatId: {
                type: 'string',
                description: 'Telegram chat ID',
              },
              userIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of user IDs to reward',
              },
            },
            required: ['chatId', 'userIds'],
          },
        },
        {
          name: 'get_channel_sentiment',
          description: 'Analyze overall sentiment in a channel',
          inputSchema: {
            type: 'object',
            properties: {
              chatId: {
                type: 'string',
                description: 'Telegram chat ID',
              },
              period: {
                type: 'string',
                enum: ['day', 'week', 'month'],
                description: 'Period for sentiment analysis',
              },
            },
            required: ['chatId'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'analyze_channel':
            return await this.handleAnalyzeChannel(args);
          case 'get_top_users':
            return await this.handleGetTopUsers(args);
          case 'connect_wallet':
            return await this.handleConnectWallet(args);
          case 'mint_nft_reward':
            return await this.handleMintNFTReward(args);
          case 'get_channel_sentiment':
            return await this.handleGetChannelSentiment(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing tool: ${error.message}`
        );
      }
    });
  }

  async handleAnalyzeChannel(args) {
    const { chatId, period = 'week' } = args;
    const analysis = await this.analytics.analyzeChannel(chatId, period);
    
    return {
      content: [
        {
          type: 'text',
          text: `Channel Analysis for ${chatId}:
          
📊 **Activity Summary (${period})**
- Total Messages: ${analysis.totalMessages}
- Active Users: ${analysis.activeUsers}
- Average Messages per User: ${analysis.avgMessagesPerUser}

👥 **Top Contributors:**
${analysis.topUsers.map((user, index) => 
  `${index + 1}. ${user.username || user.firstName} (${user.messageCount} messages)`
).join('\n')}

📈 **Engagement Metrics:**
- Message Growth: ${analysis.growth}%
- Peak Activity Hour: ${analysis.peakHour}
- Most Active Day: ${analysis.mostActiveDay}

🎯 **AI Insights:**
${analysis.aiInsights}`,
        },
      ],
    };
  }

  async handleGetTopUsers(args) {
    const { chatId, limit = 10, period = 'week' } = args;
    const topUsers = await this.analytics.getTopUsers(chatId, period, limit);
    
    return {
      content: [
        {
          type: 'text',
          text: `Top ${limit} Users in ${chatId} (${period}):
          
${topUsers.map((user, index) => 
  `${index + 1}. ${user.username || user.firstName || 'Unknown'}
     Messages: ${user.messageCount}
     Engagement Score: ${user.engagementScore}
     TON Wallet: ${user.tonWallet ? '✅ Connected' : '❌ Not connected'}`
).join('\n\n')}`,
        },
      ],
    };
  }

  async handleConnectWallet(args) {
    const { userId } = args;
    const connectLink = await this.tonConnect.generateConnectLink(userId);
    
    return {
      content: [
        {
          type: 'text',
          text: `TON Wallet Connection Link for user ${userId}:
          
🔗 **Connect Link:** ${connectLink}

📱 **Instructions:**
1. Click the link above or scan QR code
2. Open in your TON wallet (Tonkeeper, Wallet in Telegram)
3. Confirm connection
4. Your wallet will be linked to your Telegram account

💎 **Benefits:**
- Receive NFT rewards for channel activity
- Access to exclusive features
- Participate in DAO governance`,
        },
      ],
    };
  }

  async handleMintNFTReward(args) {
    const { chatId, userIds } = args;
    const results = [];
    
    for (const userId of userIds) {
      try {
        const result = await this.tonConnect.mintNFTReward(userId, chatId);
        results.push(`✅ ${userId}: NFT minted successfully - ${result.transactionHash}`);
      } catch (error) {
        results.push(`❌ ${userId}: Failed to mint NFT - ${error.message}`);
      }
    }
    
    return {
      content: [
        {
          type: 'text',
          text: `NFT Reward Minting Results for ${chatId}:
          
${results.join('\n')}

🎉 **Next Steps:**
- Users will receive notifications about their NFT rewards
- NFTs can be viewed in TON wallet
- Check transaction status on TON explorer`,
        },
      ],
    };
  }

  async handleGetChannelSentiment(args) {
    const { chatId, period = 'week' } = args;
    const sentiment = await this.analytics.analyzeSentiment(chatId, period);
    
    return {
      content: [
        {
          type: 'text',
          text: `Sentiment Analysis for ${chatId} (${period}):
          
😊 **Overall Sentiment:** ${sentiment.overall}
📊 **Sentiment Breakdown:**
- Positive: ${sentiment.positive}%
- Neutral: ${sentiment.neutral}%
- Negative: ${sentiment.negative}%

🔥 **Trending Topics:**
${sentiment.trendingTopics.map(topic => `• ${topic}`).join('\n')}

📈 **Sentiment Trend:** ${sentiment.trend}

🤖 **AI Summary:**
${sentiment.summary}`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('ChannelSense TON MCP server running on stdio');
  }
}

const server = new ChannelSenseTONServer();
server.run().catch(console.error);
