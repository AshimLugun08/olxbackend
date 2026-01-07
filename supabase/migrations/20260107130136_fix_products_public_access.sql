/*
  # Fix Products Public Access

  ## Changes
  - Update RLS policies for products and product_images tables
  - Allow public (unauthenticated) read access to active products
  - Keep write operations restricted to authenticated users
*/

DROP POLICY IF EXISTS "Anyone can view active products" ON products;
DROP POLICY IF EXISTS "Anyone can view product images" ON product_images;

CREATE POLICY "Public can view active products"
  ON products FOR SELECT
  USING (status = 'active' OR user_id = auth.uid());

CREATE POLICY "Public can view product images"
  ON product_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_images.product_id
      AND (products.status = 'active' OR products.user_id = auth.uid())
    )
  );
