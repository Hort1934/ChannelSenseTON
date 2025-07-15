export class AnalyticsService {
  constructor(database, aiService) {
    this.database = database;
    this.aiService = aiService;
  }

  async analyzeChannel(chatId, period = 'week') {
    try {
      const periodHours = this.getPeriodHours(period);
      const startDate = new Date(Date.now() - periodHours * 60 * 60 * 1000);

      // Get basic metrics
      const metrics = await this.database.getChannelMetrics(chatId, startDate);
      
      // Get top users
      const topUsers = await this.getTopUsers(chatId, period, 10);
      
      // Calculate growth compared to previous period
      const previousPeriodStart = new Date(startDate.getTime() - periodHours * 60 * 60 * 1000);
      const previousMetrics = await this.database.getChannelMetrics(chatId, previousPeriodStart, startDate);
      
      const growth = previousMetrics.totalMessages > 0 
        ? ((metrics.totalMessages - previousMetrics.totalMessages) / previousMetrics.totalMessages * 100).toFixed(1)
        : 0;

      // Get hourly activity distribution
      const hourlyActivity = await this.database.getHourlyActivity(chatId, startDate);
      const peakHour = this.findPeakHour(hourlyActivity);

      // Get daily activity
      const dailyActivity = await this.database.getDailyActivity(chatId, startDate);
      const mostActiveDay = this.findMostActiveDay(dailyActivity);

      // Get recent messages for AI analysis
      const recentMessages = await this.database.getRecentMessages(chatId, 50);
      const aiInsights = await this.aiService.generateChannelInsights(recentMessages, metrics);

      return {
        totalMessages: metrics.totalMessages,
        activeUsers: metrics.activeUsers,
        avgMessagesPerUser: metrics.totalMessages > 0 ? (metrics.totalMessages / metrics.activeUsers).toFixed(1) : 0,
        topUsers: topUsers.slice(0, 5),
        growth: parseFloat(growth),
        peakHour,
        mostActiveDay,
        aiInsights,
        period,
        dateRange: {
          start: startDate.toISOString(),
          end: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Error analyzing channel:', error);
      throw error;
    }
  }

  async getTopUsers(chatId, period = 'week', limit = 10) {
    try {
      const periodHours = this.getPeriodHours(period);
      const startDate = new Date(Date.now() - periodHours * 60 * 60 * 1000);

      const users = await this.database.getUserActivity(chatId, startDate, limit);
      
      // Calculate engagement scores for each user
      const enrichedUsers = await Promise.all(
        users.map(async (user) => {
          const engagementScore = await this.calculateEngagementScore(user, chatId, startDate);
          const walletInfo = await this.database.getUserWallet(user.userId);
          
          return {
            ...user,
            engagementScore,
            tonWallet: walletInfo ? walletInfo.address : null
          };
        })
      );

      // Sort by engagement score
      enrichedUsers.sort((a, b) => b.engagementScore - a.engagementScore);

      return enrichedUsers;

    } catch (error) {
      console.error('Error getting top users:', error);
      throw error;
    }
  }

  async calculateEngagementScore(user, chatId, startDate) {
    try {
      // Base score from message count
      let score = user.messageCount * 10;

      // Get user's message details for scoring
      const userMessages = await this.database.getUserMessages(user.userId, chatId, startDate);
      
      // Add points for various engagement types
      userMessages.forEach(message => {
        // Points for replies (shows interaction)
        if (message.replyToMessageId) {
          score += 5;
        }

        // Points for longer messages (more thoughtful content)
        if (message.text && message.text.length > 100) {
          score += 3;
        }

        // Points for forwarded content (content sharing)
        if (message.forwardFromChatId) {
          score += 2;
        }
      });

      // Get reactions/replies to user's messages (influence factor)
      const interactions = await this.database.getMessageInteractions(user.userId, chatId, startDate);
      score += interactions.replies * 8; // Higher weight for generating discussion
      score += interactions.reactions * 2;

      // Time consistency bonus (active across different times)
      const activityHours = await this.database.getUserActivityHours(user.userId, chatId, startDate);
      if (activityHours.length > 5) { // Active in more than 5 different hours
        score += 15;
      }

      return Math.round(score);

    } catch (error) {
      console.error('Error calculating engagement score:', error);
      return user.messageCount * 10; // Fallback to simple scoring
    }
  }

  async analyzeSentiment(chatId, period = 'week') {
    try {
      const periodHours = this.getPeriodHours(period);
      const startDate = new Date(Date.now() - periodHours * 60 * 60 * 1000);

      // Get recent messages for sentiment analysis
      const messages = await this.database.getMessagesForSentiment(chatId, startDate, 200);
      
      if (messages.length === 0) {
        return {
          overall: 'Neutral',
          positive: 0,
          neutral: 100,
          negative: 0,
          trend: 'Stable',
          trendingTopics: [],
          summary: 'No messages to analyze in this period.'
        };
      }

      // Use AI service for sentiment analysis
      const sentimentAnalysis = await this.aiService.analyzeSentiment(messages);
      
      // Calculate trending topics
      const trendingTopics = await this.extractTrendingTopics(messages);
      
      // Calculate sentiment trend (compare with previous period)
      const previousPeriodStart = new Date(startDate.getTime() - periodHours * 60 * 60 * 1000);
      const previousMessages = await this.database.getMessagesForSentiment(chatId, previousPeriodStart, startDate, 100);
      
      let trend = 'Stable';
      if (previousMessages.length > 0) {
        const previousSentiment = await this.aiService.analyzeSentiment(previousMessages);
        if (sentimentAnalysis.positive > previousSentiment.positive + 10) {
          trend = 'Improving';
        } else if (sentimentAnalysis.positive < previousSentiment.positive - 10) {
          trend = 'Declining';
        }
      }

      return {
        overall: sentimentAnalysis.overall,
        positive: sentimentAnalysis.positive,
        neutral: sentimentAnalysis.neutral,
        negative: sentimentAnalysis.negative,
        trend,
        trendingTopics,
        summary: sentimentAnalysis.summary
      };

    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      throw error;
    }
  }

  async extractTrendingTopics(messages, limit = 5) {
    try {
      // Simple keyword extraction - in production, use more sophisticated NLP
      const wordFreq = {};
      const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);

      messages.forEach(message => {
        if (message.text) {
          const words = message.text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 3 && !stopWords.has(word));

          words.forEach(word => {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
          });
        }
      });

      // Get top words
      const sortedWords = Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, limit)
        .map(([word]) => word);

      return sortedWords;

    } catch (error) {
      console.error('Error extracting trending topics:', error);
      return [];
    }
  }

  async getChannelGrowthStats(chatId, days = 30) {
    try {
      const stats = [];
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const dayStats = await this.database.getChannelMetrics(chatId, date, nextDate);
        
        stats.push({
          date: date.toISOString().split('T')[0],
          messages: dayStats.totalMessages,
          activeUsers: dayStats.activeUsers
        });
      }

      return stats;

    } catch (error) {
      console.error('Error getting growth stats:', error);
      throw error;
    }
  }

  async generateWeeklyReport(chatId) {
    try {
      const analysis = await this.analyzeChannel(chatId, 'week');
      const sentiment = await this.analyzeSentiment(chatId, 'week');
      const topUsers = await this.getTopUsers(chatId, 'week', 10);
      const growthStats = await this.getChannelGrowthStats(chatId, 7);

      // Identify users eligible for NFT rewards
      const eligibleUsers = topUsers
        .filter(user => user.messageCount >= parseInt(process.env.MIN_MESSAGES_FOR_REWARD || '10') && user.tonWallet)
        .slice(0, parseInt(process.env.TOP_USERS_COUNT || '3'));

      const report = {
        period: 'week',
        generatedAt: new Date().toISOString(),
        chatId,
        summary: {
          totalMessages: analysis.totalMessages,
          activeUsers: analysis.activeUsers,
          growth: analysis.growth,
          sentiment: sentiment.overall
        },
        topUsers,
        eligibleForRewards: eligibleUsers,
        sentiment,
        insights: analysis.aiInsights,
        growthChart: growthStats,
        recommendations: await this.generateRecommendations(analysis, sentiment, topUsers)
      };

      // Save report to database
      await this.database.saveWeeklyReport(chatId, report);

      return report;

    } catch (error) {
      console.error('Error generating weekly report:', error);
      throw error;
    }
  }

  async generateRecommendations(analysis, sentiment, topUsers) {
    try {
      const recommendations = [];

      // Growth recommendations
      if (analysis.growth < 0) {
        recommendations.push({
          type: 'growth',
          priority: 'high',
          title: 'Increase Engagement',
          description: 'Channel activity is declining. Consider posting more engaging content or organizing events.',
          action: 'Host AMAs, contests, or discussion topics'
        });
      }

      // Sentiment recommendations
      if (sentiment.negative > 30) {
        recommendations.push({
          type: 'sentiment',
          priority: 'medium',
          title: 'Address Negative Sentiment',
          description: 'High negative sentiment detected. Review recent discussions and address concerns.',
          action: 'Moderate discussions and respond to community feedback'
        });
      }

      // User engagement recommendations
      const connectedWallets = topUsers.filter(user => user.tonWallet).length;
      const totalActive = topUsers.length;
      
      if (connectedWallets / totalActive < 0.5) {
        recommendations.push({
          type: 'wallet',
          priority: 'medium',
          title: 'Increase Wallet Connections',
          description: `Only ${connectedWallets}/${totalActive} top users have connected wallets.`,
          action: 'Promote wallet connection benefits and NFT rewards'
        });
      }

      // Activity timing recommendations
      if (analysis.peakHour) {
        recommendations.push({
          type: 'timing',
          priority: 'low',
          title: 'Optimize Posting Time',
          description: `Peak activity is at ${analysis.peakHour}:00. Schedule important announcements around this time.`,
          action: 'Schedule posts during peak hours for maximum engagement'
        });
      }

      return recommendations;

    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  }

  getPeriodHours(period) {
    switch (period) {
      case 'day': return 24;
      case 'week': return 24 * 7;
      case 'month': return 24 * 30;
      default: return 24 * 7;
    }
  }

  findPeakHour(hourlyActivity) {
    if (!hourlyActivity.length) return null;
    
    const maxActivity = Math.max(...hourlyActivity.map(h => h.count));
    const peakHourData = hourlyActivity.find(h => h.count === maxActivity);
    
    return peakHourData ? peakHourData.hour : null;
  }

  findMostActiveDay(dailyActivity) {
    if (!dailyActivity.length) return null;
    
    const maxActivity = Math.max(...dailyActivity.map(d => d.count));
    const mostActiveDayData = dailyActivity.find(d => d.count === maxActivity);
    
    return mostActiveDayData ? mostActiveDayData.dayName : null;
  }

  async scheduleWeeklyRewards() {
    try {
      // Get all active channels
      const activeChannels = await this.database.getActiveChannels();
      
      for (const channel of activeChannels) {
        const report = await this.generateWeeklyReport(channel.chatId);
        
        if (report.eligibleForRewards.length > 0) {
          console.log(`Processing rewards for channel ${channel.chatId}: ${report.eligibleForRewards.length} users eligible`);
          
          // This would be called by the main server to actually mint rewards
          // The TelegramBot service will handle the actual minting process
        }
      }

    } catch (error) {
      console.error('Error scheduling weekly rewards:', error);
    }
  }
}
