// Script to set bot profile photo
import fs from 'fs';
import path from 'path';
import TelegramBot from 'node-telegram-bot-api';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN not set');
  process.exit(1);
}

const bot = new TelegramBot(token);

async function setBotProfilePhoto() {
  try {
    // Path to the profile image
    const imagePath = path.join(__dirname, '..', 'public', 'bot-profile.svg');
    
    if (!fs.existsSync(imagePath)) {
      console.error('Profile image not found:', imagePath);
      return;
    }

    // Note: Telegram requires PNG/JPG, not SVG
    // You'll need to convert SVG to PNG first
    console.log('Profile image path:', imagePath);
    console.log('To set profile photo, convert SVG to PNG and use:');
    console.log('await bot.setMyPhoto({ source: "path/to/profile.png" });');
    
  } catch (error) {
    console.error('Error setting profile photo:', error);
  }
}

setBotProfilePhoto();
