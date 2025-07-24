# 🤖 ChannelSense TON

AI-Powered Telegram Channel Analytics with TON Blockchain Integration

![TON](https://img.shields.io/badge/TON-Blockchain-blue)
![Telegram](https://img.shields.io/badge/Telegram-Bot-blue)
![AI](https://img.shields.io/badge/AI-Powered-green)
![MCP](https://img.shields.io/badge/MCP-Server-orange)

## 🌟 Overview

ChannelSense TON is an intelligent Telegram bot that analyzes channel activity, provides AI-driven insights, and rewards active community members with NFTs on the TON blockchain.This version is specifically adapted for Telegram communities and TON ecosystem.

## ✨ Features

### 📊 Advanced Analytics
- **Real-time Activity Tracking**: Monitor messages, user engagement, and growth metrics
- **Engagement Scoring**: Sophisticated algorithm to identify valuable contributors
- **Sentiment Analysis**: AI-powered mood and discussion topic analysis
- **Growth Analytics**: Track channel health and recommend improvements

### 🤖 AI-Powered Insights
- **Smart Summaries**: Automated weekly reports with actionable insights
- **Content Moderation**: AI content analysis and filtering
- **Trend Detection**: Identify emerging topics and discussions
- **User Behavior Analysis**: Understand community dynamics

### 💎 NFT Reward System
- **Automated Rewards**: Weekly NFT distribution to top contributors
- **Custom Metadata**: Personalized NFT attributes based on user activity
- **TON Blockchain**: Native integration with TON ecosystem
- **Wallet Integration**: Seamless TON Connect wallet linking

### 🔗 TON Connect Integration
- **Wallet Connection**: Easy wallet linking via QR codes
- **Transaction Support**: Direct blockchain interactions
- **Balance Verification**: Check user balances and NFT ownership
- **Secure Authentication**: Blockchain-based user verification

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- TON wallet (Tonkeeper, Telegram Wallet)
- Telegram Bot Token (from @BotFather)
- OpenAI API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/ChannelSenseTON.git
   cd ChannelSenseTON
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Configure environment**
   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   TON_CONNECT_MANIFEST_URL=https://your-domain.com/tonconnect-manifest.json
   OPENAI_API_KEY=your_openai_api_key_here
   ```

5. **Start the server**
   ```bash
   npm run dev
   ```

### Bot Setup

1. **Create Telegram Bot**
   - Message @BotFather
   - Use `/newbot` command
   - Save the bot token

2. **Add Bot to Channel**
   - Add your bot to Telegram group/channel
   - Grant admin rights for message reading

3. **Initialize Bot**
   - Send `/start` to your bot
   - Use `/connect` to link TON wallet
   - Start analyzing with `/analyze`

## 🎯 Usage

### Bot Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/start` | Initialize the bot | `/start` |
| `/guide` | Complete usage guide | `/guide` |
| `/connect` | Connect TON wallet | `/connect` |
| `/analyze [period]` | Analyze channel activity | `/analyze week` |
| `/top [number]` | Show top contributors | `/top 10` |
| `/sentiment` | Analyze channel sentiment | `/sentiment` |
| `/custom [query]` | Custom AI analysis with specific questions | `/custom Хто шукав навчання трейдингу?` |
| `/rewards` | Check NFT rewards | `/rewards` |
| `/help` | Show help information | `/help` |

### 📱 Using in Groups and Channels

#### Quick Setup:
1. **Add bot to your group/channel** as administrator
2. **Grant permissions**: Read messages, Send messages, Pin messages
3. **Send `/start`** to activate analytics
4. **Use `/analyze`** to see current statistics

#### For Group Members:
- **Get NFT rewards** by being active (min. 10 messages/week)
- **Connect wallet**: Send `/connect` to bot in private messages
- **Check rankings**: Use `/top` to see leaderboard
- **View sentiment**: Use `/sentiment` for community mood

#### Weekly NFT Rewards:
- 🥇 **1st place**: Gold NFT badge + special metadata
- 🥈 **2nd place**: Silver NFT badge  
- 🥉 **3rd place**: Bronze NFT badge
- **Criteria**: Activity, quality content, positive engagement

#### Automatic Features:
- 📊 **Weekly reports** every Sunday with full analytics
- 🤖 **AI insights** about community trends and topics
- 💎 **Automatic NFT minting** for top contributors
- 📈 **Real-time activity tracking** and engagement scoring

💡 **Pro Tip**: Use `/guide` in private chat for complete instructions!

### 📋 Example Group Usage

```
👥 Crypto Community Group

/analyze                    → See daily/weekly stats
/top 5                     → Top 5 most active members  
/sentiment                 → Community mood analysis
/rewards                   → Who got NFTs this week

🏆 Weekly Leaderboard:
1. @alice_crypto - 45 msgs 🥇 NFT
2. @bob_trader - 38 msgs 🥈 NFT  
3. @charlie_dev - 29 msgs 🥉 NFT

📊 Sunday Report:
"This week: 847 messages (+23%), 
Sentiment: Very Positive,
Top topics: DeFi, TON development"
```

### API Endpoints

```http
# Channel Analytics
GET /api/channel/:chatId/analytics?period=week

# Top Users
GET /api/channel/:chatId/top-users?limit=10&period=week

# User Rewards
GET /api/user/:userId/rewards

# TON Connect Manifest
GET /tonconnect-manifest.json

# Health Check
GET /health
```

### MCP Integration

The server implements Model Context Protocol (MCP) for seamless AI assistant integration:

```javascript
// Available MCP tools
- analyze_channel: Analyze Telegram channel activity
- get_top_users: Get top active users
- connect_wallet: Generate TON Connect link
- mint_nft_reward: Mint NFT rewards
- get_channel_sentiment: Analyze sentiment
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Telegram Bot  │───▶│   MCP Server     │───▶│   TON Connect   │
│                 │    │                  │    │                 │
│ • Commands      │    │ • Analytics      │    │ • Wallet Link   │
│ • Messages      │    │ • AI Processing  │    │ • NFT Minting   │
│ • Webhooks      │    │ • Database       │    │ • Transactions  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│    Database     │    │   AI Service     │    │  TON Blockchain │
│                 │    │                  │    │                 │
│ • SQLite        │    │ • OpenAI GPT     │    │ • Smart Contracts
│ • User Data     │    │ • Sentiment      │    │ • NFT Collections
│ • Analytics     │    │ • Insights       │    │ • Transactions  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📊 Analytics Features

### Channel Metrics
- **Message Volume**: Total messages per period
- **Active Users**: Unique contributors
- **Growth Rate**: Period-over-period growth
- **Peak Activity**: Most active hours/days
- **Engagement Score**: Quality metric for discussions

### User Analytics
- **Message Count**: Total messages per user
- **Engagement Score**: Calculated based on:
  - Message frequency
  - Reply interactions
  - Message quality (length, replies received)
  - Time consistency
- **Wallet Status**: TON Connect integration status
- **Reward History**: NFT rewards received

### AI Insights
- **Sentiment Analysis**: Overall channel mood
- **Topic Extraction**: Trending discussion themes
- **Community Health**: Growth recommendations
- **Moderation Alerts**: Content flagging

## 💎 NFT Reward System

### Reward Criteria
- **Minimum Activity**: 10+ messages per week
- **Connected Wallet**: TON Connect integration required
- **Top Contributors**: Weekly top 3 users
- **Quality Engagement**: High engagement score

### NFT Metadata
```json
{
  "name": "ChannelSense Reward #123",
  "description": "Awarded for outstanding community contribution",
  "image": "https://channelsense.com/nft-reward.png",
  "attributes": [
    {
      "trait_type": "Channel",
      "value": "Community Chat"
    },
    {
      "trait_type": "Rank",
      "value": "1"
    },
    {
      "trait_type": "Messages",
      "value": "150"
    },
    {
      "trait_type": "Engagement Score",
      "value": "850"
    }
  ]
}
```

## 🔧 Configuration

### Environment Variables

```env
# Telegram Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhook

# TON Connect Configuration
TON_CONNECT_MANIFEST_URL=https://your-domain.com/tonconnect-manifest.json
TON_NETWORK=testnet
TON_RPC_ENDPOINT=https://testnet.toncenter.com/api/v2/

# AI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Database
DATABASE_PATH=./data/database.sqlite

# Server Configuration
PORT=3000
NODE_ENV=development

# Analytics Settings
ANALYTICS_INTERVAL_HOURS=24
TOP_USERS_COUNT=3
MIN_MESSAGES_FOR_REWARD=10
```

### TON Connect Manifest

The bot automatically serves a TON Connect manifest at `/tonconnect-manifest.json`:

```json
{
  "url": "https://your-domain.com",
  "name": "ChannelSense TON",
  "iconUrl": "https://your-domain.com/icon.png",
  "termsOfUseUrl": "https://your-domain.com/terms",
  "privacyPolicyUrl": "https://your-domain.com/privacy"
}
```

## 🛠️ Development

### Project Structure

```
ChannelSenseTON/
├── src/
│   ├── index.js              # Main MCP server
│   └── services/
│       ├── telegramBot.js    # Telegram bot logic
│       ├── tonConnect.js     # TON blockchain integration
│       ├── analytics.js      # Analytics engine
│       ├── database.js       # Database service
│       ├── ai.js            # AI/OpenAI service
│       └── webServer.js     # Web server & API
├── data/                     # Database storage
├── public/                   # Static assets
├── package.json
├── .env.example
└── README.md
```

### Development Commands

```bash
# Development with auto-reload
npm run dev

# Production start
npm start

# Install dependencies
npm install

# Run tests (when available)
npm test
```

### Adding New Features

1. **New MCP Tools**: Add to `src/index.js` tools list and handlers
2. **Bot Commands**: Extend `src/services/telegramBot.js`
3. **Analytics**: Enhance `src/services/analytics.js`
4. **API Endpoints**: Add to `src/services/webServer.js`

## 🤝 TON Ecosystem Integration

### Supported Wallets
- **Tonkeeper**: Native TON wallet
- **Telegram Wallet**: Built-in Telegram wallet
- **OpenMask**: Browser extension wallet
- **MyTonWallet**: Multi-platform wallet

### Blockchain Features
- **NFT Minting**: TEP-62 standard NFTs
- **Collection Management**: Automated collection creation
- **Transaction Tracking**: On-chain verification
- **Balance Checking**: Real-time balance queries

### Smart Contracts
The system uses standard TON smart contracts:
- **NFT Collection**: Manages reward NFTs
- **NFT Item**: Individual reward tokens
- **Wallet V4**: Standard TON wallet integration

## 📈 Use Cases

### Community Management
- **Growth Tracking**: Monitor channel expansion
- **Quality Control**: Identify valuable contributors
- **Engagement Boosting**: Reward active members
- **Moderation**: AI-assisted content filtering

### DAO Integration
- **Governance**: NFT-based voting rights
- **Rewards**: Automated contributor recognition
- **Analytics**: Data-driven decision making
- **Transparency**: On-chain reward tracking

### Event Management
- **Conference Access**: NFT-based entry tickets
- **Speaker Recognition**: Reward system for speakers
- **Networking**: Connect active community members
- **Feedback**: Sentiment analysis for events

## 🔒 Security

### Environment Variables & API Keys
- **Never commit real API keys** to version control
- **Use .env file** for local development (ignored by git)
- **Use .env.example** as template with placeholder values
- **Set production variables** in your deployment platform
- **Rotate keys regularly** and monitor for exposure

### Data Protection
- **Encryption**: All sensitive data encrypted at rest
- **Privacy**: GDPR-compliant data handling
- **Access Control**: Role-based permissions
- **Audit Logs**: Complete action tracking

### Wallet Security
- **Non-Custodial**: Users control their private keys
- **Secure Connection**: TON Connect standard compliance
- **Transaction Verification**: Multi-step confirmation
- **Rate Limiting**: Protection against abuse

### Security Checklist
- [ ] All API keys stored in environment variables
- [ ] .env file added to .gitignore
- [ ] Production secrets configured in deployment platform
- [ ] No hardcoded credentials in source code
- [ ] Regular security audits performed

## 🌐 Deployment

### Using Railway/Vercel

1. **Fork the repository**
2. **Connect to deployment platform**
3. **Set environment variables**
4. **Deploy automatically**

### Using Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Using PM2

```json
{
  "apps": [{
    "name": "channelsense-ton",
    "script": "src/index.js",
    "instances": 1,
    "autorestart": true,
    "watch": false,
    "max_memory_restart": "1G",
    "env": {
      "NODE_ENV": "production"
    }
  }]
}
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit changes** (`git commit -m 'Add amazing feature'`)
4. **Push to branch** (`git push origin feature/amazing-feature`)
5. **Open Pull Request**

### Development Guidelines
- Follow ESLint configuration
- Write comprehensive tests
- Update documentation
- Maintain backward compatibility

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **TON Foundation** for blockchain infrastructure
- **Telegram** for bot platform
- **OpenAI** for AI capabilities
- **Model Context Protocol** for MCP standards

## 🔗 Links

- **TON Documentation**: https://docs.ton.org/
- **Telegram Bot API**: https://core.telegram.org/bots/api
- **TON Connect**: https://docs.ton.org/develop/dapps/ton-connect/
- **OpenAI API**: https://platform.openai.com/docs

## 📞 Support

- **GitHub Issues**: [Create an issue](https://github.com/your-username/ChannelSenseTON/issues)
- **Telegram**: @userhort
- **Email**: support@channelsense.com

---

**Built with ❤️ for the TON ecosystem**
