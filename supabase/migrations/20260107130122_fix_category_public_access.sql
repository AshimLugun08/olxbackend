/*
  # Fix Category Public Access

  ## Changes
  - Update RLS policies for categories table to allow public read access
  - Categories should be visible to everyone (authenticated and anonymous users)
  - Keep write operations restricted to authenticated users
*/

DROP POLICY IF EXISTS "Anyone can view categories" ON categories;

CREATE POLICY "Public can view categories"
  ON categories FOR SELECT
  USING (true);
