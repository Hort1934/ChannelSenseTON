# ChannelSense TON - Usage Examples

This document provides practical examples of how to use ChannelSense TON for different scenarios.

## 📱 Bot Commands Examples

### Basic Setup

```
# Start the bot
/start

# Connect your TON wallet
/connect

# Get help
/help
```

### Analytics Commands

```
# Analyze channel activity for the past week
/analyze week

# Analyze for the past day
/analyze day

# Analyze for the past month
/analyze month

# Get top 10 users
/top 10

# Get top 5 users
/top 5

# Check channel sentiment
/sentiment

# Check your NFT rewards
/rewards
```

## 🔧 MCP Integration Examples

### Using with Claude or other AI assistants

```javascript
// Example MCP tool calls

// Analyze a specific channel
{
  "name": "analyze_channel",
  "arguments": {
    "chatId": "-1001234567890",
    "period": "week"
  }
}

// Get top users
{
  "name": "get_top_users",
  "arguments": {
    "chatId": "-1001234567890",
    "limit": 10,
    "period": "week"
  }
}

// Generate wallet connection for user
{
  "name": "connect_wallet",
  "arguments": {
    "userId": "123456789"
  }
}

// Mint NFT rewards
{
  "name": "mint_nft_reward",
  "arguments": {
    "chatId": "-1001234567890",
    "userIds": ["123456789", "987654321"]
  }
}

// Analyze sentiment
{
  "name": "get_channel_sentiment",
  "arguments": {
    "chatId": "-1001234567890",
    "period": "week"
  }
}
```

## 🌐 API Usage Examples

### Channel Analytics API

```bash
# Get channel analytics
curl "https://your-domain.com/api/channel/-1001234567890/analytics?period=week"

# Response
{
  "totalMessages": 156,
  "activeUsers": 23,
  "period": "week",
  "hourlyActivity": [
    {"hour": 9, "count": 12},
    {"hour": 10, "count": 18},
    // ...
  ],
  "lastUpdated": "2024-01-15T10:30:00Z"
}
```

### Top Users API

```bash
# Get top users
curl "https://your-domain.com/api/channel/-1001234567890/top-users?limit=5&period=week"

# Response
[
  {
    "username": "john_doe",
    "messageCount": 45,
    "rank": 1
  },
  {
    "username": "jane_smith",
    "messageCount": 38,
    "rank": 2
  }
  // ...
]
```

### User Rewards API

```bash
# Get user's NFT rewards
curl "https://your-domain.com/api/user/123456789/rewards"

# Response
[
  {
    "id": 1,
    "nft_address": "EQAbc123...",
    "transaction_hash": "abc123...",
    "metadata": {
      "name": "Weekly Champion #1",
      "channel": "Crypto Community"
    },
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

## 💎 NFT Reward Scenarios

### Scenario 1: Community Forum

**Setup:**
- Minimum 15 messages per week for rewards
- Top 5 users get NFTs
- Special NFTs for moderators

**Configuration:**
```env
MIN_MESSAGES_FOR_REWARD=15
TOP_USERS_COUNT=5
```

**Weekly Process:**
1. Bot analyzes all messages from past week
2. Calculates engagement scores
3. Identifies top 5 contributors with connected wallets
4. Mints NFTs with custom metadata
5. Sends private notifications to winners

### Scenario 2: Educational Channel

**Setup:**
- Students ask questions and help each other
- NFTs serve as course completion certificates
- Teachers can manually award special NFTs

**Custom Metadata:**
```json
{
  "name": "Blockchain Course Graduate",
  "description": "Completed advanced blockchain development course",
  "attributes": [
    {"trait_type": "Course", "value": "Blockchain Development"},
    {"trait_type": "Level", "value": "Advanced"},
    {"trait_type": "Participation Score", "value": "95"}
  ]
}
```

### Scenario 3: DAO Governance

**Setup:**
- NFT holders get voting rights
- Active participants earn governance tokens
- Quarterly special edition NFTs

**Features:**
- Verify NFT ownership for voting
- Track participation in governance discussions
- Automated rewards for proposal creators

## 🤖 AI Integration Examples

### Custom AI Prompts

You can modify AI prompts in `src/services/ai.js`:

```javascript
// Custom sentiment analysis
const customPrompt = `
Analyze sentiment for a ${channelType} community:
- Focus on ${specificTopics}
- Consider cultural context: ${region}
- Weight technical discussions higher
`;
```

### Analytics Insights

```javascript
// Example custom analytics
async function getCustomMetrics(chatId) {
  const metrics = await analytics.analyzeChannel(chatId, 'week');
  
  // Add custom calculations
  metrics.engagementRate = (metrics.totalMessages / metrics.activeUsers) * 100;
  metrics.growthTrend = calculateGrowthTrend(metrics);
  
  return metrics;
}
```

## 🔗 TON Connect Integration Examples

### Wallet Connection Flow

```javascript
// 1. User clicks /connect
// 2. Bot generates QR code
const { connectUrl, qrCodeUrl } = await tonConnect.generateConnectLink(userId);

// 3. User scans QR with TON wallet
// 4. Wallet confirms connection
// 5. Bot receives wallet address
const walletInfo = await tonConnect.getWalletInfo(userId);

// 6. Save to database
await database.saveUserWallet(userId, walletInfo);
```

### NFT Minting Process

```javascript
// Weekly reward process
const topUsers = await analytics.getTopUsers(chatId, 'week', 3);

