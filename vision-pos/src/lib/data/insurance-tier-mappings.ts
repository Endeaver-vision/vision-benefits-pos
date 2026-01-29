/**
 * Insurance Tier Mappings
 *
 * This is the SINGLE SOURCE OF TRUTH for mapping:
 * 1. Products → Tier codes (per carrier)
 * 2. Tier codes → Copay field names in authorization JSON
 *
 * When GPT extracts copays from an insurance auth, it stores them in a JSON blob
 * with field names like "progressiveTier3", "arTier2", "polycarbonate", etc.
 *
 * This file tells the pricing calculator:
 * - Which tier code a product uses for each carrier
 * - Which copay field in the authorization JSON corresponds to that tier
 */

// =============================================================================
// PRODUCT TIER MAPPINGS
// =============================================================================
// Maps each product to its tier code for each carrier
// null = not covered by insurance (cash only)
// "COVERED" = covered at $0 copay (basic lens)
// "standard" = standard lens, uses materials copay

export interface ProductTierMap {
  vsp: string | null;
  eyemed: string | null;
  spectera: string | null;
}

export const PRODUCT_TIERS: Record<string, ProductTierMap> = {
  // ---------------------------------------------------------------------------
  // SINGLE VISION LENSES
  // ---------------------------------------------------------------------------
  "Single Vision": {
    vsp: "COVERED",           // VSP: covered under materials copay
    eyemed: "standard_sv",    // EyeMed: standard SV copay
    spectera: "standard"      // Spectera: standard lens
  },
  "Essilor Eyezen+ / Eyezen Start": {
    vsp: "BA",                // VSP: Digital SV enhancement
    eyemed: "all_other_lens_options",  // EyeMed: 20% discount
    spectera: "digital_sv"    // Spectera: digital SV tier
  },
  "Sequel Single Vision": { vsp: null, eyemed: null, spectera: null },
  "Neurolens SV": { vsp: null, eyemed: null, spectera: null },
  "Stellest": { vsp: null, eyemed: null, spectera: null },

  // ---------------------------------------------------------------------------
  // BIFOCAL LENSES
  // ---------------------------------------------------------------------------
  "Flat Top 28": {
    vsp: "GA",                // VSP: Blended Bifocal code GA
    eyemed: "standard_bf",    // EyeMed: standard bifocal
    spectera: "standard_bf"   // Spectera: standard bifocal
  },
  "Flat Top 7x28": {
    vsp: "GA",                // VSP: Blended Bifocal code GA
    eyemed: "standard_bf",
    spectera: "standard_bf"
  },

  // ---------------------------------------------------------------------------
  // PROGRESSIVE LENSES
  // ---------------------------------------------------------------------------
  "Varilux Comfort DRx": {
    vsp: "JA",                // VSP: Premium Progressive Tier JA
    eyemed: "tier_3",         // EyeMed: Progressive Tier 3
    spectera: "III"           // Spectera: Progressive Tier III
  },
  "Varilux Comfort Max": {
    vsp: "FA",                // VSP: Premium Progressive Tier FA
    eyemed: "tier_4",         // EyeMed: Progressive Tier 4
    spectera: "IV"            // Spectera: Progressive Tier IV
  },
  "Varilux X Design": {
    vsp: "NA",                // VSP: Custom (not standard tier)
    eyemed: "tier_4",         // EyeMed: Progressive Tier 4
    spectera: "V"             // Spectera: Progressive Tier V
  },
  "Varilux I design": { vsp: null, eyemed: null, spectera: null },
  "Sequel PAL": { vsp: null, eyemed: null, spectera: null },
  "Neurolens Progressive": { vsp: null, eyemed: null, spectera: null },

  // ---------------------------------------------------------------------------
  // LENS MATERIALS - Single Vision
  // ---------------------------------------------------------------------------
  "CR-39 (Standard Plastic)": {
    vsp: "standard",          // VSP: included in base
    eyemed: "standard",       // EyeMed: included in base
    spectera: "standard"      // Spectera: included in base
  },
  "Polycarbonate (Single Vision)": {
    vsp: "AD_SV",             // VSP: Material upgrade AD (SV copay)
    eyemed: "polycarbonate",  // EyeMed: polycarbonate copay
    spectera: "polycarbonate" // Spectera: polycarbonate copay
  },
  "Trivex (Single Vision)": {
    vsp: "AB_SV",             // VSP: Material upgrade AB (SV copay)
    eyemed: "trivex",         // EyeMed: trivex copay
    spectera: "trivex"        // Spectera: trivex copay
  },
  "Hi-Index 1.67 (Single Vision)": {
    vsp: "AH_SV",             // VSP: Material upgrade AH (SV copay $83)
    eyemed: "high_index_167", // EyeMed: high index 1.67 copay
    spectera: "high_index_167"// Spectera: high index copay
  },
  "Hi-Index 1.74 (Single Vision)": {
    vsp: "AJ_SV",             // VSP: Material upgrade AJ (SV copay $111)
    eyemed: "high_index_174", // EyeMed: high index 1.74 copay
    spectera: "high_index_174"// Spectera: high index copay
  },

  // ---------------------------------------------------------------------------
  // LENS MATERIALS - Multifocal/Progressive
  // ---------------------------------------------------------------------------
  "Polycarbonate (Multifocal)": {
    vsp: "AD",                // VSP: Material upgrade AD (MF copay)
    eyemed: "polycarbonate",  // EyeMed: polycarbonate copay
    spectera: "polycarbonate" // Spectera: polycarbonate copay
  },
  "Trivex (Multifocal)": {
    vsp: "AB",                // VSP: Material upgrade AB (MF copay)
    eyemed: "trivex",         // EyeMed: trivex copay
    spectera: "trivex"        // Spectera: trivex copay
  },
  "Hi-Index 1.67 (Multifocal)": {
    vsp: "AH",                // VSP: Material upgrade AH (MF copay $98)
    eyemed: "high_index_167", // EyeMed: high index 1.67 copay
    spectera: "high_index_167"// Spectera: high index copay
  },
  "Hi-Index 1.74 (Multifocal)": {
    vsp: "AJ",                // VSP: Material upgrade AJ (MF copay $118)
    eyemed: "high_index_174", // EyeMed: high index 1.74 copay
    spectera: "high_index_174"// Spectera: high index copay
  },
  "Hi-Index 1.72": { vsp: null, eyemed: "all_other_lens_options", spectera: null },  // EyeMed: "All Other Lens Options" 20% discount

  // ---------------------------------------------------------------------------
  // AR COATINGS
  // ---------------------------------------------------------------------------
  "Crizal Easy Pro": {
    vsp: "QT",                // VSP: AR Tier QT
    eyemed: "ar_tier_2",      // EyeMed: AR Tier 2 (NOT progressive tier!)
    spectera: "ar_I"          // Spectera: AR Tier I
  },
  "Crizal Rock": {
    vsp: "QV",                // VSP: AR Tier QV (premium)
    eyemed: "ar_tier_3",      // EyeMed: AR Tier 3
    spectera: "ar_II"         // Spectera: AR Tier II
  },
  "Crizal Sapphire HR": {
    vsp: "QV",                // VSP: AR Tier QV (premium)
    eyemed: "ar_tier_3",      // EyeMed: AR Tier 3 (NOT progressive tier!)
    spectera: "ar_III"        // Spectera: AR Tier III
  },
  "Crizal Sunshield UV": {
    vsp: "QV",                // VSP: AR Tier QV
    eyemed: "uv_treatment",   // EyeMed: UV treatment
    spectera: "ar_III"        // Spectera: AR Tier III
  },
  "Crizal Sunshield Mirrors UV": {
    vsp: "QV+QP",             // VSP: AR + Mirror combo
    eyemed: "uv_treatment",   // EyeMed: UV treatment
    spectera: "ar_III"        // Spectera: AR Tier III
  },
  "Neurolens Premium AR": { vsp: null, eyemed: null, spectera: null },
  "Neurolens Blue AR": { vsp: null, eyemed: null, spectera: null },

  // ---------------------------------------------------------------------------
  // PHOTOCHROMIC
  // ---------------------------------------------------------------------------
  "Transitions XTRActive": {
    vsp: "PR",                // VSP: Photochromic tier PR (plastic transitions)
    eyemed: "photochromic",   // EyeMed: photochromic copay
    spectera: "photochromic"  // Spectera: photochromic copay
  },
  "Transitions GEN S": {
    vsp: "PR",                // VSP: Photochromic tier PR
    eyemed: "photochromic",   // EyeMed: photochromic copay
    spectera: "photochromic"  // Spectera: photochromic copay
  },

  // ---------------------------------------------------------------------------
  // MOUNT FEES
  // ---------------------------------------------------------------------------
  "Full Rim": {
    vsp: "standard",          // VSP: no additional fee
    eyemed: "standard",       // EyeMed: no additional fee
    spectera: "standard"      // Spectera: no additional fee
  },
  "Semi Rimless (grooved)": {
    vsp: "SW",                // VSP: Rimless mounting SW
    eyemed: "all_other_lens_options",  // EyeMed: uses allOther discount
    spectera: "addon"         // Spectera: addon copay
  },
  "Rimless (drill mount)": {
    vsp: "SW",                // VSP: Rimless mounting SW
    eyemed: "all_other_lens_options",  // EyeMed: uses allOther discount
    spectera: "addon"         // Spectera: addon copay
  },

  // ---------------------------------------------------------------------------
  // ADDONS
  // ---------------------------------------------------------------------------
  "Essential Blue Series": {
    vsp: "LF",                // VSP: Light filtering LF
    eyemed: "blue_light",     // EyeMed: blue light copay
    spectera: "blue_light"    // Spectera: blue light copay
  },
  "Light Filter (VSP LF)": {
    vsp: "LF",                // VSP: Light filtering
    eyemed: "all_other_lens_options",  // EyeMed: uses allOther discount
    spectera: "blue_light"    // Spectera: blue light
  },
  "Polarized": {
    vsp: "DA",                // VSP: Polarized DA
    eyemed: "polarized",      // EyeMed: polarized copay
    spectera: "polarized"     // Spectera: polarized copay
  },
  "Mirror - Solid Color": {
    vsp: "QP",                // VSP: Mirror QP
    eyemed: "mirror",         // EyeMed: mirror copay
    spectera: "mirror"        // Spectera: mirror copay
  },
  "UV Protection": {
    vsp: "SV",                // VSP: UV Protection uses SV code (e.g., $16/$16)
    eyemed: "uv_treatment",   // EyeMed: UV copay
    spectera: "uv"            // Spectera: UV copay
  },
  "Solid Tint - CR39/Poly CLR Lens": {
    vsp: "MN",                // VSP: Tint tier MN
    eyemed: "tint",           // EyeMed: tint copay
    spectera: "tint"          // Spectera: tint copay
  },
  "Roll & Polish": {
    vsp: "SP",                // VSP: Edging SP
    eyemed: "edging",         // EyeMed: edging copay
    spectera: "addon"         // Spectera: addon
  },
  "Technical Add-On (Single Vision)": {
    vsp: "TA_SV",             // VSP: Technical Add-On SV variant (uses TA_sv copay)
    eyemed: null,             // EyeMed: NOT APPLICABLE - VSP-only product
    spectera: null            // Spectera: not applicable
  },
  "Technical Add-On (Multifocal/Progressive)": {
    vsp: "TA",                // VSP: Technical Add-On (MF)
    eyemed: null,             // EyeMed: NOT APPLICABLE - VSP-only product
    spectera: null            // Spectera: not applicable
  },
  "Oversize Lenses": { vsp: null, eyemed: null, spectera: null },
  "Prism over Base Range, Per D, Per Lens": { vsp: null, eyemed: null, spectera: null },
};


