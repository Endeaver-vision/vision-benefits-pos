/**
 * EyeMed Product Formulary
 * Maps product names to their insurance tier classifications
 *
 * This is the "rosetta stone" - it translates product names to tiers.
 * Tiers are then looked up in the patient's benefit authorization.
 */

export type ProgressiveTier = 'standard' | 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4' | 'tier_5'
export type ARTier = 'standard' | 'tier_1' | 'tier_2' | 'tier_3'

/**
 * Progressive Lens Formulary
 * Maps product names (lowercase, normalized) to tiers
 */
export const PROGRESSIVE_FORMULARY: Record<string, ProgressiveTier> = {
  // ═══════════════════════════════════════════════════════════════════
  // TIER 5 - Premium Plus / Custom Progressives
  // ═══════════════════════════════════════════════════════════════════

  // Essilor/Varilux
  'varilux x design': 'tier_5',
  'varilux x 4d': 'tier_5',
  'varilux x fit': 'tier_5',
  'varilux xr design': 'tier_5',
  'varilux xr': 'tier_5',
  'varilux physio w3+': 'tier_5',
  'varilux physio w3plus': 'tier_5',

  // HOYA
  'hoya id lifestyle 3': 'tier_5',
  'hoya id mystyle 3': 'tier_5',
  'hoyalux id mystyle': 'tier_5',

  // Kodak
  'kodak unique dro hd': 'tier_5',
  'kodak unique infinite': 'tier_5',
  'kodak unique infinite hd': 'tier_5',

  // Shamir
  'shamir autograph intelligence': 'tier_5',
  'shamir autograph ii+': 'tier_5',
  'autograph intelligence': 'tier_5',

  // Zeiss
  'zeiss progressive smartlife individual': 'tier_5',
  'zeiss progressive smartlife superb': 'tier_5',
  'zeiss smartlife superb': 'tier_5',
  'zeiss smartlife individual': 'tier_5',
  'zeiss drivesafe individual': 'tier_5',

  // IOT
  'iot ultimate camber': 'tier_5',
  'iot ultimate w/ camber': 'tier_5',

  // Sport brands
  'oakley otd elite': 'tier_5',
  'rayban amplified': 'tier_5',
  'rayban varilux physio w3+': 'tier_5',
  'rayban varilux x fit': 'tier_5',

  // ═══════════════════════════════════════════════════════════════════
  // TIER 4 - Advanced Premium Progressives
  // ═══════════════════════════════════════════════════════════════════

  // Essilor/Varilux
  'varilux comfort max': 'tier_4',
  'varilux comfort enhanced': 'tier_4',
  'varilux physio drx': 'tier_4',

  // HOYA
  'hoya id lifestyle 2': 'tier_4',
  'hoyalux id lifestyle 2': 'tier_4',
  'hoya id workstyle 3': 'tier_4',

  // Kodak
  'kodak unique': 'tier_4',
  'kodak unique dro': 'tier_4',

  // Shamir
  'shamir autograph iii': 'tier_4',
  'autograph iii': 'tier_4',

  // Zeiss
  'zeiss progressive smartlife pure': 'tier_4',
  'zeiss smartlife pure': 'tier_4',

  // IOT
  'iot ultimate': 'tier_4',

  // Sport brands
  'oakley otd advanced iii': 'tier_4',
  'rayban varilux comfort max': 'tier_4',

  // ═══════════════════════════════════════════════════════════════════
  // TIER 3 - Upper Premium Progressives
  // ═══════════════════════════════════════════════════════════════════

  // Essilor/Varilux
  'varilux comfort 2': 'tier_3',
  'varilux comfort drx': 'tier_3',
  'varilux comfort': 'tier_3',

  // HOYA
  'hoya amplitude hd3': 'tier_3',
  'amplitude hd3': 'tier_3',

  // Kodak
  'kodak intromax': 'tier_3',
  'kodak precise pb': 'tier_3',

  // Nikon
  'nikon presio i': 'tier_3',
  'nikon presio i digital': 'tier_3',
  'presio i': 'tier_3',

  // Shamir
  'shamir autograph ii office': 'tier_3',
  'autograph ii office': 'tier_3',

  // Zeiss
  'zeiss progressive light v': 'tier_3',

  // Sport brands
  'oakley otd advance': 'tier_3',
  'rayban base ii': 'tier_3',

  // ═══════════════════════════════════════════════════════════════════
  // TIER 2 - Mid Premium Progressives
  // ═══════════════════════════════════════════════════════════════════

  // Essilor
  'ideal advanced': 'tier_2',
  'essilor ideal advanced': 'tier_2',

  // AO
  'ao easy': 'tier_2',

  // HOYA
  'hoya amplitude bks': 'tier_2',
  'amplitude bks': 'tier_2',
  'hoya select 17': 'tier_2',

  // Kodak
  'kodak precise': 'tier_2',
  'kodak precise short': 'tier_2',
  'precise': 'tier_2',

  // Shamir
  'shamir firstpal': 'tier_2',
  'firstpal': 'tier_2',

  // Zeiss
  'zeiss progressive light h': 'tier_2',

  // Sport brands
  'oakley true digital': 'tier_2',

  // ═══════════════════════════════════════════════════════════════════
  // TIER 1 - Standard Premium Progressives
  // ═══════════════════════════════════════════════════════════════════

  // Essilor
  'adaptar': 'tier_1',
  'adaptar digital': 'tier_1',
  'adaptar short': 'tier_1',
  'essilor adaptar': 'tier_1',
  'ideal': 'tier_1',
  'ideal short': 'tier_1',
  'essilor ideal': 'tier_1',
  'natural': 'tier_1',
  'natural digital': 'tier_1',
  'essilor natural': 'tier_1',

  // HOYA
  'hoya gp bks': 'tier_1',
  'hoya select 13': 'tier_1',

  // Kodak
  'kodak easy 14': 'tier_1',
  'kodak easy 18': 'tier_1',

  // Shamir
  'shamir genesis hd': 'tier_1',
  'genesis hd': 'tier_1',

  // Zeiss
  'zeiss business': 'tier_1',
  'zeiss progressive light d': 'tier_1'
}

