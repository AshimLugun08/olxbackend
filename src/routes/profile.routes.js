import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateUser } from '../middleware/auth.js';
import { supabase, getSupabaseClient } from '../config/supabase.js';

const router = express.Router();

router.get('/', authenticateUser, async (req, res) => {
  try {
    const userSupabase = getSupabaseClient(req.token);

    const { data: profile, error } = await userSupabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ profile });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/',
  authenticateUser,
  [
    body('full_name').optional().trim().notEmpty(),
    body('phone').optional().trim(),
    body('location').optional().trim().notEmpty(),
    body('avatar_url').optional().isURL(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const updates = req.body;
      const userSupabase = getSupabaseClient(req.token);

      const { data: profile, error } = await userSupabase
        .from('profiles')
        .update(updates)
        .eq('id', req.user.id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({ message: 'Profile updated successfully', profile });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

router.get('/listings', authenticateUser, async (req, res) => {
  try {
    const { status } = req.query;
    const userSupabase = getSupabaseClient(req.token);

    let query = userSupabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        images:product_images(*)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: products, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ products });
  } catch (error) {
    console.error('Get user listings error:', error);
    res.status(500).json({ error: 'Failed to fetch user listings' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, full_name, location, avatar_url, created_at')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ profile });
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;
