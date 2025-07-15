import express from 'express';
import cors from 'cors';
import path from 'path';

export class WebServer {
  constructor(tonConnect, database) {
    this.tonConnect = tonConnect;
    this.database = database;
    this.app = express();
    this.port = process.env.PORT || 3000;
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static('public'));
  }

  setupRoutes() {
    // TON Connect manifest
    this.app.get('/tonconnect-manifest.json', (req, res) => {
      const manifest = {
        url: `${req.protocol}://${req.get('host')}`,
        name: 'ChannelSense TON',
        iconUrl: `${req.protocol}://${req.get('host')}/icon.png`,
        termsOfUseUrl: `${req.protocol}://${req.get('host')}/terms`,
        privacyPolicyUrl: `${req.protocol}://${req.get('host')}/privacy`
      };
      
      res.json(manifest);
    });

    // Wallet connection callback
    this.app.post('/ton-connect/callback', async (req, res) => {
      try {
        const { walletInfo, userId } = req.body;
        
        if (walletInfo && userId) {
          await this.database.saveUserWallet(userId, walletInfo);
          res.json({ success: true });
        } else {
          res.status(400).json({ error: 'Missing required data' });
        }
      } catch (error) {
        console.error('Wallet connection callback error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // User wallet info
    this.app.get('/wallet/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const walletInfo = await this.database.getUserWallet(userId);
        
        if (walletInfo) {
          res.json({
            connected: true,
            address: walletInfo.address,
            connectedAt: walletInfo.connected_at
          });
        } else {
          res.json({ connected: false });
        }
      } catch (error) {
        console.error('Get wallet info error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Channel analytics API
    this.app.get('/api/channel/:chatId/analytics', async (req, res) => {
      try {
        const { chatId } = req.params;
        const { period = 'week' } = req.query;
        
        // This would typically require authentication
        // For demo purposes, we'll allow public access
        
        const analytics = await this.getChannelAnalytics(chatId, period);
        res.json(analytics);
      } catch (error) {
        console.error('Analytics API error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
      }
    });

    // Top users API
    this.app.get('/api/channel/:chatId/top-users', async (req, res) => {
      try {
        const { chatId } = req.params;
        const { limit = 10, period = 'week' } = req.query;
        
        const topUsers = await this.getTopUsers(chatId, period, parseInt(limit));
        res.json(topUsers);
      } catch (error) {
        console.error('Top users API error:', error);
        res.status(500).json({ error: 'Failed to fetch top users' });
      }
    });

    // NFT rewards API
    this.app.get('/api/user/:userId/rewards', async (req, res) => {
      try {
        const { userId } = req.params;
        const rewards = await this.database.getUserRewards(userId);
        res.json(rewards);
      } catch (error) {
        console.error('User rewards API error:', error);
        res.status(500).json({ error: 'Failed to fetch rewards' });
      }
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'ChannelSense TON MCP Server'
      });
    });

    // Simple dashboard
    this.app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>ChannelSense TON</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              max-width: 800px; 
              margin: 0 auto; 
              padding: 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              min-height: 100vh;
            }
            .container {
              background: rgba(255,255,255,0.1);
              backdrop-filter: blur(10px);
              border-radius: 20px;
              padding: 30px;
              box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            }
            h1 { color: #fff; text-align: center; margin-bottom: 30px; }
            .feature {
              background: rgba(255,255,255,0.1);
              padding: 20px;
              margin: 15px 0;
              border-radius: 10px;
              border-left: 4px solid #00d4ff;
            }
            .api-endpoint {
              background: rgba(0,0,0,0.2);
              padding: 10px;
              border-radius: 5px;
              font-family: monospace;
              margin: 10px 0;
            }
            .stats {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 20px;
              margin: 20px 0;
            }
            .stat-card {
              background: rgba(255,255,255,0.1);
              padding: 20px;
              border-radius: 10px;
              text-align: center;
            }
            .ton-logo {
              width: 50px;
              height: 50px;
              margin: 0 auto 20px;
              background: #0088cc;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              color: white;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="ton-logo">TON</div>
            <h1>🤖 ChannelSense TON</h1>
            <p style="text-align: center; font-size: 18px; margin-bottom: 30px;">
              AI-Powered Telegram Channel Analytics with TON Blockchain Integration
            </p>
            
            <div class="stats">
              <div class="stat-card">
                <h3>📊 Analytics</h3>
                <p>Real-time channel metrics and user engagement analysis</p>
              </div>
              <div class="stat-card">
                <h3>🤖 AI Insights</h3>
                <p>Smart sentiment analysis and community recommendations</p>
              </div>
              <div class="stat-card">
                <h3>💎 NFT Rewards</h3>
                <p>Blockchain-based rewards for active community members</p>
              </div>
              <div class="stat-card">
                <h3>🔗 TON Connect</h3>
                <p>Seamless wallet integration and transaction support</p>
              </div>
            </div>

            <div class="feature">
              <h3>🚀 Getting Started</h3>
              <p>1. Add @ChannelSenseTONBot to your Telegram group</p>
              <p>2. Use /connect to link your TON wallet</p>
              <p>3. Stay active and earn NFT rewards!</p>
            </div>

            <div class="feature">
              <h3>📱 Bot Commands</h3>
              <div class="api-endpoint">/start - Initialize the bot</div>
              <div class="api-endpoint">/connect - Connect TON wallet</div>
              <div class="api-endpoint">/analyze - Get channel analytics</div>
              <div class="api-endpoint">/top - View top contributors</div>
              <div class="api-endpoint">/sentiment - Analyze channel mood</div>
              <div class="api-endpoint">/rewards - Check your NFTs</div>
            </div>

            <div class="feature">
              <h3>🔧 API Endpoints</h3>
              <div class="api-endpoint">GET /api/channel/:chatId/analytics</div>
              <div class="api-endpoint">GET /api/channel/:chatId/top-users</div>
              <div class="api-endpoint">GET /api/user/:userId/rewards</div>
              <div class="api-endpoint">GET /tonconnect-manifest.json</div>
            </div>

            <div class="feature">
              <h3>💎 Features</h3>
              <ul>
                <li>Real-time message analysis and user tracking</li>
                <li>AI-powered sentiment analysis and insights</li>
                <li>Automated NFT rewards for top contributors</li>
                <li>TON blockchain integration</li>
                <li>Weekly analytics reports</li>
                <li>Custom reward systems</li>
              </ul>
            </div>

            <p style="text-align: center; margin-top: 30px; opacity: 0.8;">
              Built with ❤️ for the TON ecosystem | 
              <a href="https://github.com/channelsense" style="color: #00d4ff;">GitHub</a> | 
              <a href="/health" style="color: #00d4ff;">Health Check</a>
            </p>
          </div>
        </body>
        </html>
      `);
    });

    // Terms of service
    this.app.get('/terms', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Terms of Service - ChannelSense TON</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <h1>Terms of Service</h1>
          <p>By using ChannelSense TON, you agree to our terms of service.</p>
          <h2>Service Description</h2>
          <p>ChannelSense TON provides analytics and reward services for Telegram channels using TON blockchain technology.</p>
          <h2>User Responsibilities</h2>
          <p>Users are responsible for maintaining the security of their connected wallets and following community guidelines.</p>
          <h2>Privacy</h2>
          <p>We collect and process message data for analytics purposes. Personal data is handled according to our privacy policy.</p>
        </body>
        </html>
      `);
    });

    // Privacy policy
    this.app.get('/privacy', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Privacy Policy - ChannelSense TON</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <h1>Privacy Policy</h1>
          <p>This privacy policy explains how ChannelSense TON collects and uses your data.</p>
          <h2>Data Collection</h2>
          <p>We collect message content and metadata for analytics purposes. Wallet addresses are stored securely for reward distribution.</p>
          <h2>Data Usage</h2>
          <p>Collected data is used to generate analytics, insights, and distribute NFT rewards to active community members.</p>
          <h2>Data Security</h2>
          <p>We implement industry-standard security measures to protect user data and connected wallets.</p>
        </body>
        </html>
      `);
    });
  }

  async getChannelAnalytics(chatId, period) {
    const periodHours = this.getPeriodHours(period);
    const startDate = new Date(Date.now() - periodHours * 60 * 60 * 1000);
    
    const metrics = await this.database.getChannelMetrics(chatId, startDate);
    const hourlyActivity = await this.database.getHourlyActivity(chatId, startDate);
    
    return {
      totalMessages: metrics.totalMessages,
      activeUsers: metrics.activeUsers,
      period,
      hourlyActivity,
      lastUpdated: new Date().toISOString()
    };
  }

  async getTopUsers(chatId, period, limit) {
    const periodHours = this.getPeriodHours(period);
    const startDate = new Date(Date.now() - periodHours * 60 * 60 * 1000);
    
    const users = await this.database.getUserActivity(chatId, startDate, limit);
    
    return users.map(user => ({
      username: user.username || user.first_name || 'Unknown',
      messageCount: user.messageCount,
      rank: users.indexOf(user) + 1
    }));
  }

  getPeriodHours(period) {
    switch (period) {
      case 'day': return 24;
      case 'week': return 24 * 7;
      case 'month': return 24 * 30;
      default: return 24 * 7;
    }
  }

  async start() {
    try {
      this.server = this.app.listen(this.port, () => {
        console.log(`Web server running on port ${this.port}`);
        console.log(`TON Connect manifest: http://localhost:${this.port}/tonconnect-manifest.json`);
      });
    } catch (error) {
      console.error('Error starting web server:', error);
      throw error;
    }
  }

  async stop() {
    if (this.server) {
      this.server.close();
    }
  }
}
