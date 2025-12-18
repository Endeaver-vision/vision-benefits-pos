/**
 * Product Catalog Types
 *
 * Each sellable product has:
 * 1. Our retail (U&C) price
 * 2. Carrier-specific tier mappings that determine patient copay
 *
 * When a product is selected during quote building, the pricing engine:
 * 1. Looks up the product's tier for the patient's carrier
 * 2. Uses the BenefitAuthorization to find the copay for that tier
 * 3. Calculates patient cost
 */

// =============================================================================
// PRODUCT CATEGORIES
// =============================================================================

export type ProductCategory =
  | 'frame'
  | 'lens_sv'           // Single vision lens
  | 'lens_bifocal'      // Bifocal lens
  | 'lens_progressive'  // Progressive lens
  | 'ar_coating'        // Anti-reflective coating
  | 'material'          // Polycarbonate, Trivex, High Index
  | 'photochromic'      // Transitions, etc.
  | 'polarized'
  | 'blue_light'
  | 'tint'
  | 'mirror'
  | 'edge_treatment'
  | 'mount_fee'         // Full rim, semi-rimless, rimless mount
  | 'contact'           // Contact lenses
  | 'service'           // Exams, fittings, procedures
  | 'addon'             // General add-on products
  | 'other'
  | 'unknown'           // Fallback for unmapped categories

// =============================================================================
// CARRIER-SPECIFIC TIER MAPPINGS
// =============================================================================

/**
 * EyeMed uses numbered tiers for progressives (1-5) and AR (1-3)
 */
export interface EyemedTierMapping {
  progressiveTier?: 'standard' | 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4' | 'tier_5'
  arTier?: 'standard' | 'tier_1' | 'tier_2' | 'tier_3'
  // For materials/enhancements, just identify the type
  materialType?: 'polycarbonate' | 'trivex' | 'high_index_167' | 'high_index_174'
  enhancementType?: 'photochromic' | 'polarized' | 'blue_light' | 'tint' | 'uv' | 'scratch'
}

/**
 * Spectera uses Roman numeral tiers (I-V for progressives, I-IV for AR)
 */
export interface SpecteraTierMapping {
  progressiveTier?: 'I' | 'II' | 'III' | 'IV' | 'V'
  arTier?: 'I' | 'II' | 'III' | 'IV'
  materialType?: 'polycarbonate' | 'trivex' | 'high_index'
  enhancementType?: 'photochromic' | 'polarized' | 'blue_light' | 'tint'
}

/**
 * VSP uses letter codes for progressives and AR
 * These come from VSP's published formulary
 */
export interface VspTierMapping {
  // Progressive lens base code (F, J, K, O, N, etc.)
  baseCode?: string

  // AR coating code (QM, QT, QV, etc.)
  arCode?: string

  // Vision type for progressives
  visionType?: 'sv' | 'mf' | 'bf'  // single vision, multifocal, bifocal

  // Material modifiers (added to base code)
  materialModifier?: 'D' | 'H' | 'T'  // D=poly, H=hi-index, T=trivex

  // Is this a "featured" brand (Altair/Marchon) for frame allowance purposes?
  isFeaturedBrand?: boolean
}

// =============================================================================
// PRODUCT CATALOG ENTRY
// =============================================================================

export interface ProductCatalogEntry {
  // Unique identifier
  sku: string

  // Display info
  displayName: string
  brand?: string
  manufacturer?: string
  description?: string

  // Category determines which copay lookup to use
  category: ProductCategory

  // Our price (Usual & Customary)
  retailPrice: number
  wholesaleCost?: number

  // Carrier tier mappings
  eyemed?: EyemedTierMapping
  spectera?: SpecteraTierMapping
  vsp?: VspTierMapping

  // Additional metadata
  isActive: boolean
  tags?: string[]  // For search/filtering
}

// =============================================================================
// EXAMPLES (for reference)
// =============================================================================

/*
Example Progressive Lens:
{
  sku: "PROG-VARILUX-COMFORT-MAX",
  displayName: "Varilux Comfort Max",
  brand: "Varilux",
  manufacturer: "Essilor",
  category: "lens_progressive",
  retailPrice: 394.00,
  eyemed: {
    progressiveTier: "tier_4"
  },
  spectera: {
    progressiveTier: "III"
  },
  vsp: {
    baseCode: "FA",
    visionType: "mf"
  },
  isActive: true,
  tags: ["progressive", "premium", "varilux"]
}

Example AR Coating:
{
  sku: "AR-CRIZAL-SAPPHIRE",
  displayName: "Crizal Sapphire",
  brand: "Crizal",
  manufacturer: "Essilor",
  category: "ar_coating",
  retailPrice: 187.00,
  eyemed: {
    arTier: "tier_3"
  },
  spectera: {
    arTier: "III"
  },
  vsp: {
    arCode: "QV"
  },
  isActive: true,
  tags: ["ar", "premium", "crizal"]
}

Example Material:
{
  sku: "MAT-POLYCARBONATE",
  displayName: "Polycarbonate",
  category: "material",
  retailPrice: 65.00,
  eyemed: {
    materialType: "polycarbonate"
  },
  spectera: {
    materialType: "polycarbonate"
  },
  vsp: {
    materialModifier: "D"
  },
  isActive: true,
  tags: ["material", "impact-resistant"]
}
*/

// =============================================================================
// QUOTE ITEM (what gets sent to pricing engine)
// =============================================================================

export interface QuoteItem {
  sku: string
  retailPrice: number  // Can be overridden for frames
  quantity?: number
}

export interface QuoteRequest {
  authorizationId: string  // References the stored BenefitAuthorization
  items: QuoteItem[]
  includeExam?: boolean
}

export interface QuoteLineItem {
  sku: string
  displayName: string
  category: ProductCategory
  pricingCategory?: string | null  // e.g., "VISION_EXAM", "PROGRESSIVE", "FRAME"
  retailPrice: number
  patientCopay: number
  insurancePays: number
  savings: number
  tierUsed?: string  // e.g., "tier_4", "III", "FA"
  notes?: string     // e.g., "80% of U&C applied", "Frame overage: $50"
  needsTierAssignment?: boolean  // True if using fallback pricing (80% retail)
}

export interface QuoteResult {
  authorizationId: string | null
  carrier: string | null
  planName: string

  // Line items
  items: QuoteLineItem[]

  // Totals
  retailTotal: number
  patientTotal: number
  insuranceTotal: number
  totalSavings: number

  // Copays (from authorization)
  examCopay?: number | null
  materialsCopay?: number | null

  // Materials benefit exclusivity - which category is using the insurance allowance
  // (glasses vs contacts - most plans only allow one per benefit period)
  activeMaterialsBenefit?: 'glasses' | 'contacts' | null

  // Metadata
  calculatedAt: Date
  warnings?: string[]  // e.g., "Both glasses and contacts in quote"
}
