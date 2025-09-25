const express = require('express');
const supabase = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/activity', authenticateToken, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { data: activities, error } = await supabase
      .from('user_activity')
      .select(`
        id, user_id, action, category, description, timestamp, user_agent, severity, details,
        users (username, role)
      `)
      .order('timestamp', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch user activity' });
    }

    res.json(activities);
  } catch (error) {
    console.error('Activity fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, role, created_at')
      .eq('id', req.user.id)
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }

    res.json(user);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;