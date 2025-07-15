# 🏗️ ChannelSense TON - Architecture Overview

This document provides a technical overview of the ChannelSense TON architecture and its components.

## 🎯 System Overview

ChannelSense TON is a modular MCP (Model Context Protocol) server that bridges Telegram channel analytics with TON blockchain rewards. The system analyzes user activity, provides AI-driven insights, and automatically distributes NFT rewards to active community members.

```
┌─────────────────────────────────────────────────────────────────┐
│                    ChannelSense TON System                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────┐  │
│  │   Telegram Bot  │────│   MCP Server     │────│ TON Connect │  │
│  │                 │    │                  │    │             │  │
│  │ • Commands      │    │ • Tool Handlers  │    │ • Wallet    │  │
│  │ • Webhooks      │    │ • AI Integration │    │ • NFT Mint  │  │
│  │ • Messages      │    │ • Analytics      │    │ • Payments  │  │
│  └─────────────────┘    └──────────────────┘    └─────────────┘  │
│           │                       │                       │      │
│           ▼                       ▼                       ▼      │
│  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────┐  │
│  │    Database     │    │   AI Service     │    │ Web Server  │  │
│  │                 │    │                  │    │             │  │
│  │ • User Data     │    │ • OpenAI GPT     │    │ • REST API  │  │
│  │ • Messages      │    │ • Sentiment      │    │ • Dashboard │  │
│  │ • Analytics     │    │ • Insights       │    │ • Webhooks  │  │
│  │ • NFT Records   │    │ • Moderation     │    │ • Manifest  │  │
│  └─────────────────┘    └──────────────────┘    └─────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────────┐
                    │        TON Blockchain           │
                    │                                 │
                    │ • Smart Contracts               │
                    │ • NFT Collections               │
                    │ • Wallet Transactions           │
                    │ • On-chain Verification         │
                    └─────────────────────────────────┘
```

## 🔧 Core Components

### 1. MCP Server (`src/index.js`)
The main entry point that implements the Model Context Protocol specification.

**Responsibilities:**
- Tool registration and handling
- Request/response management
- Service orchestration
- Error handling and logging

**Key Tools:**
- `analyze_channel`: Channel activity analysis
- `get_top_users`: User ranking and statistics
- `connect_wallet`: TON wallet integration
- `mint_nft_reward`: NFT reward distribution
- `get_channel_sentiment`: AI sentiment analysis

### 2. Telegram Bot Service (`src/services/telegramBot.js`)
Handles all Telegram Bot API interactions and user commands.

**Features:**
- Command processing (`/start`, `/connect`, `/analyze`, etc.)
- Message tracking and storage
- User onboarding and welcome messages
- NFT reward notifications
- Real-time analytics reporting

**Message Flow:**
```
Telegram User → Bot Command → Command Handler → Service Logic → Response
```

### 3. TON Connect Service (`src/services/tonConnect.js`)
Manages TON blockchain integration and wallet connections.

**Components:**
- Wallet connection via QR codes
- NFT minting and metadata generation
- Transaction monitoring
- Balance verification
- Smart contract interactions

**Connection Flow:**
```
User Request → QR Generation → Wallet Scan → Blockchain Auth → Address Storage
```

### 4. Analytics Service (`src/services/analytics.js`)
Processes channel data and generates insights.

**Metrics Calculated:**
- Message volume and growth
- User engagement scores
- Activity patterns (hourly/daily)
- Community health indicators
- Reward eligibility determination

**Engagement Scoring Algorithm:**
```javascript
base_score = message_count * 10
+ replies * 5
+ long_messages * 3
+ time_diversity_bonus * 15
+ interaction_received * 8
```

### 5. AI Service (`src/services/ai.js`)
Provides artificial intelligence capabilities using OpenAI GPT.

**Functions:**
- Sentiment analysis of messages
- Channel insight generation
- Content moderation
- Custom NFT metadata creation
- Community health assessment

### 6. Database Service (`src/services/database.js`)
Manages data persistence and retrieval.

**Schema:**
```sql
users: user_id, username, first_name, wallet_info
messages: message_id, chat_id, user_id, text, date, metadata
user_wallets: user_id, address, chain, public_key
nft_rewards: user_id, chat_id, nft_address, metadata
weekly_reports: chat_id, report_data, week_range
user_activity_cache: user_id, chat_id, date, metrics
```

### 7. Web Server (`src/services/webServer.js`)
Provides HTTP API and TON Connect manifest.

**Endpoints:**
- `/api/channel/:id/analytics` - Channel metrics
- `/api/user/:id/rewards` - User NFT history
- `/tonconnect-manifest.json` - TON Connect configuration
- `/health` - System health check
- `/` - Dashboard interface