/**
 * AR Coating Formulary
 * Maps AR product names (lowercase, normalized) to tiers
 */
export const AR_FORMULARY: Record<string, ARTier> = {
  // ═══════════════════════════════════════════════════════════════════
  // TIER 3 - Top Premium AR
  // ═══════════════════════════════════════════════════════════════════

  // Essilor/Crizal
  'crizal sapphire 360': 'tier_3',
  'crizal sapphire hr': 'tier_3',
  'crizal sapphire': 'tier_3',
  'crizal rock': 'tier_3',
  'crizal prevencia': 'tier_3',
  'crizal avance uv': 'tier_3',
  'crizal easy uv': 'tier_3',

  // HOYA
  'hoya recharge': 'tier_3',
  'hoya recharge ex3': 'tier_3',
  'recharge': 'tier_3',

  // Zeiss
  'zeiss duravision platinum': 'tier_3',
  'duravision platinum': 'tier_3',

  // Sport brands
  'oakley prizm ar': 'tier_3',
  'rayban ar premium': 'tier_3',

  // ═══════════════════════════════════════════════════════════════════
  // TIER 2 - Mid Premium AR
  // ═══════════════════════════════════════════════════════════════════

  // Essilor/Crizal
  'crizal easy new': 'tier_2',
  'crizal easy': 'tier_2',
  'crizal prevencia kids': 'tier_2',

  // Generic
  'bluecrystal': 'tier_2',
  'blucrystal': 'tier_2',

  // HOYA
  'hi vision': 'tier_2',
  'hoya premium viewprotect': 'tier_2',

  // Zeiss
  'zeiss duravision blueprotect': 'tier_2',
  'duravision blueprotect': 'tier_2',

  // Sport brands
  'oakley plus ar': 'tier_2',
  'rayban ar plus': 'tier_2',

  // ═══════════════════════════════════════════════════════════════════
  // TIER 1 - Basic Premium AR
  // ═══════════════════════════════════════════════════════════════════

  // Essilor/Crizal
  'crizal kids uv': 'tier_1',

  // Generic
  'anti-reflective ar': 'tier_1',
  'blue shield ar': 'tier_1',
  'clean shield ar': 'tier_1',

  // HOYA
  'hoya premium coating': 'tier_1',

  // Zeiss
  'zeiss super et': 'tier_1',

  // Sport brands
  'costa standard ar': 'tier_1',
  'oakley standard ar': 'tier_1',
  'rayban ar classic': 'tier_1',
  'rayban ar sun classic': 'tier_1',

  // ═══════════════════════════════════════════════════════════════════
  // STANDARD - Non-Premium AR
  // ═══════════════════════════════════════════════════════════════════

  'standard ar': 'standard',
  'backside ar': 'standard',
  'standard backside ar': 'standard'
}

/**
 * Products that require UV surcharge ($15)
 */
export const UV_SURCHARGE_PRODUCTS = new Set([
  'crizal sapphire 360',
  'crizal sapphire hr',
  'crizal sapphire',
  'crizal rock',
  'crizal ez pro',
  'crizal sunshield'
])

/**
 * Look up progressive tier for a product
 * Returns 'standard' if product not found
 */
export function getProgressiveTier(productName: string): ProgressiveTier {
  const normalized = productName.toLowerCase().trim()
  return PROGRESSIVE_FORMULARY[normalized] || 'standard'
}

/**
 * Look up AR tier for a product
 * Returns 'standard' if product not found
 */
export function getARTier(productName: string): ARTier {
  const normalized = productName.toLowerCase().trim()
  return AR_FORMULARY[normalized] || 'standard'
}

/**
 * Check if a product requires UV surcharge
 */
export function requiresUVSurcharge(productName: string): boolean {
  const normalized = productName.toLowerCase().trim()
  return UV_SURCHARGE_PRODUCTS.has(normalized)
}

/**
 * Fuzzy match for product lookup
 * Handles variations in naming (spaces, hyphens, abbreviations)
 */
export function findProductTier(
  productName: string,
  formulary: Record<string, string>
): string | null {
  const normalized = productName.toLowerCase().trim()
    .replace(/®|™|©/g, '')
    .replace(/\s+/g, ' ')

  // Direct match
  if (formulary[normalized]) {
    return formulary[normalized]
  }

  // Partial match - check if any key is contained in the product name
  for (const [key, tier] of Object.entries(formulary)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return tier
    }
  }

  return null
}
