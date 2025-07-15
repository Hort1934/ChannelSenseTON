#!/usr/bin/env node

/**
 * Test script to validate the ChannelSense TON MCP server setup
 */

import { DatabaseService } from './src/services/database.js';
import { AIService } from './src/services/ai.js';
import { AnalyticsService } from './src/services/analytics.js';

async function runTests() {
  console.log('🧪 Running ChannelSense TON Tests...\n');

  try {
    // Test 1: Database initialization
    console.log('📊 Testing Database Service...');
    const database = new DatabaseService();
    await database.initialize();
    console.log('✅ Database initialized successfully\n');

    // Test 2: AI Service (requires API key)
    console.log('🤖 Testing AI Service...');
    if (process.env.OPENAI_API_KEY) {
      const aiService = new AIService();
      const testInsights = await aiService.generateChannelInsights([], { totalMessages: 0, activeUsers: 0 });
      console.log('✅ AI Service working:', testInsights.substring(0, 50) + '...\n');
    } else {
      console.log('⚠️  AI Service test skipped (no OpenAI API key)\n');
    }

    // Test 3: Analytics Service
    console.log('📈 Testing Analytics Service...');
    const analytics = new AnalyticsService(database, new AIService());
    console.log('✅ Analytics Service initialized\n');

    // Test 4: Sample data insertion
    console.log('💾 Testing sample data insertion...');
    await database.saveUser('123456789', {
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User'
    });

    await database.saveMessage({
      messageId: 1,
      chatId: '-1001234567890',
      userId: '123456789',
      text: 'Hello, this is a test message!',
      date: new Date()
    });

    console.log('✅ Sample data inserted successfully\n');

    // Test 5: Analytics calculation
    console.log('🔍 Testing analytics calculation...');
    const metrics = await database.getChannelMetrics('-1001234567890', new Date(Date.now() - 24 * 60 * 60 * 1000));
    console.log('✅ Analytics calculation completed:', metrics, '\n');

    // Cleanup
    await database.close();
    console.log('🎉 All tests passed successfully!\n');

    console.log('📋 Next Steps:');
    console.log('1. Set up your environment variables in .env file');
    console.log('2. Get a Telegram Bot Token from @BotFather');
    console.log('3. Get an OpenAI API Key');
    console.log('4. Run: npm run dev');
    console.log('5. Test your bot in Telegram\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

runTests();