## 🔄 Data Flow

### Message Processing Pipeline
```
1. Telegram Message → Bot Webhook
2. Message Storage → Database
3. User Activity Update → Cache
4. Real-time Analytics → Dashboard
5. Periodic Analysis → AI Insights
6. Weekly Rewards → NFT Minting
```

### Analytics Generation
```
1. Raw Message Data → Database Query
2. Aggregation → Metrics Calculation
3. AI Analysis → Insights Generation
4. Report Creation → Storage
5. Notification → Users/Admins
```

### Reward Distribution
```
1. Weekly Trigger → Analytics Run
2. Top User Identification → Eligibility Check
3. Wallet Verification → Connected Users
4. NFT Minting → TON Blockchain
5. Notification → Reward Recipients
```

## 🛡️ Security Architecture

### Authentication & Authorization
- TON Connect wallet-based authentication
- Session management for connected wallets
- Role-based access control for admin functions
- Rate limiting on API endpoints

### Data Security
- Environment variable management
- Database encryption at rest
- Secure API key storage
- Input validation and sanitization

### Blockchain Security
- Non-custodial wallet integration
- Multi-signature support (optional)
- Transaction verification
- Smart contract auditing

## 📊 Performance Considerations

### Caching Strategy
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   L1 Cache      │    │   L2 Cache      │    │   L3 Storage    │
│   (Memory)      │    │   (Redis)       │    │   (Database)    │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Real-time     │    │ • Analytics     │    │ • Historical    │
│ • User sessions │    │ • API responses │    │ • Raw messages  │
│ • Active data   │    │ • Computed      │    │ • User profiles │
│   (5 minutes)   │    │   (1 hour)      │    │   (permanent)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Database Optimization
- Indexed queries for fast lookups
- Activity cache for frequent operations
- Periodic cleanup of old data
- Read replicas for analytics queries

### Scalability Design
- Stateless service architecture
- Horizontal scaling capability
- Queue-based background processing
- Microservice-ready component design

## 🔌 Integration Points

### External APIs
```
OpenAI GPT-4 ← AI Service ← Analytics
     ↓
TON RPC ← TON Connect ← Wallet Operations
     ↓
Telegram Bot API ← Bot Service ← User Interactions
```

### Webhook Endpoints
- Telegram Bot webhooks for real-time message processing
- TON Connect callbacks for wallet status updates
- Custom webhooks for third-party integrations

### Event System
```javascript
// Event-driven architecture
EventEmitter.on('message.received', handleMessage);
EventEmitter.on('wallet.connected', updateUserProfile);
EventEmitter.on('reward.minted', notifyUser);
EventEmitter.on('analysis.complete', generateReport);
```

## 🎛️ Configuration Management

### Environment-based Configuration
```
Development: .env.local (SQLite, Testnet, Debug logs)
Staging: .env.staging (PostgreSQL, Testnet, Info logs)
Production: .env.production (PostgreSQL, Mainnet, Error logs)
```

### Feature Flags
```javascript
const features = {
  autoRewards: process.env.ENABLE_AUTO_REWARDS === 'true',
  aiModeration: process.env.ENABLE_AI_MODERATION === 'true',
  betaFeatures: process.env.ENABLE_BETA_FEATURES === 'true'
};
```

## 📈 Monitoring & Observability

### Metrics Collection
```
Application Metrics:
• Message processing rate
• API response times
• User engagement scores
• NFT minting success rate

System Metrics:
• Memory usage
• CPU utilization
• Database connections
• Network latency

Business Metrics:
• Active channels
• Wallet connections
• Rewards distributed
• User growth rate
```

### Health Checks
```javascript
const healthChecks = {
  database: () => db.query('SELECT 1'),
  telegram: () => bot.getMe(),
  ai: () => openai.models.list(),
  blockchain: () => tonClient.getMasterchainInfo()
};
```

## 🔮 Future Architecture Considerations

### Planned Enhancements
1. **Multi-chain Support**: Extend beyond TON to Ethereum, BSC
2. **Advanced Analytics**: Machine learning models for prediction
3. **Real-time Dashboard**: WebSocket-based live updates
4. **Plugin System**: Extensible architecture for custom features
5. **Mobile App**: Native mobile interface for analytics

### Scalability Roadmap
```
Phase 1: Single server deployment (Current)
Phase 2: Load-balanced multi-instance setup
Phase 3: Microservices architecture
Phase 4: Kubernetes-based container orchestration
Phase 5: Global multi-region deployment
```

This architecture provides a solid foundation for channel analytics and blockchain rewards while maintaining flexibility for future enhancements and scaling needs.