for (const user of topUsers) {
  if (user.tonWallet) {
    const metadata = {
      name: `Weekly Champion #${Date.now()}`,
      description: `Top contributor for week ${weekNumber}`,
      attributes: [
        { trait_type: 'Rank', value: user.rank },
        { trait_type: 'Messages', value: user.messageCount },
        { trait_type: 'Engagement Score', value: user.engagementScore }
      ]
    };
    
    const result = await tonConnect.mintNFTReward(user.userId, chatId, metadata);
    
    if (result.success) {
      await bot.sendNFTRewardNotification(user.userId, result);
    }
  }
}
```

## 📊 Custom Analytics Examples

### Engagement Scoring Algorithm

```javascript
function calculateEngagementScore(user, messages) {
  let score = 0;
  
  // Base points for messages
  score += messages.length * 10;
  
  // Bonus for quality indicators
  messages.forEach(msg => {
    if (msg.reply_to_message_id) score += 5; // Replies
    if (msg.text.length > 100) score += 3;   // Long messages
    if (msg.entities?.some(e => e.type === 'url')) score += 2; // Links
  });
  
  // Time diversity bonus
  const hours = new Set(messages.map(m => new Date(m.date).getHours()));
  if (hours.size > 8) score += 20;
  
  return score;
}
```

### Custom Reports

```javascript
async function generateCustomReport(chatId) {
  const data = await Promise.all([
    analytics.analyzeChannel(chatId, 'month'),
    analytics.getTopUsers(chatId, 'month', 20),
    analytics.analyzeSentiment(chatId, 'month')
  ]);
  
  const report = {
    title: 'Monthly Community Report',
    summary: generateSummary(data),
    recommendations: generateRecommendations(data),
    charts: generateChartData(data)
  };
  
  return report;
}
```

## 🚀 Automation Examples

### Scheduled Tasks

```bash
# Weekly rewards (every Sunday at 9 AM)
0 9 * * 0 cd /path/to/project && node scripts/weeklyRewards.js

# Daily analytics summary (every day at 8 AM)
0 8 * * * cd /path/to/project && node scripts/dailySummary.js

# Monthly reports (first day of month at 10 AM)
0 10 1 * * cd /path/to/project && node scripts/monthlyReport.js
```

### Webhook Integration

```javascript
// Discord integration
app.post('/webhook/discord', async (req, res) => {
  const { chatId, report } = req.body;
  
  await discordBot.sendMessage(channel, {
    embeds: [{
      title: 'Weekly Telegram Analytics',
      description: report.summary,
      fields: [
        { name: 'Messages', value: report.totalMessages, inline: true },
        { name: 'Active Users', value: report.activeUsers, inline: true }
      ]
    }]
  });
  
  res.json({ success: true });
});
```

### Slack Integration

```javascript
// Slack notifications
async function sendSlackReport(report) {
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: '📊 Weekly Channel Report' }
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Messages:* ${report.totalMessages}` },
        { type: 'mrkdwn', text: `*Active Users:* ${report.activeUsers}` },
        { type: 'mrkdwn', text: `*Growth:* ${report.growth}%` },
        { type: 'mrkdwn', text: `*Sentiment:* ${report.sentiment.overall}` }
      ]
    }
  ];
  
  await slack.chat.postMessage({
    channel: '#analytics',
    blocks: blocks
  });
}
```

## 🎯 Advanced Use Cases

### Multi-Channel Management

```javascript
// Monitor multiple channels
const channels = [
  { id: '-1001234567890', name: 'Main Community' },
  { id: '-1001234567891', name: 'Developers' },
  { id: '-1001234567892', name: 'Trading' }
];

for (const channel of channels) {
  const metrics = await analytics.analyzeChannel(channel.id, 'week');
  
  if (metrics.growth < -10) {
    await alerts.send(`⚠️ Channel ${channel.name} shows declining activity`);
  }
}
```

### A/B Testing

```javascript
// Test different reward strategies
const strategies = {
  A: { minMessages: 10, topUsers: 3, frequency: 'weekly' },
  B: { minMessages: 5, topUsers: 5, frequency: 'biweekly' },
  C: { minMessages: 15, topUsers: 2, frequency: 'weekly' }
};

async function testStrategy(chatId, strategy) {
  // Implement strategy for a period
  // Measure engagement changes
  // Return results
}
```

### Compliance and Moderation

```javascript
// Automated content moderation
bot.on('message', async (msg) => {
  const moderation = await ai.moderateContent(msg.text);
  
  if (moderation.flagged) {
    await bot.deleteMessage(msg.chat.id, msg.message_id);
    await bot.sendMessage(adminChatId, 
      `⚠️ Flagged message from ${msg.from.username}: ${moderation.categories}`
    );
  }
});
```

## 📈 Performance Optimization

### Database Optimization

```javascript
// Use indexes for faster queries
await db.run('CREATE INDEX IF NOT EXISTS idx_messages_chat_date ON messages (chat_id, date)');
await db.run('CREATE INDEX IF NOT EXISTS idx_user_activity ON messages (user_id, chat_id, date)');
```

### Caching Strategy

```javascript
// Cache frequent queries
const cache = new Map();

async function getCachedAnalytics(chatId, period) {
  const key = `${chatId}:${period}`;
  
  if (cache.has(key)) {
    const { data, timestamp } = cache.get(key);
    if (Date.now() - timestamp < 3600000) { // 1 hour cache
      return data;
    }
  }
  
  const data = await analytics.analyzeChannel(chatId, period);
  cache.set(key, { data, timestamp: Date.now() });
  
  return data;
}
```

This comprehensive guide shows how to leverage ChannelSense TON for various community management scenarios. Adapt these examples to your specific needs and requirements.
