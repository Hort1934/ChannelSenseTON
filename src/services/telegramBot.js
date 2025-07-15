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
        const chatTitle = msg.chat.title || (chatType === 'group' ? 'группе' : 'канале');
        welcomeMessage = `
🎉 *ChannelSense TON активирован в "${chatTitle}"!*

Привет! Я ваш AI-помощник для анализа активности и награждения участников NFT.

🚀 *Что я умею в этом ${chatType === 'group' ? 'группе' : 'канале'}:*
• 📊 Анализировать активность и вовлеченность
• 👥 Определять самых активных участников  
• 🎭 Анализировать настроение сообщества
• 💎 Награждать еженедельными NFT топ-участников

📋 *Доступные команды:*
• /analyze - анализ активности
• /top - рейтинг участников
• /sentiment - настроение сообщества  
• /rewards - проверка NFT наград
• /guide - подробная инструкция

💰 *Как получить NFT награды:*
1. Будьте активны (мин. 10 сообщений/неделю)
2. Подключите TON кошелек: напишите мне /connect в личных сообщениях
3. Попадите в топ-3 на еженедельном отчете!

🏆 *Еженедельные награды* каждое воскресенье для топ-3 участников!

Начните с команды /analyze чтобы увидеть текущую статистику! 📈
        `;
      }

      await this.bot.sendMessage(chatId, welcomeMessage);
    });

    // Connect wallet command
    this.bot.onText(/\/connect/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      try {
        // Check if wallet is already connected
        const connectionStatus = await this.tonConnect.checkConnectionStatus(userId);
        
        if (connectionStatus.connected) {
          await this.bot.sendMessage(chatId, 
            `✅ *Wallet Already Connected!*\n\nAddress: ${connectionStatus.wallet.address}\n\nYou're ready to receive NFT rewards!`,
            {}
          );
          return;
        }

        const { connectUrl } = await this.tonConnect.generateConnectLink(userId);
        
        const keyboard = {
          inline_keyboard: [
            [{ text: '🔗 Connect Wallet', url: connectUrl }],
            [{ text: '📱 Open in Tonkeeper', url: connectUrl }],
            [{ text: '🔄 Check Status', callback_data: `check_connection_${userId}` }]
          ]
        };

        const connectMessage = await this.bot.sendMessage(chatId, 
          `🔗 *Connect Your TON Wallet*\n\n` +
          `Click the button below to connect your TON wallet and start earning NFT rewards!\n\n` +
          `💎 *Benefits:*\n` +
          `• Receive NFT rewards for activity\n` +
          `• Access exclusive features\n` +
          `• Participate in governance\n\n` +
          `🔗 Connection link: ${connectUrl}\n\n` +
          `⏱️ *Waiting for connection...*`,
          {
            reply_markup: keyboard
          }
        );

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
        
        const topUsersMessage = `
👥 **Top ${limit} Users This Week**

${topUsers.map((user, index) => 
  `${this.getRankEmoji(index + 1)} **${user.username || user.firstName || 'Unknown'}**\n` +
  `   Messages: ${user.messageCount}\n` +
  `   Score: ${user.engagementScore}\n` +
  `   Wallet: ${user.tonWallet ? '✅' : '❌'}`
).join('\n\n')}

💡 Connect your wallet with /connect to be eligible for NFT rewards!
        `;

        await this.bot.sendMessage(chatId, topUsersMessage);

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
        const userRewards = await this.database.getUserRewards(userId);
        
        if (userRewards.length === 0) {
          await this.bot.sendMessage(chatId, 
            `🎁 **No NFT Rewards Yet**\n\n` +
            `Stay active in channels and connect your wallet to earn NFT rewards!\n\n` +
            `Use /connect to link your TON wallet.`
          );
          return;
        }

        const rewardsMessage = `
🎁 **Your NFT Rewards**

${userRewards.map((reward, index) => 
  `${index + 1}. **${reward.nftName}**\n` +
  `   From: ${reward.channelName}\n` +
  `   Date: ${new Date(reward.createdAt).toLocaleDateString()}\n` +
  `   TX: ${reward.transactionHash}`
).join('\n\n')}

💎 Total NFTs: ${userRewards.length}
        `;

        await this.bot.sendMessage(chatId, rewardsMessage);

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
• /help - Show this help

How it works:
1. Add me to your Telegram group
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

    // Guide command for groups and channels
    this.bot.onText(/\/guide/, async (msg) => {
      const chatId = msg.chat.id;
      const chatType = msg.chat.type;
      
      let guideMessage = '';
      
      if (chatType === 'private') {
        guideMessage = `
📖 *ChannelSense TON - Полное руководство*

*🚀 Для групп и каналов:*

*1. Добавление бота в группу/канал:*
• Добавьте меня как администратора
• Дайте права на чтение/отправку сообщений
• Для каналов: права на публикацию

*2. Основные команды:*
• /analyze - анализ активности
• /top - топ участников  
• /sentiment - настроение сообщества
• /rewards - проверка NFT наград

*3. Система наград:*
• Еженедельные NFT для топ-3 участников
• Минимум 10 сообщений за неделю
• Обязательно подключение кошелька (/connect)

*4. Подключение кошелька:*
• Используйте /connect в личных сообщениях
• Сканируйте QR-код в Tonkeeper
• Подтвердите подключение

*5. Еженедельные отчеты:*
• Автоматически каждое воскресенье
• Полная статистика активности
• AI-рекомендации для улучшения

💡 *Советы:*
• Больше качественных сообщений = больше шансов на NFT
• Бот учитывает не только количество, но и качество
• Активно участвуйте в обсуждениях

🔗 *Поддержка:* @channelsense_support
`;
      } else {
        guideMessage = `
📖 *Руководство по использованию в этом ${chatType === 'group' ? 'группе' : 'канале'}*

*🎯 Доступные команды здесь:*

/analyze - *Анализ активности*
• Статистика за день/неделю/месяц
• Топ участников по активности  
• AI-анализ тем обсуждений

/top - *Рейтинг участников*
• Показать топ-10 самых активных
• Можно указать число: /top 5

/sentiment - *Анализ настроения*
• Общее настроение сообщества
• Анализ эмоций в сообщениях
• Тренды обсуждений

/rewards - *NFT награды*
• Кто получил награды на этой неделе
• История прошлых наград

*💎 Как получить NFT награду:*

1. *Будьте активны* - минимум 10 сообщений в неделю
2. *Подключите кошелек* - напишите мне /connect в личных сообщениях
3. *Участвуйте качественно* - бот анализирует не только количество, но и ценность ваших сообщений

*📊 Еженедельный отчет:*
Каждое воскресенье я публикую полный анализ активности и награждаю топ-3 участников уникальными NFT!

*🤖 AI возможности:*
• Анализ тем обсуждений
• Определение настроения сообщества  
• Персональные рекомендации
• Выявление трендов

💬 Для полной инструкции напишите мне /guide в личных сообщениях
`;
      }
      
      await this.bot.sendMessage(chatId, guideMessage);
    });
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
        
        if (data.startsWith('connect_')) {
          const userId = data.split('_')[1];
          await this.handleWalletConnection(userId, from, message);
        } else if (data.startsWith('check_connection_')) {
          const userId = parseInt(data.split('_')[2]);
          await this.handleConnectionCheck(userId, from, message);
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
            reply_to_message_id: msg.message_id 
          });
        } catch (error) {
          console.error('Welcome message error:', error);
        }
      }
    }
  }

  async handleWalletConnection(userId, from, message) {
    try {
      const walletInfo = await this.tonConnect.getWalletInfo(userId);
      
      if (walletInfo) {
        await this.database.saveUserWallet(userId, walletInfo);
        
        await this.bot.editMessageText(
          `✅ Wallet Connected Successfully!\n\n` +
          `Address: ${walletInfo.address}\n\n` +
          `You're now eligible for NFT rewards!`,
          {
            chat_id: message.chat.id,
            message_id: message.message_id
          }
        );
      }
    } catch (error) {
      console.error('Wallet connection handler error:', error);
    }
  }

  async handleConnectionCheck(userId, from, message) {
    try {
      const connectionStatus = await this.tonConnect.checkConnectionStatus(userId);
      
      if (connectionStatus.connected) {
        // Save wallet to database if not already saved
        await this.database.saveUserWallet(userId, connectionStatus.wallet);
        
        await this.bot.editMessageText(
          `✅ Wallet Connected Successfully!\n\n` +
          `Address: ${connectionStatus.wallet.address}\n\n` +
          `You're now eligible for NFT rewards! 🎉`,
          {
            chat_id: message.chat.id,
            message_id: message.message_id
          }
        );
      } else if (connectionStatus.pending) {
        await this.bot.answerCallbackQuery(from.id, {
          text: '⏳ Still waiting for wallet connection...',
          show_alert: false
        });
      } else {
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

  async waitForWalletConnection(userId, chatId, messageId) {
    try {
      // Wait up to 2 minutes for wallet connection
      const wallet = await this.tonConnect.waitForConnection(userId, 120000);
      
      if (wallet) {
        // Save wallet to database
        await this.database.saveUserWallet(userId, wallet);
        
        // Update the message
        await this.bot.editMessageText(
          `✅ Wallet Connected Successfully!\n\n` +
          `Address: ${wallet.address}\n\n` +
          `You're now eligible for NFT rewards! 🎉`,
          {
            chat_id: chatId,
            message_id: messageId
          }
        );
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
            message_id: messageId
          }
        );
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
      console.error('Send message error:', error);
      throw error;
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
