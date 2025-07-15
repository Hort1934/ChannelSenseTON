# 🚀 ChannelSense TON - Deployment Guide

This guide covers deploying ChannelSense TON to production environments.

## 📋 Pre-Deployment Checklist

- [ ] Telegram Bot Token obtained from @BotFather
- [ ] OpenAI API Key with sufficient credits
- [ ] Domain name configured (for TON Connect)
- [ ] SSL certificate configured
- [ ] Environment variables configured
- [ ] Database backup strategy planned
- [ ] Monitoring and alerting set up

## 🌐 Deployment Options

### Option 1: Railway (Recommended)

Railway offers easy deployment with automatic HTTPS and environment management.

1. **Prepare Repository**
   ```bash
   git add .
   git commit -m "Initial deployment"
   git push origin main
   ```

2. **Deploy to Railway**
   - Visit [Railway.app](https://railway.app)
   - Connect your GitHub repository
   - Select the ChannelSenseTON repository
   - Railway will automatically detect Node.js and deploy

3. **Configure Environment Variables**
   In Railway dashboard, add:
   ```
   TELEGRAM_BOT_TOKEN=your_bot_token
   OPENAI_API_KEY=your_openai_key
   TON_CONNECT_MANIFEST_URL=https://your-app.railway.app/tonconnect-manifest.json
   TON_NETWORK=mainnet
   NODE_ENV=production
   ```

4. **Custom Domain (Optional)**
   - Add custom domain in Railway settings
   - Update TON_CONNECT_MANIFEST_URL to use custom domain

### Option 2: Vercel

Ideal for the web interface with serverless functions.

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Configure Environment Variables**
   ```bash
   vercel env add TELEGRAM_BOT_TOKEN
   vercel env add OPENAI_API_KEY
   vercel env add TON_CONNECT_MANIFEST_URL
   ```

4. **Set up Serverless Functions**
   Create `api/bot.js` for webhook handling:
   ```javascript
   import { TelegramBot } from '../src/services/telegramBot.js';
   
   const bot = new TelegramBot();
   
   export default async function handler(req, res) {
     if (req.method === 'POST') {
       await bot.handleWebhook(req.body);
       res.status(200).json({ ok: true });
     } else {
       res.status(405).json({ error: 'Method not allowed' });
     }
   }
   ```

### Option 3: Docker

For custom hosting environments.

1. **Build Docker Image**
   ```bash
   docker build -t channelsense-ton .
   ```

2. **Run Container**
   ```bash
   docker run -d \
     --name channelsense-ton \
     -p 3000:3000 \
     -e TELEGRAM_BOT_TOKEN=your_token \
     -e OPENAI_API_KEY=your_key \
     -v $(pwd)/data:/app/data \
     channelsense-ton
   ```

3. **Docker Compose (Recommended)**
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
         - OPENAI_API_KEY=${OPENAI_API_KEY}
         - TON_CONNECT_MANIFEST_URL=${TON_CONNECT_MANIFEST_URL}
       volumes:
         - ./data:/app/data
       restart: unless-stopped
   ```

### Option 4: VPS (Ubuntu/CentOS)

For full control over the deployment environment.

1. **Server Setup**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 for process management
   sudo npm install -g pm2
   
   # Install Nginx for reverse proxy
   sudo apt install nginx -y
   ```

2. **Deploy Application**
   ```bash
   # Clone repository
   git clone https://github.com/your-username/ChannelSenseTON.git
   cd ChannelSenseTON
   
   # Install dependencies
   npm install --production
   
   # Create environment file
   cp .env.example .env
   # Edit .env with your values
   
   # Start with PM2
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

3. **Nginx Configuration**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **SSL with Let's Encrypt**
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d your-domain.com
   ```

## 🔧 Production Configuration

### Environment Variables

```env
# Production settings
NODE_ENV=production
PORT=3000

# Telegram Configuration
TELEGRAM_BOT_TOKEN=your_production_bot_token
TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhook

# TON Configuration
TON_CONNECT_MANIFEST_URL=https://your-domain.com/tonconnect-manifest.json
TON_NETWORK=mainnet
TON_RPC_ENDPOINT=https://toncenter.com/api/v2/

# AI Configuration
OPENAI_API_KEY=your_openai_api_key

# Database (use PostgreSQL for production)
DATABASE_URL=postgresql://user:password@host:port/database

# Security
CRON_SECRET=your_secure_random_string
JWT_SECRET=your_jwt_secret

# Monitoring
SENTRY_DSN=your_sentry_dsn
LOG_LEVEL=info

# Analytics
ANALYTICS_INTERVAL_HOURS=24
TOP_USERS_COUNT=3
MIN_MESSAGES_FOR_REWARD=10
```

### Database Migration (SQLite to PostgreSQL)

For production, consider migrating to PostgreSQL:

1. **Install PostgreSQL**
   ```bash
   sudo apt install postgresql postgresql-contrib -y
   ```

2. **Create Database**
   ```sql
   CREATE DATABASE channelsense_ton;
   CREATE USER channelsense WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE channelsense_ton TO channelsense;
   ```

3. **Update Database Service**
   ```javascript
   // src/services/database.js
   import pg from 'pg';
   
   const client = new pg.Client({
     connectionString: process.env.DATABASE_URL,
     ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
   });
   ```

### PM2 Configuration

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'channelsense-ton',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true
  }]
};
```

## 📊 Monitoring and Logging

### Health Checks

```javascript
// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: await checkDatabaseHealth(),
    telegram: await checkTelegramConnection(),
    ton: await checkTONConnection()
  };
  
  res.json(health);
});
```

### Logging Configuration

```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

