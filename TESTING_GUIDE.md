# ChannelSense TON - Testing Guide

## 🧪 Testing Wallet Connection

### English Interface
The bot now uses English for all messages and interfaces.

### Testing Steps:

1. **Start the bot**
   - Send `/start` in private chat
   - You should see the welcome message in English

2. **Test wallet connection**
   - Send `/connect` in private chat
   - Click the "🔗 Connect Wallet" button
   - This should open Tonkeeper Web
   - Complete the connection in Tonkeeper
   - Check if the bot updates the message with success

3. **Check connection status**
   - Click "🔄 Check Status" button
   - Bot should confirm if wallet is connected

4. **Test in groups**
   - Add bot to a group as admin
   - Send `/start` in the group
   - Use commands like `/analyze`, `/top`, `/sentiment`

### Expected Behavior:

✅ **What should work:**
- All messages in English
- Connect link generation
- Status checking
- Group commands

⚠️ **Current Issues:**
- The actual wallet connection callback might need additional setup
- TON Connect requires specific wallet app configuration

### Debugging:

Check terminal logs for:
- "Generated connect link for user X"
- "Wallet connected with address:"
- "Connection status result:"

### Log Monitoring:

```bash
# Watch for wallet connection events
tail -f terminal_output | grep -E "(connect|wallet|Connected)"
```

## 🔧 Configuration

Make sure these environment variables are set:
- `TELEGRAM_BOT_TOKEN`: Your bot token
- `TON_CONNECT_MANIFEST_URL`: http://localhost:3001/tonconnect-manifest.json

## 📱 Wallet Apps

Supported wallets:
- Tonkeeper
- TON Wallet
- MyTonWallet

Test URL format: `ton://connect/...`
