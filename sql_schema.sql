-- SQL Schema for the Pricing and Benefits Engine Database

-- Database: vision_automation
-- User: postgres
-- Password: mysecretpassword (or whatever you set)
-- Host: localhost
-- Port: 5432

-- Table for VSP Progressive Formulary
CREATE TABLE vsp_progressive_formulary (
    product_id VARCHAR(100) PRIMARY KEY,
    brand VARCHAR(50) NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    tier VARCHAR(10) NOT NULL, -- 'K', 'J', 'F', 'O', 'N'
    tier_name VARCHAR(50) NOT NULL, -- 'Standard', 'Premium', 'Custom'
    is_customizable BOOLEAN DEFAULT FALSE,
    base_code VARCHAR(2) NOT NULL, -- 'KA', 'JA', 'FA', 'OA', 'NA'
    design_type VARCHAR(50)
);

-- Table for VSP AR Coating Formulary
CREATE TABLE vsp_ar_coating_formulary (
    product_id VARCHAR(100) PRIMARY KEY,
    brand VARCHAR(50) NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    vsp_tier VARCHAR(10) NOT NULL, -- 'A', 'C', 'D'
    tier_name VARCHAR(50) NOT NULL,
    code VARCHAR(10) NOT NULL, -- 'QM', 'QT', 'QV'
    has_blue_light BOOLEAN DEFAULT FALSE,
    warranty_years INTEGER
);

-- Table for Spectera Progressive Formulary
CREATE TABLE spectera_progressive_formulary (
    product_id VARCHAR(100) PRIMARY KEY,
    brand VARCHAR(50) NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    tier VARCHAR(10) NOT NULL, -- 'I', 'II', 'III', 'IV', 'V'
    is_digital BOOLEAN DEFAULT FALSE,
    is_ray_ban BOOLEAN DEFAULT FALSE,
    is_short BOOLEAN DEFAULT FALSE,
    design_type VARCHAR(50)
);

-- Table for Spectera AR Coating Formulary
CREATE TABLE spectera_ar_coating_formulary (
    product_id VARCHAR(100) PRIMARY KEY,
    brand VARCHAR(50) NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    tier VARCHAR(10) NOT NULL, -- 'I', 'II', 'III', 'IV'
    has_blue_light BOOLEAN DEFAULT FALSE,
    has_mirror_option BOOLEAN DEFAULT FALSE,
    has_uv_backside BOOLEAN DEFAULT FALSE,
    is_ray_ban BOOLEAN DEFAULT FALSE
);

-- Table for Eyemed Progressive Formulary
CREATE TABLE eyemed_progressive_formulary (
    product_id VARCHAR(100) PRIMARY KEY,
    brand VARCHAR(50) NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    tier VARCHAR(20) NOT NULL, -- 'standard', 'tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5'
    is_digital BOOLEAN DEFAULT FALSE,
    is_short BOOLEAN DEFAULT FALSE,
    is_wrap BOOLEAN DEFAULT FALSE,
    is_occupational BOOLEAN DEFAULT FALSE,
    design_type VARCHAR(50)
);

-- Table for Eyemed AR Coating Formulary
CREATE TABLE eyemed_ar_coating_formulary (
    product_id VARCHAR(100) PRIMARY KEY,
    brand VARCHAR(50) NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    tier VARCHAR(20) NOT NULL, -- 'standard', 'tier_1', 'tier_2', 'tier_3'
    has_blue_light BOOLEAN DEFAULT FALSE,
    is_backside_only BOOLEAN DEFAULT FALSE,
    is_sun_specific BOOLEAN DEFAULT FALSE
);

-- Table for Practice-Specific Overrides and Bundles
-- Using JSONB to store flexible U&C prices and bundles for each provider.
CREATE TABLE practice_data (
    practice_id VARCHAR(50) PRIMARY KEY,
    practice_name VARCHAR(255) NOT NULL,
    vsp_uc_prices JSONB DEFAULT '{}',
    spectera_uc_prices JSONB DEFAULT '{}',
    eyemed_uc_prices JSONB DEFAULT '{}',
    vsp_bundles JSONB DEFAULT '[]',
    spectera_bundles JSONB DEFAULT '[]',
    eyemed_bundles JSONB DEFAULT '[]'
);