### Error Tracking with Sentry

```javascript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});

// Error handler middleware
app.use(Sentry.Handlers.errorHandler());
```

## 🔒 Security Considerations

### Rate Limiting

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

### Input Validation

```javascript
import joi from 'joi';

const validateChatId = joi.object({
  chatId: joi.string().pattern(/^-?\d+$/).required()
});

app.get('/api/channel/:chatId/analytics', async (req, res) => {
  const { error } = validateChatId.validate(req.params);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  // ... rest of handler
});
```

### Environment Security

```bash
# Set proper file permissions
chmod 600 .env
chown app:app .env

# Use secrets management in production
export TELEGRAM_BOT_TOKEN=$(vault kv get -field=token secret/telegram)
```

## 📈 Performance Optimization

### Caching

```javascript
import redis from 'redis';

const client = redis.createClient({
  url: process.env.REDIS_URL
});

// Cache analytics results
async function getCachedAnalytics(chatId, period) {
  const key = `analytics:${chatId}:${period}`;
  const cached = await client.get(key);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const data = await analytics.analyzeChannel(chatId, period);
  await client.setex(key, 3600, JSON.stringify(data)); // 1 hour cache
  
  return data;
}
```

### Database Optimization

```sql
-- Create indexes for better performance
CREATE INDEX idx_messages_chat_date ON messages (chat_id, date);
CREATE INDEX idx_messages_user_chat ON messages (user_id, chat_id);
CREATE INDEX idx_user_activity_cache_chat_date ON user_activity_cache (chat_id, date);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM messages WHERE chat_id = '-1001234567890' AND date >= NOW() - INTERVAL '7 days';
```

## 🔄 Backup and Recovery

### Database Backup

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# PostgreSQL backup
pg_dump $DATABASE_URL > $BACKUP_DIR/database_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/database_$DATE.sql

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

# Upload to cloud storage (optional)
aws s3 cp $BACKUP_DIR/database_$DATE.sql.gz s3://your-backup-bucket/
```

### Automated Backups

```bash
# Add to crontab
0 2 * * * /path/to/backup.sh
```

## 📱 Bot Configuration

### Webhook Setup

```javascript
// Set webhook for production
const webhookUrl = `${process.env.TELEGRAM_WEBHOOK_URL}/webhook`;
await bot.setWebHook(webhookUrl);

// Webhook handler
app.post('/webhook', express.json(), async (req, res) => {
  try {
    await telegramBot.handleUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    logger.error('Webhook error:', error);
    res.sendStatus(500);
  }
});
```

### Bot Commands Setup

```javascript
// Set bot commands for better UX
await bot.setMyCommands([
  { command: 'start', description: 'Start the bot' },
  { command: 'connect', description: 'Connect TON wallet' },
  { command: 'analyze', description: 'Analyze channel activity' },
  { command: 'top', description: 'Show top users' },
  { command: 'sentiment', description: 'Analyze channel sentiment' },
  { command: 'rewards', description: 'Check NFT rewards' },
  { command: 'help', description: 'Show help information' }
]);
```

## 🎯 Scaling Considerations

### Horizontal Scaling

```yaml
# docker-compose.yml for multiple instances
version: '3.8'
services:
  app:
    build: .
    replicas: 3
    ports:
      - "3000-3002:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - redis
      - postgres
  
  redis:
    image: redis:alpine
    
  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: channelsense_ton
```

### Load Balancing

```nginx
upstream channelsense_backend {
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
}

server {
    location / {
        proxy_pass http://channelsense_backend;
    }
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Memory Leaks**
   ```bash
   # Monitor memory usage
   pm2 monit
   
   # Restart if memory usage is high
   pm2 restart channelsense-ton
   ```

2. **Database Connection Issues**
   ```bash
   # Check database connectivity
   psql $DATABASE_URL -c "SELECT 1;"
   
   # Check connection pool
   SELECT count(*) FROM pg_stat_activity WHERE datname = 'channelsense_ton';
   ```

3. **API Rate Limits**
   ```javascript
   // Implement exponential backoff
   async function retryWithBackoff(fn, retries = 3) {
     for (let i = 0; i < retries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (i === retries - 1) throw error;
         await sleep(Math.pow(2, i) * 1000);
       }
     }
   }
   ```

### Emergency Procedures

1. **Service Down**
   ```bash
   # Quick restart
   pm2 restart channelsense-ton
   
   # Check logs
   pm2 logs channelsense-ton
   
   # Rollback to previous version
   git checkout HEAD~1
   npm install
   pm2 restart channelsense-ton
   ```

2. **Database Issues**
   ```bash
   # Restore from backup
   gunzip -c database_20240115_020000.sql.gz | psql $DATABASE_URL
   
   # Check database integrity
   psql $DATABASE_URL -c "SELECT pg_database_size('channelsense_ton');"
   ```

This deployment guide ensures your ChannelSense TON installation is production-ready, secure, and scalable. Choose the deployment option that best fits your needs and infrastructure requirements.
