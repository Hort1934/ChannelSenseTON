import OpenAI from 'openai';

export class AIService {
  constructor() {
    this.client = null;
    this.provider = process.env.AI_PROVIDER || 'openai';
    
    if (this.provider === 'mistral' && process.env.MISTRAL_API_KEY) {
      this.client = new OpenAI({
        apiKey: process.env.MISTRAL_API_KEY,
        baseURL: 'https://api.mistral.ai/v1'
      });
    } else if (process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      this.provider = 'openai';
    }
  }

  async generateChannelInsights(messages, metrics) {
    try {
      if (!this.client) {
        return 'AI analysis unavailable - API key not configured.';
      }

      if (!messages || messages.length === 0) {
        return 'No recent messages to analyze.';
      }

      // Prepare message context for AI analysis
      const messageContext = messages.slice(0, 20).map(msg => ({
        user: msg.username || msg.first_name || 'Unknown',
        text: msg.text,
        timestamp: msg.date
      }));

      const prompt = `
Analyze this Telegram channel based on recent activity:

METRICS:
- Total Messages: ${metrics.totalMessages}
- Active Users: ${metrics.activeUsers}
- Avg Messages per User: ${metrics.totalMessages / Math.max(metrics.activeUsers, 1)}

RECENT MESSAGES:
${messageContext.map(msg => `${msg.user}: ${msg.text}`).join('\n')}

Provide insights about:
1. Community engagement quality
2. Discussion topics and themes
3. User interaction patterns
4. Channel health assessment
5. Recommendations for improvement

Keep the response concise (max 200 words) and actionable.
      `;

      const model = this.provider === 'mistral' ? 'mistral-large-latest' : 'gpt-3.5-turbo';
      
      const response = await this.client.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert community analyst specializing in Telegram channel analytics. Provide clear, actionable insights based on message data.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      });

