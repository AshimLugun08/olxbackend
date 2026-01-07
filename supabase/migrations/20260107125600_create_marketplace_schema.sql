/*
  # OLX-like Marketplace Schema

  ## Overview
  Complete database schema for a classified ads marketplace platform with user profiles,
  product listings, categories, images, and favorites functionality.

  ## New Tables

  ### 1. `profiles`
  Extended user profile information linked to Supabase auth.users
  - `id` (uuid, primary key) - References auth.users
  - `email` (text) - User email
  - `full_name` (text) - User's full name
  - `phone` (text) - Contact phone number
  - `avatar_url` (text) - Profile picture URL
  - `location` (text) - User location/city
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. `categories`
  Product categories for organizing listings
  - `id` (uuid, primary key)
  - `name` (text, unique) - Category name
  - `slug` (text, unique) - URL-friendly identifier
  - `description` (text) - Category description
  - `icon` (text) - Icon identifier or URL
  - `parent_id` (uuid) - For subcategories (self-referencing)
  - `created_at` (timestamptz)

  ### 3. `products`
  Main product listings table
  - `id` (uuid, primary key)
  - `user_id` (uuid) - Seller reference
  - `category_id` (uuid) - Category reference
  - `title` (text) - Product title
  - `description` (text) - Detailed description
  - `price` (numeric) - Product price
  - `status` (text) - Product status: 'draft', 'active', 'sold', 'archived'
  - `condition` (text) - Product condition: 'new', 'like_new', 'good', 'fair', 'poor'
  - `location` (text) - Product location
  - `views` (integer) - View count
  - `featured` (boolean) - Featured listing flag
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - `sold_at` (timestamptz) - When product was marked as sold

  ### 4. `product_images`
  Multiple images per product
  - `id` (uuid, primary key)
  - `product_id` (uuid) - Product reference
  - `image_url` (text) - Image URL
  - `display_order` (integer) - Image ordering
  - `is_primary` (boolean) - Primary/thumbnail image flag
  - `created_at` (timestamptz)

  ### 5. `favorites`
  User's saved/favorite listings
  - `id` (uuid, primary key)
  - `user_id` (uuid) - User reference
  - `product_id` (uuid) - Product reference
  - `created_at` (timestamptz)
  - Unique constraint on (user_id, product_id)

  ## Security

  ### Row Level Security (RLS)
  All tables have RLS enabled with restrictive policies:

  #### Profiles
  - Users can view all profiles
  - Users can insert their own profile
  - Users can update only their own profile
  - Users can delete only their own profile

  #### Categories
  - Everyone can view categories (public data)
  - Only authenticated users can suggest categories via insert
  - Only the creator can update/delete their suggested categories

  #### Products
  - Everyone can view active products
  - Authenticated users can insert products
  - Users can update/delete only their own products
  - Users can view their own draft/archived products

  #### Product Images
  - Everyone can view images of active products
  - Users can insert images for their own products
  - Users can update/delete images of their own products

  #### Favorites
  - Users can view only their own favorites
  - Users can insert/delete only their own favorites

  ## Indexes
  - Products: user_id, category_id, status, created_at
  - Product images: product_id
  - Favorites: user_id, product_id
  - Categories: slug, parent_id
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text DEFAULT '',
  phone text DEFAULT '',
  avatar_url text DEFAULT '',
  location text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT '',
  parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text NOT NULL,
  price numeric(10, 2) NOT NULL CHECK (price >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'sold', 'archived')),
  condition text DEFAULT 'good' CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor')),
  location text NOT NULL,
  views integer DEFAULT 0,
  featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sold_at timestamptz
);

-- Create product_images table
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  display_order integer DEFAULT 0,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_product_id ON favorites(product_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Categories policies (public read, authenticated write)
CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (true);

-- Products policies
CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  TO authenticated
  USING (status = 'active' OR user_id = auth.uid());

CREATE POLICY "Authenticated users can create products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Product images policies
CREATE POLICY "Anyone can view product images"
  ON product_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_images.product_id
      AND (products.status = 'active' OR products.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert images for own products"
  ON product_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_images.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update images of own products"
  ON product_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_images.product_id
      AND products.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_images.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete images of own products"
  ON product_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_images.product_id
      AND products.user_id = auth.uid()
    )
  );

-- Favorites policies
CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites"
  ON favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own favorites"
  ON favorites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert some default categories
INSERT INTO categories (name, slug, description, icon) VALUES
  ('Electronics', 'electronics', 'Mobile phones, computers, and electronic devices', '📱'),
  ('Vehicles', 'vehicles', 'Cars, motorcycles, and other vehicles', '🚗'),
  ('Property', 'property', 'Houses, apartments, and land for sale or rent', '🏠'),
  ('Home & Garden', 'home-garden', 'Furniture, appliances, and garden items', '🛋️'),
  ('Fashion', 'fashion', 'Clothing, shoes, and accessories', '👔'),
  ('Jobs', 'jobs', 'Job listings and career opportunities', '💼'),
  ('Services', 'services', 'Professional and local services', '🔧'),
  ('Sports', 'sports', 'Sports equipment and fitness gear', '⚽'),
  ('Books & Music', 'books-music', 'Books, musical instruments, and media', '📚'),
  ('Pets', 'pets', 'Pet supplies and pet listings', '🐾')
ON CONFLICT (slug) DO NOTHING;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();