// =============================================================================
// TIER TO COPAY FIELD MAPPINGS
// =============================================================================
// Maps tier codes to the field names in the authorization's copays JSON
//
// Example: If a product has eyemed tier "tier_3", and the auth has copays JSON:
// { "progressiveTier3": 110, "arTier3": 75, ... }
//
// This mapping tells us that "tier_3" for progressives → "progressiveTier3"

export interface CopayFieldMap {
  [tierCode: string]: string;
}

export const EYEMED_TIER_TO_COPAY: CopayFieldMap = {
  // Progressive tiers
  "standard": "progressiveStandard",
  "tier_1": "progressiveTier1",
  "tier_2": "progressiveTier2",
  "tier_3": "progressiveTier3",
  "tier_4": "progressiveTier4",
  "tier_5": "progressiveTier5",

  // AR coating tiers
  "ar_tier_1": "arTier1",
  "ar_tier_2": "arTier2",
  "ar_tier_3": "DISCOUNT_20_PERCENT",  // EyeMed AR Tier 3 is always "20% off retail price"

  // Single vision
  "standard_sv": "singleVision",

  // Bifocal
  "standard_bf": "bifocal",

  // Materials
  "polycarbonate": "polycarbonate",
  "trivex": "trivex",
  "high_index_167": "highIndex167",
  "high_index_174": "DISCOUNT_20_PERCENT",  // EyeMed: Hi-Index 1.74 uses "All Other Lens Options" 20% discount

  // Enhancements
  "photochromic": "photochromic",
  "polarized": "polarized",
  "blue_light": "blueLight",
  "tint": "tint",
  "uv_treatment": "uvTreatment",
  "mirror": "mirror",
  "edging": "edging",

  // Discount-based (20% off retail)
  "all_other_lens_options": "DISCOUNT_20_PERCENT",

  // Standard (no extra copay)
  "standard": "ZERO_COPAY",
};

