import TelegramBotAPI from 'node-telegram-bot-api';
import { DatabaseService } from './database.js';

export class TelegramBot {
  constructor(database, tonConnect, analytics, aiService) {
    this.database = database;
    this.tonConnect = tonConnect;
    this.analytics = analytics;
    this.aiService = aiService;
    
    // Configure bot with better error handling
    this.bot = new TelegramBotAPI(process.env.TELEGRAM_BOT_TOKEN, { 
      polling: {
        interval: 1000,
        autoStart: false,
        params: {
          timeout: 10
        }
      }
    });
    
    // Handle polling errors
    this.bot.on('polling_error', (error) => {
      console.error('Telegram polling error:', error.message);
      
      // If conflict error, try to restart polling after delay
      if (error.message.includes('409 Conflict')) {
        console.log('Detected polling conflict, will restart polling in 5 seconds...');
        setTimeout(() => {
          this.restartPolling();
        }, 5000);
      }
    });
    
    this.setupCommands();
    this.setupMessageHandlers();
  }

  async restartPolling() {
    try {
      await this.bot.stopPolling();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.bot.startPolling();
      console.log('Telegram polling restarted successfully');
    } catch (error) {
      console.error('Error restarting polling:', error);
    }
  }

  async initialize() {
    console.log('Initializing Telegram Bot...');
    
    try {
      // Set bot profile
      await this.setupBotProfile();
      
      // Set bot commands
      await this.bot.setMyCommands([
        { command: 'start', description: 'Start the bot' },
        { command: 'guide', description: 'Complete usage guide' },
        { command: 'connect', description: 'Connect TON wallet' },
        { command: 'analyze', description: 'Analyze channel activity' },
        { command: 'top', description: 'Show top users' },
        { command: 'sentiment', description: 'Analyze channel sentiment' },
        { command: 'rewards', description: 'Check NFT rewards' },
        { command: 'help', description: 'Show help information' }
      ]);

      // Start polling manually to have better control
      await this.bot.startPolling();
      console.log('Telegram Bot initialized and polling started successfully');
      
    } catch (error) {
      console.error('Error initializing Telegram Bot:', error);
      throw error;
    }
  }

  async setupBotProfile() {
    try {
      // Set bot description
      await this.bot.setMyDescription(
        '🤖 ChannelSense TON - AI-powered channel analytics with NFT rewards\n\n' +
        '📊 Analyze channel activity and sentiment\n' +
        '💎 Connect your TON wallet for NFT rewards\n' +
        '🏆 Track top contributors and earn rewards\n' +
        '🔬 Advanced AI insights for your community\n\n' +
        'Use /start to begin and /guide for complete instructions!'
      );

      // Set bot short description
      await this.bot.setMyShortDescription(
        '🤖 AI channel analytics + TON NFT rewards. Analyze activity, connect wallet, earn NFTs!'
      );

      console.log('Bot profile updated successfully');
    } catch (error) {
      console.error('Error setting bot profile:', error);
      // Don't throw - profile setup is not critical
    }
  }

