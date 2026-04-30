-- =====================================================
-- MDBoutiquee - Categories & Brands Data
-- =====================================================

-- Insert all categories with their subcategories
INSERT INTO categories (name, subcategories) VALUES
  ('Makeup', ARRAY['Blush', 'Highlighter', 'Lip Liner', 'Lip Oil', 'Lip Plumper', 'Lip Sets', 'Lipstick', 'Mascara', 'Setting Spray & Powder']),
  ('Skincare', ARRAY['Cleanser', 'Moisturizer', 'Serum', 'Sunscreen', 'Toner', 'Exfoliator', 'Face Mask', 'Eye Cream']),
  ('Haircare', ARRAY['Shampoo', 'Conditioner', 'Hair Mask', 'Hair Oil', 'Hair Spray', 'Styling Products']),
  ('Fragrance', ARRAY['Perfume', 'Cologne', 'Body Spray', 'Roll-on']),
  ('Body Care', ARRAY['Body Lotion', 'Body Wash', 'Body Scrub', 'Body Oil', 'Hand Cream']),
  ('Tools & Accessories', ARRAY['Brushes', 'Sponges', 'Tweezers', 'Mirrors', 'Makeup Bags'])
ON CONFLICT DO NOTHING;

-- Insert all brands
INSERT INTO brands (name) VALUES
  ('MAC'),
  ('Maybelline'),
  ('L''Oreal'),
  ('NYX'),
  ('Covergirl'),
  ('Revlon'),
  ('Estee Lauder'),
  ('Clinique'),
  ('Dior'),
  ('Chanel'),
  ('Yves Saint Laurent'),
  ('Guerlain'),
  ('Lancome'),
  ('Bobbi Brown'),
  ('NARS'),
  ('Urban Decay'),
  ('Too Faced'),
  ('Fenty Beauty'),
  ('Huda Beauty'),
  ('Morphe'),
  ('Anastasia Beverly Hills'),
  ('Jeffree Star'),
  ('ColourPop'),
  ('Tarte'),
  ('Smashbox'),
  ('Benefit'),
  ('Clarins'),
  ('Shiseido'),
  ('Kiko Milano'),
  ('Essence'),
  ('Catrice'),
  ('Makeup Revolution'),
  ('The Ordinary'),
  ('The Body Shop'),
  ('Bath & Body Works'),
  ('Victoria''s Secret'),
  ('Dove'),
  ('Nivea'),
  ('Vaseline'),
  ('Neutrogena'),
  ('CeraVe'),
  ('La Roche-Posay'),
  ('Vichy'),
  ('Avene'),
  ('Bioderma')
ON CONFLICT DO NOTHING;