export const VSP_TIER_TO_COPAY: CopayFieldMap = {
  // ==========================================================================
  // VSP Two-Letter Code Mapping
  // ==========================================================================
  // VSP uses two-letter codes from the Lens Enhancement Charges document.
  // These codes are now stored DIRECTLY in the copays JSON with the code as key.
  // Example: copays["KA"] = 75, copays["FA"] = 95, etc.
  //
  // The mapping below maps tier codes to the copay field name in the JSON.
  // Since we store codes directly, most mappings are code → code.
  // ==========================================================================

  // Covered at base lens copay
  // VSP: Standard SV/basic lenses are typically covered at $0 (included in exam/materials)
  // The letter codes (KA, FA, etc.) define copays for upgrades
  "COVERED": "ZERO_COPAY",
  "standard": "ZERO_COPAY",

  // ---------------------------------------------------------------------------
  // PROGRESSIVE ENHANCEMENT CODES
  // ---------------------------------------------------------------------------
  // KA = Standard Progressive ($35 SV / $75 Multi)
  // FA = Premium Progressive ($50 SV / $95 Multi)
  // JA = Ultra Progressive ($65 SV / $120 Multi)
  // NA = Custom/Non-standard pricing
  // GA = Blended Bifocal/Trifocal
  "KA": "KA",
  "FA": "FA",
  "JA": "JA",
  "NA": "NA",
  "GA": "GA",                 // Blended Bifocal/Trifocal

  // ---------------------------------------------------------------------------
  // ANTI-REFLECTIVE CODES
  // ---------------------------------------------------------------------------
  // QM = Basic AR
  // QT = Standard AR
  // QV = Premium AR
  "QM": "QM",
  "QT": "QT",
  "QV": "QV",
  "QP": "QP",           // Mirror coating
  "QR": "QR",           // Ski type coating
  "QQ": "QQ",           // Scratch Resistant A
  "QS": "QS",           // Scratch Resistant B
  "QV+QP": "QV+QP",     // AR + Mirror combo

  // ---------------------------------------------------------------------------
  // MATERIAL UPGRADE CODES
  // ---------------------------------------------------------------------------
  // AD = Polycarbonate, AB = Trivex, AH = Hi-Index 1.67, AJ = Hi-Index 1.74
  // Multifocal versions (default)
  "AD": "AD",
  "AB": "AB",
  "AH": "AH",
  "AJ": "AJ",
  // Single Vision versions (use _sv copay fields)
  "AD_SV": "AD_sv",
  "AB_SV": "AB_sv",
  "AH_SV": "AH_sv",
  "AJ_SV": "AJ_sv",

  // ---------------------------------------------------------------------------
  // PHOTOCHROMIC CODES
  // ---------------------------------------------------------------------------
  // PR = Transitions (standard)
  // PM = Transitions premium
  // PS = Photochromic standard
  "PR": "PR",
  "PM": "PM",
  "PS": "PS",

  // ---------------------------------------------------------------------------
  // POLARIZED CODES
  // ---------------------------------------------------------------------------
  // DA = Polarized standard
  // DE = Polarized premium
  "DA": "DA",
  "DE": "DE",

  // ---------------------------------------------------------------------------
  // OTHER ENHANCEMENT CODES
  // ---------------------------------------------------------------------------
  "LF": "LF",           // Light filter / blue light
  "MN": "MN",           // Tints
  "SP": "SP",           // Roll & Polish / Edging
  "SW": "SW",           // Rimless mounting
  "TA": "TA",           // Technical Add-On (Multifocal - uses TA copay)
  "TA_SV": "TA_sv",     // Technical Add-On (Single Vision - uses TA_sv copay)
  "BA": "BA",           // Digital SV enhancement
  "SV": "SV",           // UV Protection
  "BD": "BD",           // Digital Measurement
  "CM": "CM",           // Custom Measurement
  "RM": "RM",           // Scratch Resistant A
  "RN": "RN",           // Scratch Resistant B
  "AA": "AA",           // Photochromic Glass A
  "DD": "DD",           // Polarized Glass

  // ---------------------------------------------------------------------------
  // EASY OPTIONS (when applicable)
  // ---------------------------------------------------------------------------
  // EasyOptions provides $0 copay for certain enhancements
  "EASY_OPTIONS": "ZERO_COPAY",
};

