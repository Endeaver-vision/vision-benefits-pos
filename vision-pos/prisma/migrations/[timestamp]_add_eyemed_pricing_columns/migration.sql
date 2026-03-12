-- Add EyeMed Pricing Engine columns to lens_products table
-- These columns support the new static rules:
-- - cash_only: Products that don't accept insurance (full retail)
-- - backside_uv_surcharge: Premium UV coatings that have a $15 surcharge

ALTER TABLE lens_products
ADD COLUMN cash_only BOOLEAN DEFAULT FALSE;

ALTER TABLE lens_products
ADD COLUMN backside_uv_surcharge BOOLEAN DEFAULT FALSE;

-- Create indexes for efficient filtering
CREATE INDEX idx_lens_products_cash_only ON lens_products(cash_only) WHERE cash_only = TRUE;
CREATE INDEX idx_lens_products_backside_uv_surcharge ON lens_products(backside_uv_surcharge) WHERE backside_uv_surcharge = TRUE;

-- Add comments for documentation
COMMENT ON COLUMN lens_products.cash_only IS 'When true, this product does not accept insurance - patient pays full retail price';
COMMENT ON COLUMN lens_products.backside_uv_surcharge IS 'When true, this premium UV coating has a $15 surcharge applied by the EyeMed pricing engine';
