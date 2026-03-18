"""
EyeMed Parser Configuration
Stores your product catalog and Anthropic API settings
"""

import os
from typing import Dict, Any

# Anthropic API Configuration
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY', 'your-api-key-here')
HAIKU_MODEL = "claude-haiku-3-5-20241022"
MAX_TOKENS = 4096

# Path to verbatim database
VERBATIM_DB_PATH = "EyeMed_Verbatim_Parser_Database.xlsx"

# Your Product Catalog
# Map your products to EyeMed benefit categories
PRODUCT_CATALOG: Dict[str, Dict[str, Any]] = {
    
    # PROGRESSIVE LENSES
    "Varilux Comfort Max": {
        "retail_price": 393,
        "benefit_category": "progressive_tier_4",
        "product_type": "lens"
    },
    "Varilux Physio W3+": {
        "retail_price": 393,
        "benefit_category": "progressive_tier_4",
        "product_type": "lens"
    },
    "Varilux X Series": {
        "retail_price": 440,
        "benefit_category": "progressive_tier_4",
        "product_type": "lens"
    },
    "Varilux Liberty": {
        "retail_price": 310,
        "benefit_category": "progressive_tier_3",
        "product_type": "lens"
    },
    "Essilor Ideal": {
        "retail_price": 250,
        "benefit_category": "progressive_tier_2",
        "product_type": "lens"
    },
    "Generic Progressive": {
        "retail_price": 179,
        "benefit_category": "progressive_standard",
        "product_type": "lens"
    },
    
    # SINGLE VISION
    "SV Polycarbonate": {
        "retail_price": 89,
        "benefit_category": "single_vision",
        "product_type": "lens"
    },
    "SV High Index 1.67": {
        "retail_price": 149,
        "benefit_category": "single_vision",
        "product_type": "lens"
    },
    
    # BIFOCAL
    "Flat Top 28": {
        "retail_price": 99,
        "benefit_category": "bifocal",
        "product_type": "lens"
    },
    
    # TRIFOCAL
    "Flat Top 7x28": {
        "retail_price": 119,
        "benefit_category": "trifocal",
        "product_type": "lens"
    },
    
    # AR COATINGS
    "Crizal Sapphire 360": {
        "retail_price": 175,
        "benefit_category": "ar_tier_3",
        "product_type": "coating"
    },
    "Crizal Prevencia": {
        "retail_price": 150,
        "benefit_category": "ar_tier_2",
        "product_type": "coating"
    },
    "Crizal Easy": {
        "retail_price": 125,
        "benefit_category": "ar_tier_1",
        "product_type": "coating"
    },
    "Generic AR": {
        "retail_price": 75,
        "benefit_category": "ar_standard",
        "product_type": "coating"
    },
    
    # PHOTOCHROMIC
    "Transitions Signature": {
        "retail_price": 125,
        "benefit_category": "photochromic",
        "product_type": "option"
    },
    
    # POLYCARBONATE
    "Polycarbonate Lenses": {
        "retail_price": 60,
        "benefit_category": "polycarbonate",
        "product_type": "option"
    },
    
    # FRAMES (example frames with typical retail prices)
    "Designer Frame (Budget)": {
        "retail_price": 150,
        "benefit_category": "frame",
        "product_type": "frame"
    },
    "Designer Frame (Mid)": {
        "retail_price": 250,
        "benefit_category": "frame",
        "product_type": "frame"
    },
    "Designer Frame (Premium)": {
        "retail_price": 350,
        "benefit_category": "frame",
        "product_type": "frame"
    },
    "Luxury Frame": {
        "retail_price": 500,
        "benefit_category": "frame",
        "product_type": "frame"
    },
}

# Benefit category mapping to expected keys in extraction
BENEFIT_CATEGORY_MAPPING = {
    "exam": "exam",
    "retinal_imaging": "retinal_imaging",
    "single_vision": "single_vision",
    "bifocal": "bifocal",
    "trifocal": "trifocal",
    "lenticular": "lenticular",
    "progressive_standard": "progressive_standard",
    "progressive_tier_1": "progressive_tier_1",
    "progressive_tier_2": "progressive_tier_2",
    "progressive_tier_3": "progressive_tier_3",
    "progressive_tier_4": "progressive_tier_4",
    "ar_standard": "ar_standard",
    "ar_tier_1": "ar_tier_1",
    "ar_tier_2": "ar_tier_2",
    "ar_tier_3": "ar_tier_3",
    "photochromic": "photochromic",
    "polycarbonate": "polycarbonate",
    "scratch": "scratch",
    "tint": "tint",
    "uv": "uv",
    "frame": "frame",
    "contact_lens_fit_standard": "contact_lens_fit_standard",
    "contact_lens_fit_premium": "contact_lens_fit_premium",
    "contacts_conventional": "contacts_conventional",
    "contacts_disposable": "contacts_disposable",
}