export const SPECTERA_TIER_TO_COPAY: CopayFieldMap = {
  // Standard lens
  "standard": "ZERO_COPAY",
  "standard_bf": "bifocal",

  // Progressive tiers (Roman numerals)
  "I": "progressiveTierI",
  "II": "progressiveTierII",
  "III": "progressiveTierIII",
  "IV": "progressiveTierIV",
  "V": "progressiveTierV",

  // AR tiers
  "ar_I": "arTierI",
  "ar_II": "arTierII",
  "ar_III": "arTierIII",

  // Digital SV
  "digital_sv": "digitalSV",

  // Materials
  "polycarbonate": "polycarbonate",
  "trivex": "trivex",
  "high_index_167": "highIndex167",

  // Enhancements
  "photochromic": "photochromic",
  "polarized": "polarized",
  "blue_light": "blueLight",
  "tint": "tint",
  "uv": "uv",
  "mirror": "mirror",
  "addon": "addon",
};


// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the copay for a product from an authorization's copays JSON
 *
 * @param productName - The product name (e.g., "Varilux Comfort DRx")
 * @param carrier - The insurance carrier ("eyemed", "vsp", "spectera")
 * @param copays - The copays JSON from the authorization
 * @param retailPrice - The retail price to use for fallback/discount calculations
 * @returns The copay amount, or null if not covered
 */
