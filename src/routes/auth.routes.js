import express from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../config/supabase.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

router.post('/signup',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('full_name').notEmpty().withMessage('Full name is required'),
    body('phone').optional(),
    body('location').notEmpty().withMessage('Location is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, full_name, phone, location } = req.body;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        return res.status(400).json({ error: authError.message });
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email,
          full_name,
          phone: phone || '',
          location,
        });

      if (profileError) {
        return res.status(400).json({ error: profileError.message });
      }

      res.status(201).json({
        message: 'User registered successfully',
        user: authData.user,
        session: authData.session,
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

router.post('/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // 1️⃣ Login using Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return res.status(401).json({ error: error.message });
      }

      // 2️⃣ Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, phone, location')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        return res.status(400).json({ error: profileError.message });
      }

      // 3️⃣ MERGED single user object
      res.status(200).json({
        message: 'Login successful',
        user: {
          id: data.user.id,
          email: data.user.email,
          full_name: profile.full_name,
          phone: profile.phone,
          location: profile.location,
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_in: data.session.expires_in,
          expires_at: data.session.expires_at,
        },
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);



router.post('/logout', authenticateUser, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

router.get('/me', authenticateUser, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ user: req.user, profile });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user data' });
  }
});

export default router;
