import { WeeklyRewardsScheduler } from '../scripts/weeklyRewards.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify request is from authorized source (in production, add authentication)
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const scheduler = new WeeklyRewardsScheduler();
    await scheduler.initialize();
    await scheduler.run();
    await scheduler.cleanup();

    res.status(200).json({ 
      success: true, 
      message: 'Weekly rewards processed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Weekly rewards API error:', error);
    res.status(500).json({ 
      error: 'Failed to process weekly rewards',
      message: error.message
    });
  }
}