export function getProductCopay(
  productName: string,
  carrier: 'eyemed' | 'vsp' | 'spectera',
  copays: Record<string, number | null>,
  retailPrice: number
): number | null {
  // 1. Get the product's tier for this carrier
  const productTier = PRODUCT_TIERS[productName];
  if (!productTier) {
    console.warn(`[Pricing] Unknown product: ${productName}`);
    return null;
  }

  const tierCode = productTier[carrier];
  if (!tierCode) {
    // Product not covered by this carrier
    return null;
  }

  // 2. Get the copay field mapping for this carrier
  let tierToCopay: CopayFieldMap;
  switch (carrier) {
    case 'eyemed':
      tierToCopay = EYEMED_TIER_TO_COPAY;
      break;
    case 'vsp':
      tierToCopay = VSP_TIER_TO_COPAY;
      break;
    case 'spectera':
      tierToCopay = SPECTERA_TIER_TO_COPAY;
      break;
  }

  const copayField = tierToCopay[tierCode];
  if (!copayField) {
    console.warn(`[Pricing] Unknown tier code: ${tierCode} for carrier ${carrier}`);
    return null;
  }

  // 3. Handle special cases
  if (copayField === 'ZERO_COPAY') {
    return 0;
  }

  if (copayField === 'DISCOUNT_20_PERCENT') {
    // EyeMed "all other lens options" = 20% off retail
    return Math.round(retailPrice * 0.80 * 100) / 100;
  }

  // 4. Look up the copay in the authorization's copays JSON
  const copay = copays[copayField];

  if (copay === undefined || copay === null) {
    console.warn(`[Pricing] Copay field ${copayField} not found in authorization`);
    return null;
  }

  return copay;
}

/**
 * Get all products that are covered by a specific carrier
 */
export function getProductsForCarrier(carrier: 'eyemed' | 'vsp' | 'spectera'): string[] {
  return Object.entries(PRODUCT_TIERS)
    .filter(([_, tiers]) => tiers[carrier] !== null)
    .map(([productName]) => productName);
}

/**
 * Check if a product is covered by insurance for a carrier
 */
export function isProductCovered(productName: string, carrier: 'eyemed' | 'vsp' | 'spectera'): boolean {
  const tiers = PRODUCT_TIERS[productName];
  return tiers ? tiers[carrier] !== null : false;
}