  setupCommands() {
    // Start command
    this.bot.onText(/\/start/, async (msg) => {
      console.log('Start command received:', {
        chatId: msg.chat.id,
        chatType: msg.chat.type,
        chatTitle: msg.chat.title,
        userId: msg.from.id,
        username: msg.from.username
      });

      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const chatType = msg.chat.type;

      await this.database.saveUser(userId, msg.from);
      
      let welcomeMessage = '';
      
      if (chatType === 'private') {
        welcomeMessage = `
🎉 *Welcome to ChannelSense TON!*

I'm your AI-powered channel analytics assistant with TON blockchain integration.

🔧 *What I can do:*
• 📊 Analyze channel activity and engagement
• 👥 Identify top contributors
• 🎭 Analyze sentiment and mood
• 💎 Reward active users with NFTs
• 🔗 Connect TON wallets for rewards

📱 *Getting Started:*
1. Add me to your Telegram group/channel as admin
2. Use /connect to link your TON wallet  
3. Use /analyze in your group to get insights

💡 *For detailed instructions:* /guide

Type /help for quick commands list!
        `;
      } else {
        const chatTitle = msg.chat.title || (chatType === 'group' ? 'group' : 'channel');
        welcomeMessage = `
🎉 *ChannelSense TON activated in "${chatTitle}"!*

Hello! I'm your AI assistant for activity analysis and rewarding participants with NFTs.

🚀 *What I can do in this ${chatType === 'group' ? 'group' : 'channel'}:*
• 📊 Analyze activity and engagement
• 👥 Identify most active participants  
• 🎭 Analyze community sentiment
• 💎 Reward weekly top contributors with NFTs

📋 *Available commands:*
• /analyze - activity analysis
• /top - participant ranking
• /sentiment - community sentiment  
• /rewards - check NFT rewards
• /guide - detailed instructions

💰 *How to get NFT rewards:*
1. Be active (min. 10 messages/week)
2. Connect TON wallet: message me /connect in private
3. Get into top-3 on weekly report!

🏆 *Weekly rewards* every Sunday for top-3 participants!

Start with /analyze command to see current statistics! 📈
        `;
      }

      try {
        await this.bot.sendMessage(chatId, welcomeMessage);
      } catch (error) {
        console.error('Error sending welcome message:', error.message);
        // Don't throw error, just log it - continue bot operation
        if (error.message.includes('PEER_ID_INVALID')) {
          console.log(`Bot doesn't have access to chat ${chatId} anymore`);
        }
      }
    });

    // Connect wallet command
    this.bot.onText(/\/connect/, async (msg) => {
      console.log('Connect command received:', {
        chatId: msg.chat.id,
        chatType: msg.chat.type,
        userId: msg.from.id,
        username: msg.from.username
      });

      const chatId = msg.chat.id;
      const userId = msg.from.id;

      try {
        // Check if wallet is already connected
        console.log('Checking connection status for user:', userId);
        const connectionStatus = await this.tonConnect.checkConnectionStatus(userId);
        console.log('Connection status result:', connectionStatus);
        
        if (connectionStatus.connected) {
          await this.bot.sendMessage(chatId, 
            `✅ *Wallet Already Connected!*\n\nAddress: ${connectionStatus.wallet.address}\n\nYou're ready to receive NFT rewards!`,
            { parse_mode: 'Markdown' }
          );
          return;
        }

        console.log('Generating connect link for user:', userId);
        const { connectUrl } = await this.tonConnect.generateConnectLink(userId);
        console.log('Generated connect URL:', connectUrl);
        
        const keyboard = {
          inline_keyboard: [
            [{ text: '🔗 Connect Wallet (Web)', url: connectUrl }],
            [{ text: '📱 Open in Tonkeeper App', url: `https://app.tonkeeper.com/ton-connect?${connectUrl.split('?')[1]}` }],
            [{ text: '🔄 Check Status', callback_data: `check_connection_${userId}` }],
            [{ text: '🧪 Simulate Connection (Test)', callback_data: `simulate_connection_${userId}` }]
          ]
        };

        const connectMessage = await this.bot.sendMessage(chatId, 
          `🔗 *Connect Your TON Wallet*\n\n` +
          `Click the button below to connect your TON wallet and start earning NFT rewards!\n\n` +
          `💎 *Benefits:*\n` +
          `• Receive NFT rewards for activity\n` +
          `• Access exclusive features\n` +
          `• Participate in governance\n\n` +
          `⏱️ *Waiting for connection...*`,
          {
            reply_markup: keyboard,
            parse_mode: 'Markdown'
          }
        );

        console.log('Connect message sent, message ID:', connectMessage.message_id);

        // Wait for connection with timeout
        this.waitForWalletConnection(userId, chatId, connectMessage.message_id);

      } catch (error) {
        console.error('Connect wallet error:', error);
        await this.bot.sendMessage(chatId, '❌ Error generating connection link. Please try again later.');
      }
    });

    // Analyze command
    this.bot.onText(/\/analyze(?:\s+(\w+))?/, async (msg, match) => {
      console.log('Analyze command received:', {
        chatId: msg.chat.id,
        chatType: msg.chat.type,
        chatTitle: msg.chat.title,
        userId: msg.from.id,
        username: msg.from.username,
        period: match[1] || 'week'
      });

      const chatId = msg.chat.id;
      const period = match[1] || 'week';

      if (msg.chat.type === 'private') {
        await this.bot.sendMessage(chatId, '❌ This command can only be used in groups or channels.');
        return;
      }

      try {
        const analysis = await this.analytics.analyzeChannel(chatId, period);
        
        const analysisMessage = `
📊 **Channel Analysis** (${period})

📈 **Activity:**
• Messages: ${analysis.totalMessages}
• Active Users: ${analysis.activeUsers}
• Avg Messages/User: ${analysis.avgMessagesPerUser}

👥 **Top Contributors:**
${analysis.topUsers.slice(0, 5).map((user, index) => 
  `${index + 1}. ${user.username || user.firstName} (${user.messageCount} msgs)`
).join('\n')}

📊 **Engagement:**
• Growth: ${analysis.growth}%
• Peak Hour: ${analysis.peakHour}:00
• Most Active: ${analysis.mostActiveDay}

🤖 **AI Insights:**
${analysis.aiInsights}
        `;

        await this.bot.sendMessage(chatId, analysisMessage);

      } catch (error) {
        console.error('Analyze error:', error);
        await this.bot.sendMessage(chatId, '❌ Error analyzing channel. Please try again later.');
      }
    });

    // Top users command
    this.bot.onText(/\/top(?:\s+(\d+))?/, async (msg, match) => {
      const chatId = msg.chat.id;
      const limit = parseInt(match[1]) || 10;

      if (msg.chat.type === 'private') {
        await this.bot.sendMessage(chatId, '❌ This command can only be used in groups or channels.');
        return;
      }

      try {
        const topUsers = await this.analytics.getTopUsers(chatId, 'week', limit);
        
        // Check wallet connection for each user from database
        const usersWithWalletStatus = await Promise.all(
          topUsers.map(async (user) => {
            try {
              // Check database for wallet info
              const walletInfo = await this.database.getUserWallet(user.userId);
              const hasWallet = !!walletInfo;
              
              return {
                ...user,
                hasWallet,
                walletAddress: walletInfo?.address
              };
            } catch (error) {
              console.error(`Error checking wallet for user ${user.userId}:`, error);
              return {
                ...user,
                hasWallet: false,
                walletAddress: null
              };
            }
          })
        );
        
        const topUsersMessage = `
👥 *Top ${limit} Users This Week*

${usersWithWalletStatus.map((user, index) => 
  `${this.getRankEmoji(index + 1)} *${(user.username || user.firstName || 'Unknown').replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&')}*\n` +
  `   Messages: ${user.messageCount}\n` +
  `   Score: ${user.engagementScore || 'N/A'}\n` +
  `   Wallet: ${user.hasWallet ? '✅' : '❌'}` +
  (user.hasWallet && user.walletAddress ? `\n   Address: \`${user.walletAddress.slice(0, 10)}...\`` : '')
).join('\n\n')}

💡 Connect your wallet with /connect to be eligible for NFT rewards!
        `;

        await this.bot.sendMessage(chatId, topUsersMessage, { parse_mode: 'Markdown' });

      } catch (error) {
        console.error('Top users error:', error);
        await this.bot.sendMessage(chatId, '❌ Error fetching top users. Please try again later.');
      }
    });

    // Sentiment analysis command
    this.bot.onText(/\/sentiment/, async (msg) => {
      const chatId = msg.chat.id;

      if (msg.chat.type === 'private') {
        await this.bot.sendMessage(chatId, '❌ This command can only be used in groups or channels.');
        return;
      }

      try {
        const sentiment = await this.analytics.analyzeSentiment(chatId, 'week');
        
        const sentimentMessage = `
🎭 **Channel Sentiment Analysis**

${this.getSentimentEmoji(sentiment.overall)} **Overall: ${sentiment.overall}**

📊 **Breakdown:**
• 😊 Positive: ${sentiment.positive}%
• 😐 Neutral: ${sentiment.neutral}%
• 😔 Negative: ${sentiment.negative}%

🔥 **Trending Topics:**
${sentiment.trendingTopics.map(topic => `• ${topic}`).join('\n')}

📈 **Trend:** ${sentiment.trend}

🤖 **Summary:**
${sentiment.summary}
        `;

        await this.bot.sendMessage(chatId, sentimentMessage);

      } catch (error) {
        console.error('Sentiment error:', error);
        await this.bot.sendMessage(chatId, '❌ Error analyzing sentiment. Please try again later.');
      }
    });

    // Rewards command
    this.bot.onText(/\/rewards/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      try {
        // Check if wallet is connected first
        const walletInfo = await this.tonConnect.getWalletInfo(userId);
        
        if (!walletInfo) {
          await this.bot.sendMessage(chatId, 
            `🎁 **No NFT Rewards Yet**\n\n` +
            `Stay active in channels and connect your wallet to earn NFT rewards!\n\n` +
            `Use /connect to link your TON wallet.`
          );
          return;
        }

        // Wallet is connected, check for rewards
        const userRewards = await this.database.getUserRewards(userId);
        
        if (userRewards.length === 0) {
          await this.bot.sendMessage(chatId, 
            `🎁 **No NFT Rewards Yet**\n\n` +
            `💰 **Wallet Connected**: \`${walletInfo.address}\`\n\n` +
            `Stay active in channels to earn NFT rewards! Your wallet is ready to receive them.`,
            { parse_mode: 'Markdown' }
          );
          return;
        }

        const rewardsMessage = `
🎁 **Your NFT Rewards**

💰 **Wallet**: \`${walletInfo.address}\`

${userRewards.map((reward, index) => 
  `${index + 1}. **${reward.nftName}**\n` +
  `   From: ${reward.channelName}\n` +
  `   Date: ${new Date(reward.createdAt).toLocaleDateString()}\n` +
  `   TX: ${reward.transactionHash}`
).join('\n\n')}

💎 Total NFTs: ${userRewards.length}
        `;

        await this.bot.sendMessage(chatId, rewardsMessage, { parse_mode: 'Markdown' });

      } catch (error) {
        console.error('Rewards error:', error);
        await this.bot.sendMessage(chatId, '❌ Error fetching rewards. Please try again later.');
      }
    });

    // Help command
    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      
      const helpMessage = `🤖 ChannelSense TON Help

Commands:
• /start - Start the bot
• /connect - Connect your TON wallet
• /analyze [period] - Analyze channel (day/week/month)
• /top [number] - Show top users (default: 10)
• /sentiment - Analyze channel sentiment
• /rewards - Check your NFT rewards
• /guide - Complete usage guide
• /help - Show this help

How it works:
1. Add me to your Telegram group as admin
2. I'll analyze messages and user activity
3. Top contributors get NFT rewards weekly
4. Connect wallet to receive rewards

Features:
• 📊 Real-time analytics
• 🤖 AI-powered insights
• 💎 NFT rewards system
• 🔗 TON blockchain integration

Need help? Contact support: @channelsense_support`;

      await this.bot.sendMessage(chatId, helpMessage);
    });

    // Guide command for groups and channels (temporarily disabled)
    /*this.bot.onText(/\/guide/, async (msg) => {
      const chatId = msg.chat.id;
      const chatType = msg.chat.type;
      
      let guideMessage = '';
      
      if (chatType === 'private') {
        guideMessage = `
📖 *ChannelSense TON - Complete Guide*

*🚀 For groups and channels:*

*1. Adding bot to group/channel:*
• Add me as an administrator
• Give rights to read/send messages
• For channels: publishing rights

*2. Main commands:*
• /analyze - activity analysis
• /top - top participants  
• /sentiment - community sentiment
• /rewards - check NFT rewards

*3. Reward system:*
• Weekly NFTs for top-3 participants
• Minimum 10 messages per week
• TON wallet connection required (/connect)

*4. Wallet connection:*
• Use /connect in private messages
• Scan QR code in Tonkeeper
• Confirm connection

*5. Weekly reports:*
• Automatically every Sunday
• Complete activity statistics
• AI recommendations for improvement

💡 *Tips:*
• More quality messages = better chances for NFT
• Bot considers quality, not just quantity
• Actively participate in discussions

🔗 *Support:* @channelsense_support
`;
      } else {
        guideMessage = `
📖 *Usage guide for this ${chatType === 'group' ? 'group' : 'channel'}*

*🎯 Available commands here:*

/analyze - *Activity Analysis*
• Statistics for day/week/month
• Top participants by activity  
• AI analysis of discussion topics

/top - *Participant Ranking*
• Show top-10 most active
• You can specify number: /top 5

/sentiment - *Sentiment Analysis*
• Overall community mood
• Emotion analysis in messages
• Discussion trends

/rewards - *NFT Rewards*
• Who received rewards this week
• History of past rewards

*💎 How to get NFT reward:*

1. *Be active* - minimum 10 messages per week
2. *Connect wallet* - message me /connect in private
3. *Participate with quality* - bot analyzes value of your messages, not just quantity

*📊 Weekly report:*
Every Sunday I publish a complete activity analysis and reward top-3 participants with unique NFTs!

*🤖 AI capabilities:*
• Discussion topic analysis
• Community sentiment detection  
• Personal recommendations
• Trend identification

💬 For complete instructions, message me /guide in private
`;
      }
      
      await this.bot.sendMessage(chatId, guideMessage, { parse_mode: 'Markdown' });
    });*/
  }

  setupMessageHandlers() {
    // Track all messages for analytics
    this.bot.on('message', async (msg) => {
      try {
        console.log('Received message:', {
          chatId: msg.chat.id,
          chatType: msg.chat.type,
          chatTitle: msg.chat.title,
          text: msg.text,
          userId: msg.from.id,
          username: msg.from.username
        });

        // Skip commands and bot messages
        if (msg.text?.startsWith('/') || msg.from.is_bot) return;

        // Save message for analytics
        await this.database.saveMessage({
          messageId: msg.message_id,
          chatId: msg.chat.id,
          userId: msg.from.id,
          text: msg.text || '',
          date: new Date(msg.date * 1000),
          replyToMessageId: msg.reply_to_message?.message_id,
          forwardFromChatId: msg.forward_from_chat?.id
        });

        // Save user info
        await this.database.saveUser(msg.from.id, msg.from);

        // Welcome new members
        if (msg.new_chat_members) {
          await this.handleNewMembers(msg);
        }

      } catch (error) {
        console.error('Message handler error:', error);
      }
    });

    // Handle callback queries (inline keyboard buttons)
    this.bot.on('callback_query', async (callbackQuery) => {
      try {
        const { data, from, message } = callbackQuery;
        console.log('Callback query received:', {
          data,
          userId: from.id,
          username: from.username,
          chatId: message.chat.id
        });
        
        if (data.startsWith('connect_')) {
          const userId = data.split('_')[1];
          await this.handleWalletConnection(userId, from, message);
        } else if (data.startsWith('check_connection_')) {
          const userId = parseInt(data.split('_')[2]);
          await this.handleConnectionCheck(userId, from, message);
        } else if (data.startsWith('simulate_connection_')) {
          const userId = parseInt(data.split('_')[2]);
          await this.handleSimulateConnection(userId, from, message);
        }

        await this.bot.answerCallbackQuery(callbackQuery.id);
      } catch (error) {
        console.error('Callback query error:', error);
        await this.bot.answerCallbackQuery(callbackQuery.id, { 
          text: 'Error processing request. Please try again.' 
        });
      }
    });
  }

  async handleNewMembers(msg) {
    const chatId = msg.chat.id;
    const newMembers = msg.new_chat_members;

    for (const member of newMembers) {
      if (!member.is_bot) {
        const welcomeMessage = `
👋 **Welcome ${member.first_name}!**

Great to have you in our community! 

🤖 I'm ChannelSense, your AI analytics assistant. I help track channel activity and reward active members with NFTs.

💡 **Get started:**
• Connect your TON wallet: /connect
• Check channel stats: /analyze
• View top contributors: /top

Stay active and earn NFT rewards! 🎁
        `;

        try {
          await this.bot.sendMessage(chatId, welcomeMessage, { 
            reply_to_message_id: msg.message_id,
            parse_mode: 'Markdown'
          });
        } catch (error) {
          console.error('Welcome message error:', error);
        }
      }
    }
  }

  async handleWalletConnection(userId, from, message) {
    try {
      console.log('Handling wallet connection for user:', userId);
      const walletInfo = await this.tonConnect.getWalletInfo(userId);
      console.log('Wallet info retrieved:', walletInfo);
      
      if (walletInfo) {
        console.log('Saving wallet to database...');
        await this.database.saveUserWallet(userId, walletInfo);
        console.log('Wallet saved successfully');
        
        await this.bot.editMessageText(
          `✅ Wallet Connected Successfully!\n\n` +
          `Address: ${walletInfo.address}\n\n` +
          `You're now eligible for NFT rewards!`,
          {
            chat_id: message.chat.id,
            message_id: message.message_id,
            parse_mode: 'Markdown'
          }
        );
      } else {
        console.log('No wallet info found for user:', userId);
      }
    } catch (error) {
      console.error('Wallet connection handler error:', error);
    }
  }

  async handleConnectionCheck(userId, from, message) {
    try {
      console.log('Checking connection status for user:', userId);
      const connectionStatus = await this.tonConnect.checkConnectionStatus(userId);
      console.log('Connection status result:', connectionStatus);
      
      if (connectionStatus.connected) {
        console.log('Wallet is connected, saving to database...');
        // Save wallet to database if not already saved
        await this.database.saveUserWallet(userId, connectionStatus.wallet);
        console.log('Wallet saved successfully');
        
        await this.bot.editMessageText(
          `✅ Wallet Connected Successfully!\n\n` +
          `Address: ${connectionStatus.wallet.address}\n\n` +
          `You're now eligible for NFT rewards! 🎉`,
          {
            chat_id: message.chat.id,
            message_id: message.message_id,
            parse_mode: 'Markdown'
          }
        );
      } else if (connectionStatus.pending) {
        console.log('Connection still pending for user:', userId);
        await this.bot.answerCallbackQuery(from.id, {
          text: '⏳ Still waiting for wallet connection...',
          show_alert: false
        });
      } else {
        console.log('No connection detected for user:', userId);
        await this.bot.answerCallbackQuery(from.id, {
          text: '❌ No wallet connection detected. Please try connecting again.',
          show_alert: true
        });
      }
    } catch (error) {
      console.error('Connection check error:', error);
      await this.bot.answerCallbackQuery(from.id, {
        text: 'Error checking connection status.',
        show_alert: true
      });
    }
  }

  async handleSimulateConnection(userId, from, message) {
    try {
      console.log('Simulating wallet connection for user:', userId);
      
      // Create a mock wallet connection for testing
      const mockWallet = {
        address: `EQTestWallet${userId}${Date.now().toString().slice(-6)}`,
        chain: '-239',
        publicKey: 'mock_public_key_' + userId
      };

      // Save to TON Connect service
      await this.tonConnect.connectedWallets.set(userId, mockWallet);
      
      // Save to database
      await this.database.saveUserWallet(userId, mockWallet);
      
      await this.bot.editMessageText(
        `✅ Wallet Connected Successfully! (Simulated)\n\n` +
        `Address: ${mockWallet.address}\n\n` +
        `🧪 This is a test connection for development.\n` +
        `You're now eligible for NFT rewards!`,
        {
          chat_id: message.chat.id,
          message_id: message.message_id,
          parse_mode: 'Markdown'
        }
      );
      
      console.log(`Simulated wallet connection for user ${userId}:`, mockWallet);
    } catch (error) {
      console.error('Simulate connection error:', error);
      await this.bot.answerCallbackQuery(from.id, {
        text: 'Error simulating connection.',
        show_alert: true
      });
    }
  }

  async waitForWalletConnection(userId, chatId, messageId) {
    try {
      console.log('Starting to wait for wallet connection...', { userId, chatId, messageId });
      
      // Wait up to 2 minutes for wallet connection
      const wallet = await this.tonConnect.waitForConnection(userId, 120000);
      console.log('Wallet connection result:', wallet);
      
      if (wallet) {
        console.log('Wallet connected successfully, saving to database...');
        // Save wallet to database
        await this.database.saveUserWallet(userId, wallet);
        console.log('Wallet saved to database successfully');
        
        // Update the message
        await this.bot.editMessageText(
          `✅ Wallet Connected Successfully!\n\n` +
          `Address: ${wallet.address}\n\n` +
          `You're now eligible for NFT rewards! 🎉`,
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown'
          }
        );
        console.log('Success message updated');
      } else {
        console.log('No wallet connection received within timeout');
      }
    } catch (error) {
      console.error('Wallet connection timeout:', error);
      // Update message with timeout info
      try {
        await this.bot.editMessageText(
          `⏰ Connection Timeout\n\n` +
          `Wallet connection timed out. You can try again with /connect\n\n` +
          `Make sure to:\n` +
          `• Open the link in your TON wallet\n` +
          `• Approve the connection\n` +
          `• Wait for confirmation`,
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown'
          }
        );
        console.log('Timeout message updated');
      } catch (editError) {
        console.error('Error updating timeout message:', editError);
      }
    }
  }

  getRankEmoji(rank) {
    const emojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    return emojis[rank - 1] || `${rank}️⃣`;
  }

  getSentimentEmoji(sentiment) {
    if (!sentiment || typeof sentiment !== 'string') {
      return '😐';
    }
    
    switch (sentiment.toLowerCase()) {
      case 'positive': return '😊';
      case 'negative': return '😔';
      case 'very positive': return '🤩';
      case 'very negative': return '😡';
      default: return '😐';
    }
  }

  async sendToChannel(chatId, message, options = {}) {
    try {
      return await this.bot.sendMessage(chatId, message, options);
    } catch (error) {
      console.error('Send message error:', error.message);
      
      // Handle specific Telegram errors
      if (error.message.includes('PEER_ID_INVALID')) {
        console.log(`Bot doesn't have access to chat ${chatId} anymore`);
        return null; // Don't throw, just return null
      } else if (error.message.includes('403 Forbidden')) {
        console.log(`Bot was blocked or kicked from chat ${chatId}`);
        return null;
      }
      
      throw error; // Re-throw other errors
    }
  }

  async sendNFTRewardNotification(userId, nftInfo) {
    try {
      const message = `
🎉 **Congratulations! You've received an NFT reward!**

🏆 **NFT:** ${nftInfo.name}
📍 **From:** ${nftInfo.channelName}
💎 *Address:* ${nftInfo.address}

Your active participation has been recognized and rewarded!

🔍 **View on Explorer:**
https://tonscan.org/nft/${nftInfo.address}

Keep being awesome! 🚀
      `;

      await this.bot.sendMessage(userId, message);
    } catch (error) {
      console.error('NFT notification error:', error);
    }
  }
}
