import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateUser } from '../middleware/auth.js';
import { getSupabaseClient } from '../config/supabase.js';

const router = express.Router();

router.get('/', authenticateUser, async (req, res) => {
  try {
    const userSupabase = getSupabaseClient(req.token);

    const { data: favorites, error } = await userSupabase
      .from('favorites')
      .select(`
        *,
        product:products(
          *,
          category:categories(*),
          seller:profiles(id, full_name, location, avatar_url),
          images:product_images(*)
        )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ favorites });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

router.post('/',
  authenticateUser,
  [
    body('product_id').isUUID().withMessage('Valid product ID is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { product_id } = req.body;
      const userSupabase = getSupabaseClient(req.token);

      const { data: favorite, error } = await userSupabase
        .from('favorites')
        .insert({
          user_id: req.user.id,
          product_id,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return res.status(400).json({ error: 'Product already in favorites' });
        }
        return res.status(400).json({ error: error.message });
      }

      res.status(201).json({ message: 'Product added to favorites', favorite });
    } catch (error) {
      console.error('Add favorite error:', error);
      res.status(500).json({ error: 'Failed to add favorite' });
    }
  }
);

router.delete('/:product_id', authenticateUser, async (req, res) => {
  try {
    const { product_id } = req.params;
    const userSupabase = getSupabaseClient(req.token);

    const { error } = await userSupabase
      .from('favorites')
      .delete()
      .eq('user_id', req.user.id)
      .eq('product_id', product_id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Product removed from favorites' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

router.get('/check/:product_id', authenticateUser, async (req, res) => {
  try {
    const { product_id } = req.params;
    const userSupabase = getSupabaseClient(req.token);

    const { data: favorite, error } = await userSupabase
      .from('favorites')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('product_id', product_id)
      .maybeSingle();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ isFavorite: !!favorite });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({ error: 'Failed to check favorite status' });
  }
});

export default router;
