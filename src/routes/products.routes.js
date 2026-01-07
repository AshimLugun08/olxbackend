import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticateUser, optionalAuth } from '../middleware/auth.js';
import { supabase, getSupabaseClient } from '../config/supabase.js';

const router = express.Router();

router.post('/',
  authenticateUser,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('category_id').isUUID().withMessage('Valid category ID is required'),
    body('condition').isIn(['new', 'like_new', 'good', 'fair', 'poor']).withMessage('Invalid condition'),
    body('location').trim().notEmpty().withMessage('Location is required'),
    body('images').optional().isArray().withMessage('Images must be an array'),
    body('status').optional().isIn(['draft', 'active']).withMessage('Invalid status'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, description, price, category_id, condition, location, images, status } = req.body;

      const userSupabase = getSupabaseClient(req.token);

      const { data: product, error: productError } = await userSupabase
        .from('products')
        .insert({
          user_id: req.user.id,
          title,
          description,
          price,
          category_id,
          condition,
          location,
          status: status || 'draft',
        })
        .select()
        .single();

      if (productError) {
        return res.status(400).json({ error: productError.message });
      }

      if (images && images.length > 0) {
        const imageRecords = images.map((url, index) => ({
          product_id: product.id,
          image_url: url,
          display_order: index,
          is_primary: index === 0,
        }));

        const { error: imagesError } = await userSupabase
          .from('product_images')
          .insert(imageRecords);

        if (imagesError) {
          console.error('Error adding images:', imagesError);
        }
      }

      const { data: fullProduct } = await userSupabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          seller:profiles(*),
          images:product_images(*)
        `)
        .eq('id', product.id)
        .single();

      res.status(201).json({ message: 'Product created successfully', product: fullProduct });
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ error: 'Failed to create product' });
    }
  }
);

router.get('/',
  optionalAuth,
  [
    query('category_id').optional().isUUID(),
    query('status').optional().isIn(['active', 'sold', 'draft', 'archived']),
    query('min_price').optional().isFloat({ min: 0 }),
    query('max_price').optional().isFloat({ min: 0 }),
    query('condition').optional().isIn(['new', 'like_new', 'good', 'fair', 'poor']),
    query('search').optional().isString(),
    query('user_id').optional().isUUID(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        category_id,
        status,
        min_price,
        max_price,
        condition,
        search,
        user_id,
        limit = 20,
        offset = 0,
      } = req.query;

      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          seller:profiles(id, full_name, location, avatar_url),
          images:product_images(*)
        `, { count: 'exact' });

      if (!req.user || !user_id || user_id !== req.user.id) {
        query = query.eq('status', 'active');
      } else if (user_id && req.user && user_id === req.user.id) {
        query = query.eq('user_id', user_id);
        if (status) {
          query = query.eq('status', status);
        }
      }

      if (category_id) {
        query = query.eq('category_id', category_id);
      }

      if (min_price) {
        query = query.gte('price', min_price);
      }

      if (max_price) {
        query = query.lte('price', max_price);
      }

      if (condition) {
        query = query.eq('condition', condition);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: products, error, count } = await query;

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({
        products,
        pagination: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: count > parseInt(offset) + parseInt(limit),
        },
      });
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  }
);

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        seller:profiles(id, full_name, location, avatar_url, phone, email),
        images:product_images(*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.status !== 'active' && (!req.user || product.user_id !== req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await supabase
      .from('products')
      .update({ views: product.views + 1 })
      .eq('id', id);

    res.json({ product: { ...product, views: product.views + 1 } });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

router.put('/:id',
  authenticateUser,
  [
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim().notEmpty(),
    body('price').optional().isFloat({ min: 0 }),
    body('category_id').optional().isUUID(),
    body('condition').optional().isIn(['new', 'like_new', 'good', 'fair', 'poor']),
    body('location').optional().trim().notEmpty(),
    body('status').optional().isIn(['draft', 'active', 'sold', 'archived']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const updates = req.body;

      const userSupabase = getSupabaseClient(req.token);

      if (updates.status === 'sold' && !updates.sold_at) {
        updates.sold_at = new Date().toISOString();
      }

      const { data: product, error } = await userSupabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .eq('user_id', req.user.id)
        .select(`
          *,
          category:categories(*),
          seller:profiles(*),
          images:product_images(*)
        `)
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({ message: 'Product updated successfully', product });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ error: 'Failed to update product' });
    }
  }
);

router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    const userSupabase = getSupabaseClient(req.token);

    const { error } = await userSupabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

router.patch('/:id/status',
  authenticateUser,
  [
    body('status').isIn(['draft', 'active', 'sold', 'archived']).withMessage('Invalid status'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { status } = req.body;

      const userSupabase = getSupabaseClient(req.token);

      const updates = { status };
      if (status === 'sold') {
        updates.sold_at = new Date().toISOString();
      }

      const { data: product, error } = await userSupabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .eq('user_id', req.user.id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({ message: 'Product status updated successfully', product });
    } catch (error) {
      console.error('Update product status error:', error);
      res.status(500).json({ error: 'Failed to update product status' });
    }
  }
);

export default router;
