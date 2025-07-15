# ChannelSense TON Setup Guide

## Prerequisites

Before setting up ChannelSense TON, ensure you have:

1. **Node.js 18+** installed
2. **Telegram Bot Token** from @BotFather
3. **OpenAI API Key** for AI features
4. **Domain** for TON Connect (can use ngrok for development)

## Step-by-Step Setup

### 1. Create Telegram Bot

1. Open Telegram and message @BotFather
2. Send `/newbot` command
3. Choose a name for your bot (e.g., "ChannelSense Analytics")
4. Choose a username (e.g., "channelsense_analytics_bot")
5. Save the bot token provided

### 2. Get OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com)
2. Create an account or sign in
3. Go to API Keys section
4. Create a new secret key
5. Save the API key securely

### 3. Set Up Development Environment

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd ChannelSenseTON
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```

3. **Edit .env file**
   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
   OPENAI_API_KEY=sk-your_openai_api_key
   TON_CONNECT_MANIFEST_URL=https://your-domain.com/tonconnect-manifest.json
   PORT=3000
   ```

### 4. Set Up Public URL (Development)

For TON Connect to work, you need a public HTTPS URL:

**Option A: Using ngrok**
```bash
# Install ngrok
npm install -g ngrok

# In one terminal, start your app
npm run dev

# In another terminal, expose it
ngrok http 3000
```

**Option B: Using Railway**
1. Push code to GitHub
2. Connect Railway to your repository
3. Deploy automatically
4. Use provided Railway URL

**Option C: Using Vercel**
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in project directory
3. Follow deployment prompts

### 5. Update Configuration

Update your `.env` file with the public URL:
```env
TON_CONNECT_MANIFEST_URL=https://your-ngrok-url.ngrok.io/tonconnect-manifest.json
TELEGRAM_WEBHOOK_URL=https://your-ngrok-url.ngrok.io/webhook
```

### 6. Start the Application

```bash
npm run dev
```

You should see:
```
Database initialized successfully
Telegram Bot initialized successfully
Web server running on port 3000
TON Connect manifest: http://localhost:3000/tonconnect-manifest.json
ChannelSense TON MCP server running on stdio
```

### 7. Test the Bot

1. **Start conversation with your bot**
   - Find your bot in Telegram
   - Send `/start` command

2. **Add bot to a group**
   - Add your bot to a Telegram group
   - Grant admin permissions for reading messages

3. **Test commands**
   ```
   /start - Initialize bot
   /connect - Connect TON wallet
   /analyze - Analyze channel activity
   /help - Show all commands
   ```

### 8. Set Up Weekly Rewards (Optional)

For automated weekly rewards, set up a cron job:

**Using crontab (Linux/Mac)**
```bash
# Edit crontab
crontab -e

# Add weekly execution (every Sunday at 9 AM)
0 9 * * 0 cd /path/to/ChannelSenseTON && node scripts/weeklyRewards.js
```

**Using GitHub Actions**
Create `.github/workflows/weekly-rewards.yml`:
```yaml
name: Weekly Rewards
on:
  schedule:
    - cron: '0 9 * * 0'  # Every Sunday at 9 AM UTC

jobs:
  rewards:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: node scripts/weeklyRewards.js
        env:
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## Production Deployment

### Using Railway

1. **Prepare for deployment**
   ```bash
   # Ensure all environment variables are set
   # Push to GitHub repository
   ```

2. **Deploy to Railway**
   - Connect GitHub repository to Railway
   - Set environment variables in Railway dashboard
   - Deploy automatically

3. **Set up custom domain (optional)**
   - Configure custom domain in Railway
   - Update TON Connect manifest URL

### Using Docker

1. **Create Dockerfile** (already included)

2. **Build and run**
   ```bash
   docker build -t channelsense-ton .
   docker run -p 3000:3000 --env-file .env channelsense-ton
   ```

### Environment Variables for Production

```env
# Required
TELEGRAM_BOT_TOKEN=your_production_bot_token
OPENAI_API_KEY=your_openai_api_key
TON_CONNECT_MANIFEST_URL=https://your-production-domain.com/tonconnect-manifest.json

# TON Network (use mainnet for production)
TON_NETWORK=mainnet
TON_RPC_ENDPOINT=https://toncenter.com/api/v2/

# Security
NODE_ENV=production
CRON_SECRET=your_secure_cron_secret

# Database (use PostgreSQL for production)
DATABASE_URL=postgresql://user:password@host:port/database

# Optional
ANALYTICS_INTERVAL_HOURS=24
TOP_USERS_COUNT=3
MIN_MESSAGES_FOR_REWARD=10
```

## Troubleshooting

### Common Issues

1. **Bot not responding**
   - Check bot token is correct
   - Ensure bot has proper permissions in group
   - Check logs for error messages

2. **TON Connect not working**
   - Verify manifest URL is accessible via HTTPS
   - Check TON Connect configuration
   - Ensure wallet app supports your manifest

3. **AI features not working**
   - Verify OpenAI API key is valid
   - Check API quota and billing
   - Review error logs for specific issues

4. **Database errors**
   - Ensure data directory exists and is writable
   - Check disk space
   - Verify SQLite installation

### Debugging

Enable debug logging:
```env
DEBUG=channelsense:*
NODE_ENV=development
```

Check logs:
```bash
# View real-time logs
npm run dev

# Check specific service logs
DEBUG=channelsense:telegram npm run dev
DEBUG=channelsense:database npm run dev
```

### Performance Optimization

For high-traffic channels:

1. **Use PostgreSQL instead of SQLite**
   ```env
   DATABASE_URL=postgresql://user:password@host:port/database
   ```

2. **Enable Redis caching**
   ```env
   REDIS_URL=redis://localhost:6379
   ```

3. **Use PM2 for production**
   ```bash
   npm install -g pm2
   pm2 start ecosystem.config.js
   ```

## Support

If you encounter issues:

1. Check the [troubleshooting section](#troubleshooting)
2. Review [GitHub Issues](https://github.com/your-username/ChannelSenseTON/issues)
3. Join our [Telegram support group](https://t.me/channelsense_support)
4. Create a new issue with detailed information

## Next Steps

After successful setup:

1. **Customize NFT metadata** in `src/services/tonConnect.js`
2. **Adjust analytics algorithms** in `src/services/analytics.js`
3. **Add custom bot commands** in `src/services/telegramBot.js`
4. **Enhance AI prompts** in `src/services/ai.js`
5. **Set up monitoring** and alerting for production use