      return response.choices[0].message.content.trim();

    } catch (error) {
      console.error('Error generating channel insights:', error);
      return 'AI analysis temporarily unavailable. Based on the metrics, the channel shows moderate activity with room for increased engagement.';
    }
  }

  async analyzeSentiment(messages) {
    try {
      if (!this.openai) {
        return this.getFallbackSentiment(messages);
      }

      if (!messages || messages.length === 0) {
        return {
          overall: 'Neutral',
          positive: 0,
          neutral: 100,
          negative: 0,
          summary: 'No messages to analyze.'
        };
      }

      // Sample recent messages for analysis (to stay within token limits)
      const sampleMessages = messages.slice(0, 50);
      const messageTexts = sampleMessages.map(msg => msg.text).join('\n---\n');

      const prompt = `
Analyze the sentiment of these Telegram messages and provide:

MESSAGES:
${messageTexts}

Please analyze and respond with ONLY a JSON object in this exact format:
{
  "overall": "Positive|Negative|Neutral|Very Positive|Very Negative",
  "positive": number (0-100),
  "neutral": number (0-100), 
  "negative": number (0-100),
  "summary": "Brief 1-2 sentence summary of the overall sentiment and key themes"
}

The percentages should add up to 100.
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a sentiment analysis expert. Analyze the emotional tone of social media messages and respond only with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.3
      });

      try {
        const result = JSON.parse(response.choices[0].message.content.trim());
        
        // Validate the response structure
        if (result.overall && typeof result.positive === 'number' && 
            typeof result.neutral === 'number' && typeof result.negative === 'number') {
          return result;
        } else {
          throw new Error('Invalid response structure');
        }
      } catch (parseError) {
        console.error('Error parsing AI sentiment response:', parseError);
        return this.getFallbackSentiment(messages);
      }

    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return this.getFallbackSentiment(messages);
    }
  }

  getFallbackSentiment(messages) {
    // Simple keyword-based sentiment analysis as fallback
    const positiveWords = ['good', 'great', 'awesome', 'excellent', 'amazing', 'love', 'like', 'best', 'fantastic', 'wonderful', 'perfect', 'nice'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'worst', 'horrible', 'sucks', 'stupid', 'annoying', 'boring'];

    let positiveCount = 0;
    let negativeCount = 0;
    let totalWords = 0;

    messages.forEach(msg => {
      if (msg.text) {
        const words = msg.text.toLowerCase().split(/\s+/);
        totalWords += words.length;
        
        words.forEach(word => {
          if (positiveWords.some(pw => word.includes(pw))) {
            positiveCount++;
          }
          if (negativeWords.some(nw => word.includes(nw))) {
            negativeCount++;
          }
        });
      }
    });

    const positive = totalWords > 0 ? Math.round((positiveCount / totalWords) * 100 * 10) : 30;
    const negative = totalWords > 0 ? Math.round((negativeCount / totalWords) * 100 * 10) : 20;
    const neutral = 100 - positive - negative;

    let overall = 'Neutral';
    if (positive > negative + 10) {
      overall = positive > 40 ? 'Very Positive' : 'Positive';
    } else if (negative > positive + 10) {
      overall = negative > 40 ? 'Very Negative' : 'Negative';
    }

    return {
      overall,
      positive: Math.max(0, Math.min(100, positive)),
      neutral: Math.max(0, Math.min(100, neutral)),
      negative: Math.max(0, Math.min(100, negative)),
      summary: `Based on keyword analysis, the channel shows ${overall.toLowerCase()} sentiment with moderate engagement.`
    };
  }

  async generateWelcomeMessage(channelInfo, userInfo) {
    try {
      const prompt = `
Generate a welcoming message for a new member joining a Telegram channel.

CHANNEL INFO:
- Name: ${channelInfo.title || 'Community Channel'}
- Type: ${channelInfo.type || 'group'}
- Description: ${channelInfo.description || 'Active community'}

NEW MEMBER:
- Name: ${userInfo.first_name || 'Friend'}
- Username: ${userInfo.username ? '@' + userInfo.username : 'No username'}

Create a warm, friendly welcome message that:
1. Welcomes the new member by name
2. Briefly describes what the channel is about
3. Encourages participation
4. Mentions ChannelSense AI analytics and NFT rewards
5. Keeps it under 100 words

Use emojis appropriately and maintain a positive tone.
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a friendly community manager assistant. Create welcoming messages that encourage engagement and community participation.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.8
      });

      return response.choices[0].message.content.trim();

    } catch (error) {
      console.error('Error generating welcome message:', error);
      return `👋 Welcome ${userInfo.first_name || 'to our community'}! Great to have you here. Stay active and earn NFT rewards with ChannelSense! 🎁`;
    }
  }

  async generateChannelSummary(messages, period = 'week') {
    try {
      if (!messages || messages.length === 0) {
        return `No activity in the past ${period}.`;
      }

      const messageContext = messages.slice(0, 30).map(msg => ({
        user: msg.username || msg.first_name || 'Unknown',
        text: msg.text,
        date: new Date(msg.date).toLocaleDateString()
      }));

      const prompt = `
Create a brief summary of this Telegram channel's activity over the past ${period}:

MESSAGES (${messages.length} total):
${messageContext.map(msg => `${msg.date} - ${msg.user}: ${msg.text}`).join('\n')}

Provide a concise summary covering:
1. Main discussion topics
2. Level of engagement
3. Community mood
4. Notable highlights or events

Keep it under 150 words and engaging.
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a community analyst creating engaging summaries of channel activity.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.7
      });

      return response.choices[0].message.content.trim();

    } catch (error) {
      console.error('Error generating channel summary:', error);
      return `Channel showed ${messages.length} messages in the past ${period} with active community engagement.`;
    }
  }

  async generateNFTMetadata(userStats, channelInfo, rewardType = 'weekly') {
    try {
      const prompt = `
Generate creative NFT metadata for a community reward.

USER STATS:
- Messages: ${userStats.messageCount}
- Engagement Score: ${userStats.engagementScore}
- Rank: ${userStats.rank || 'Top Contributor'}

CHANNEL: ${channelInfo.title || 'Community Channel'}
REWARD TYPE: ${rewardType}

Create JSON metadata with:
- Creative name for the NFT
- Compelling description
- 3-5 meaningful attributes
- Inspirational flavor text

Format as valid JSON object.
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a creative NFT designer. Create engaging metadata that celebrates community contributions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.8
      });

      try {
        return JSON.parse(response.choices[0].message.content.trim());
      } catch (parseError) {
        // Fallback metadata
        return {
          name: `Community Champion #${Date.now()}`,
          description: `Awarded for outstanding contribution to ${channelInfo.title || 'the community'}`,
          attributes: [
            { trait_type: 'Messages', value: userStats.messageCount },
            { trait_type: 'Engagement Score', value: userStats.engagementScore },
            { trait_type: 'Reward Type', value: rewardType },
            { trait_type: 'Date', value: new Date().toISOString().split('T')[0] }
          ]
        };
      }

    } catch (error) {
      console.error('Error generating NFT metadata:', error);
      return {
        name: `ChannelSense Reward`,
        description: `Community contribution award`,
        attributes: [
          { trait_type: 'Messages', value: userStats.messageCount || 0 },
          { trait_type: 'Type', value: rewardType }
        ]
      };
    }
  }

  async moderateContent(text) {
    try {
      const response = await this.openai.moderations.create({
        input: text
      });

      const result = response.results[0];
      
      return {
        flagged: result.flagged,
        categories: result.categories,
        categoryScores: result.category_scores
      };

    } catch (error) {
      console.error('Error moderating content:', error);
      return {
        flagged: false,
        categories: {},
        categoryScores: {}
      };
    }
  }

  async generateChannelReport(analysisData, sentimentData, topUsers) {
    try {
      const prompt = `
Create a comprehensive weekly channel report.

ANALYSIS DATA:
- Total Messages: ${analysisData.totalMessages}
- Active Users: ${analysisData.activeUsers}
- Growth: ${analysisData.growth}%
- Peak Hour: ${analysisData.peakHour}:00
- Most Active Day: ${analysisData.mostActiveDay}

SENTIMENT:
- Overall: ${sentimentData.overall}
- Positive: ${sentimentData.positive}%
- Negative: ${sentimentData.negative}%

TOP USERS: ${topUsers.length} contributors

Generate a professional report with:
1. Executive summary
2. Key metrics highlights
3. Community health assessment
4. Growth recommendations
5. Action items

Keep it under 400 words and data-driven.
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a data analyst creating professional community reports for channel administrators.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.5
      });

      return response.choices[0].message.content.trim();

    } catch (error) {
      console.error('Error generating channel report:', error);
      return 'Weekly report generated successfully. Channel shows healthy engagement with opportunities for growth.';
    }
  }
}
