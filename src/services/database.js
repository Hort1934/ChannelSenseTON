import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

export class DatabaseService {
  constructor() {
    this.dbPath = process.env.DATABASE_PATH || './data/database.sqlite';
    this.db = null;
  }

  async initialize() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Open database connection
      this.db = new sqlite3.Database(this.dbPath);
      
      // Promisify database methods
      this.run = promisify(this.db.run.bind(this.db));
      this.get = promisify(this.db.get.bind(this.db));
      this.all = promisify(this.db.all.bind(this.db));

      // Create tables
      await this.createTables();
      
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  async createTables() {
    try {
      // Users table
      await this.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT UNIQUE NOT NULL,
          username TEXT,
          first_name TEXT,
          last_name TEXT,
          language_code TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // User wallets table
      await this.run(`
        CREATE TABLE IF NOT EXISTS user_wallets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT UNIQUE NOT NULL,
          address TEXT NOT NULL,
          chain TEXT,
          public_key TEXT,
          connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (user_id)
        )
      `);

      // Messages table
      await this.run(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          message_id INTEGER NOT NULL,
          chat_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          text TEXT,
          date DATETIME NOT NULL,
          reply_to_message_id INTEGER,
          forward_from_chat_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (user_id)
        )
      `);

      // Channels table
      await this.run(`
        CREATE TABLE IF NOT EXISTS channels (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chat_id TEXT UNIQUE NOT NULL,
          title TEXT,
          username TEXT,
          type TEXT,
          member_count INTEGER,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // NFT rewards table
      await this.run(`
        CREATE TABLE IF NOT EXISTS nft_rewards (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          chat_id TEXT NOT NULL,
          nft_address TEXT,
          collection_address TEXT,
          transaction_hash TEXT,
          metadata TEXT,
          reward_type TEXT DEFAULT 'weekly',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (user_id),
          FOREIGN KEY (chat_id) REFERENCES channels (chat_id)
        )
      `);

      // Weekly reports table
      await this.run(`
        CREATE TABLE IF NOT EXISTS weekly_reports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chat_id TEXT NOT NULL,
          report_data TEXT NOT NULL,
          week_start DATE NOT NULL,
          week_end DATE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (chat_id) REFERENCES channels (chat_id)
        )
      `);

      // User activity cache table for performance
      await this.run(`
        CREATE TABLE IF NOT EXISTS user_activity_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          chat_id TEXT NOT NULL,
          date DATE NOT NULL,
          message_count INTEGER DEFAULT 0,
          engagement_score INTEGER DEFAULT 0,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, chat_id, date),
          FOREIGN KEY (user_id) REFERENCES users (user_id),
          FOREIGN KEY (chat_id) REFERENCES channels (chat_id)
        )
      `);

      // Create indexes for better performance
      await this.run('CREATE INDEX IF NOT EXISTS idx_messages_chat_date ON messages (chat_id, date)');
      await this.run('CREATE INDEX IF NOT EXISTS idx_messages_user_chat ON messages (user_id, chat_id)');
      await this.run('CREATE INDEX IF NOT EXISTS idx_user_activity_cache_chat_date ON user_activity_cache (chat_id, date)');
      await this.run('CREATE INDEX IF NOT EXISTS idx_nft_rewards_user ON nft_rewards (user_id)');

    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }

  async saveUser(userId, userInfo) {
    try {
      await this.run(`
        INSERT OR REPLACE INTO users (user_id, username, first_name, last_name, language_code, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        userId.toString(),
        userInfo.username || null,
        userInfo.first_name || null,
        userInfo.last_name || null,
        userInfo.language_code || null
      ]);
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  }

  async saveUserWallet(userId, walletInfo) {
    try {
      await this.run(`
        INSERT OR REPLACE INTO user_wallets (user_id, address, chain, public_key)
        VALUES (?, ?, ?, ?)
      `, [
        userId.toString(),
        walletInfo.address,
        walletInfo.chain || null,
        walletInfo.publicKey || null
      ]);
    } catch (error) {
      console.error('Error saving user wallet:', error);
      throw error;
    }
  }

  async getUserWallet(userId) {
    try {
      return await this.get(`
        SELECT * FROM user_wallets WHERE user_id = ?
      `, [userId.toString()]);
    } catch (error) {
      console.error('Error getting user wallet:', error);
      return null;
    }
  }

  async saveMessage(messageData) {
    try {
      await this.run(`
        INSERT INTO messages (message_id, chat_id, user_id, text, date, reply_to_message_id, forward_from_chat_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        messageData.messageId,
        messageData.chatId.toString(),
        messageData.userId.toString(),
        messageData.text || null,
        messageData.date,
        messageData.replyToMessageId || null,
        messageData.forwardFromChatId?.toString() || null
      ]);

      // Update activity cache
      await this.updateUserActivityCache(messageData.userId, messageData.chatId, messageData.date);

    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  }

  async updateUserActivityCache(userId, chatId, date) {
    try {
      const dateStr = date.toISOString().split('T')[0];
      
      await this.run(`
        INSERT OR REPLACE INTO user_activity_cache (user_id, chat_id, date, message_count, updated_at)
        VALUES (
          ?, ?, ?, 
          COALESCE((SELECT message_count FROM user_activity_cache WHERE user_id = ? AND chat_id = ? AND date = ?), 0) + 1,
          CURRENT_TIMESTAMP
        )
      `, [
        userId.toString(),
        chatId.toString(),
        dateStr,
        userId.toString(),
        chatId.toString(),
        dateStr
      ]);
    } catch (error) {
      console.error('Error updating activity cache:', error);
    }
  }

  async getChannelMetrics(chatId, startDate, endDate = new Date()) {
    try {
      const result = await this.get(`
        SELECT 
          COUNT(*) as totalMessages,
          COUNT(DISTINCT user_id) as activeUsers
        FROM messages 
        WHERE chat_id = ? AND date >= ? AND date < ?
      `, [chatId.toString(), startDate, endDate]);

      return {
        totalMessages: result.totalMessages || 0,
        activeUsers: result.activeUsers || 0
      };
    } catch (error) {
      console.error('Error getting channel metrics:', error);
      return { totalMessages: 0, activeUsers: 0 };
    }
  }

  async getUserActivity(chatId, startDate, limit = 10) {
    try {
      const users = await this.all(`
        SELECT 
          m.user_id,
          u.username,
          u.first_name,
          u.last_name,
          COUNT(*) as messageCount
        FROM messages m
        JOIN users u ON m.user_id = u.user_id
        WHERE m.chat_id = ? AND m.date >= ?
        GROUP BY m.user_id
        ORDER BY messageCount DESC
        LIMIT ?
      `, [chatId.toString(), startDate, limit]);

      return users;
    } catch (error) {
      console.error('Error getting user activity:', error);
      return [];
    }
  }

  async getHourlyActivity(chatId, startDate) {
    try {
      const activity = await this.all(`
        SELECT 
          CAST(strftime('%H', date) AS INTEGER) as hour,
          COUNT(*) as count
        FROM messages 
        WHERE chat_id = ? AND date >= ?
        GROUP BY hour
        ORDER BY hour
      `, [chatId.toString(), startDate]);

      return activity;
    } catch (error) {
      console.error('Error getting hourly activity:', error);
      return [];
    }
  }

  async getDailyActivity(chatId, startDate) {
    try {
      const activity = await this.all(`
        SELECT 
          CASE CAST(strftime('%w', date) AS INTEGER)
            WHEN 0 THEN 'Sunday'
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday'
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
            WHEN 6 THEN 'Saturday'
          END as dayName,
          COUNT(*) as count
        FROM messages 
        WHERE chat_id = ? AND date >= ?
        GROUP BY strftime('%w', date)
        ORDER BY count DESC
      `, [chatId.toString(), startDate]);

      return activity;
    } catch (error) {
      console.error('Error getting daily activity:', error);
      return [];
    }
  }

  async getRecentMessages(chatId, limit = 50) {
    try {
      const messages = await this.all(`
        SELECT 
          m.*,
          u.username,
          u.first_name
        FROM messages m
        JOIN users u ON m.user_id = u.user_id
        WHERE m.chat_id = ? AND m.text IS NOT NULL AND m.text != ''
        ORDER BY m.date DESC
        LIMIT ?
      `, [chatId.toString(), limit]);

      return messages;
    } catch (error) {
      console.error('Error getting recent messages:', error);
      return [];
    }
  }

  async getUserMessages(userId, chatId, startDate) {
    try {
      const messages = await this.all(`
        SELECT * FROM messages 
        WHERE user_id = ? AND chat_id = ? AND date >= ?
        ORDER BY date DESC
      `, [userId.toString(), chatId.toString(), startDate]);

      return messages;
    } catch (error) {
      console.error('Error getting user messages:', error);
      return [];
    }
  }

  async getMessageInteractions(userId, chatId, startDate) {
    try {
      // Get replies to user's messages
      const replies = await this.get(`
        SELECT COUNT(*) as count
        FROM messages m1
        JOIN messages m2 ON m1.message_id = m2.reply_to_message_id
        WHERE m1.user_id = ? AND m1.chat_id = ? AND m1.date >= ?
      `, [userId.toString(), chatId.toString(), startDate]);

      // For now, we'll mock reactions count since Telegram Bot API doesn't provide easy access to reactions
      return {
        replies: replies.count || 0,
        reactions: Math.floor((replies.count || 0) * 1.5) // Mock data
      };
    } catch (error) {
      console.error('Error getting message interactions:', error);
      return { replies: 0, reactions: 0 };
    }
  }

  async getUserActivityHours(userId, chatId, startDate) {
    try {
      const hours = await this.all(`
        SELECT DISTINCT CAST(strftime('%H', date) AS INTEGER) as hour
        FROM messages 
        WHERE user_id = ? AND chat_id = ? AND date >= ?
        ORDER BY hour
      `, [userId.toString(), chatId.toString(), startDate]);

      return hours.map(h => h.hour);
    } catch (error) {
      console.error('Error getting user activity hours:', error);
      return [];
    }
  }

  async getMessagesForSentiment(chatId, startDate, endDate = new Date(), limit = 200) {
    try {
      let query = `
        SELECT 
          m.*,
          u.username,
          u.first_name
        FROM messages m
        JOIN users u ON m.user_id = u.user_id
        WHERE m.chat_id = ? AND m.date >= ? AND m.text IS NOT NULL AND m.text != ''
      `;
      
      const params = [chatId.toString(), startDate];
      
      if (endDate instanceof Date) {
        query += ' AND m.date < ?';
        params.push(endDate);
      }
      
      query += ' ORDER BY m.date DESC LIMIT ?';
      params.push(limit);

      const messages = await this.all(query, params);
      return messages;
    } catch (error) {
      console.error('Error getting messages for sentiment:', error);
      return [];
    }
  }

  async saveNFTReward(userId, chatId, nftData) {
    try {
      await this.run(`
        INSERT INTO nft_rewards (user_id, chat_id, nft_address, collection_address, transaction_hash, metadata, reward_type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        userId.toString(),
        chatId.toString(),
        nftData.nftAddress || null,
        nftData.collectionAddress || null,
        nftData.transactionHash || null,
        JSON.stringify(nftData.metadata || {}),
        nftData.rewardType || 'weekly'
      ]);
    } catch (error) {
      console.error('Error saving NFT reward:', error);
      throw error;
    }
  }

  async getUserRewards(userId) {
    try {
      const rewards = await this.all(`
        SELECT 
          r.*,
          c.title as channelName
        FROM nft_rewards r
        LEFT JOIN channels c ON r.chat_id = c.chat_id
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC
      `, [userId.toString()]);

      return rewards.map(reward => ({
        ...reward,
        metadata: JSON.parse(reward.metadata || '{}'),
        nftName: JSON.parse(reward.metadata || '{}').name || 'ChannelSense Reward'
      }));
    } catch (error) {
      console.error('Error getting user rewards:', error);
      return [];
    }
  }

  async saveWeeklyReport(chatId, reportData) {
    try {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date();
      weekEnd.setHours(23, 59, 59, 999);

      await this.run(`
        INSERT INTO weekly_reports (chat_id, report_data, week_start, week_end)
        VALUES (?, ?, ?, ?)
      `, [
        chatId.toString(),
        JSON.stringify(reportData),
        weekStart.toISOString(),
        weekEnd.toISOString()
      ]);
    } catch (error) {
      console.error('Error saving weekly report:', error);
      throw error;
    }
  }

  async getActiveChannels() {
    try {
      // Get channels that had activity in the last week
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const channels = await this.all(`
        SELECT DISTINCT m.chat_id, c.title, c.username
        FROM messages m
        LEFT JOIN channels c ON m.chat_id = c.chat_id
        WHERE m.date >= ?
        GROUP BY m.chat_id
        HAVING COUNT(*) > 10
      `, [oneWeekAgo]);

      return channels;
    } catch (error) {
      console.error('Error getting active channels:', error);
      return [];
    }
  }

  async saveChannel(chatId, channelInfo) {
    try {
      await this.run(`
        INSERT OR REPLACE INTO channels (chat_id, title, username, type, member_count, description, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        chatId.toString(),
        channelInfo.title || null,
        channelInfo.username || null,
        channelInfo.type || null,
        channelInfo.member_count || null,
        channelInfo.description || null
      ]);
    } catch (error) {
      console.error('Error saving channel:', error);
      throw error;
    }
  }

  async close() {
    if (this.db) {
      await new Promise((resolve, reject) => {
        this.db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }
}
