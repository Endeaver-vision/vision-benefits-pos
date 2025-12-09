/**
 * Quote Authorization Context
 *
 * This type represents the authorization data loaded into a quote session.
 * It's populated when a quote is initialized with a customer who has active insurance.
 * The POS menus use this data to display correct patient pricing.
 */

export type CarrierType = 'vsp' | 'eyemed' | 'spectera'

/**
 * Lens copays for basic lens types
 */
export interface LensCopays {
  singleVision: number | null
  bifocal: number | null
  trifocal: number | null
}

/**
 * Material upgrade copays
 */
export interface MaterialCopays {
  polycarbonate: number | string | null
  polycarbonateChild: number | string | null
  highIndex160: number | string | null
  highIndex167: number | string | null
  highIndex174: number | string | null
  trivex: number | string | null
}

/**
 * Enhancement copays (add-ons)
 */
export interface EnhancementCopays {
  photochromic: number | string | null
  polarized: number | string | null
  blueLight: number | string | null
  tint: number | string | null
  uvCoating: number | string | null
  scratchCoating: number | string | null
}

/**
 * Special pricing rules based on patient/plan
 */
export interface SpecialRules {
  polycarbonateChildFreeAge: number
  childAge: number | null
  isChild: boolean
  secondPairDiscount: number | null
}

/**
 * Full authorization context for a quote session
 * This is what gets loaded when starting a quote with a customer
 */
export interface QuoteAuthorizationContext {
  // Authorization ID for linking to order
  authorizationId: string

  // Carrier info
  carrier: CarrierType
  planName: string
  planNetwork: string | null

  // Patient info
  patientName: string
  patientAge: number | null
  memberId: string
  groupNumber: string | null

  // Exam
  examCopay: number | null
  materialsCopay: number | null

  // Frame
  frameAllowance: number | null
  frameAllowanceFeatured: number | null  // VSP featured brands (Marchon)
  frameOverageDiscount: number | null    // e.g., 0.20 = 20% off overage

  // Contact lens
  contactAllowance: number | null
  contactFittingCovered: boolean
  contactExamCopay: number | null
  contactFittingCopay: number | null

  // Plan rules
  glassesContactsExclusive: boolean

  // Validity
  effectiveDate: string | null
  expirationDate: string | null
  isActive: boolean

  // ===== PRICING TIERS =====
  // These are the copays for each product category

  // Basic lens copays
  lensCopays: LensCopays

  // Progressive lens tiers
  // VSP: { "KA": 55, "JA": 95, "FA": 105, ... }
  // EyeMed: { "standard": 0, "tier_1": 65, "tier_2": 85, ... }
  // Spectera: { "I": 50, "II": 70, "III": 90, ... }
  progressiveTiers: Record<string, number | string | null>

  // AR coating tiers
  // VSP: { "QM": 0, "QT": 45, "QV": 65 }
  // EyeMed: { "standard": 0, "tier_1": 25, "tier_2": 55, "tier_3": 85 }
  // Spectera: { "I": 25, "II": 40, "III": 55, "IV": 70 }
  arCoatingTiers: Record<string, number | string | null>

  // Material copays
  materialCopays: MaterialCopays

  // Enhancement copays
  enhancementCopays: EnhancementCopays

  // Special rules
  specialRules: SpecialRules
}

/**
 * API response shape from /api/customers/[id]/authorization
 */
export interface AuthorizationApiResponse {
  success: boolean
  authorization: QuoteAuthorizationContext | null
  message?: string
  error?: string
}

/**
 * Quote initialization state
 */
export interface QuoteInitializationState {
  isLoading: boolean
  isInitialized: boolean
  error: string | null
  customerId: string | null
}

/**
 * Helper to check if authorization has frame coverage
 */
export function hasFrameCoverage(auth: QuoteAuthorizationContext | null): boolean {
  if (!auth) return false
  return auth.frameAllowance !== null && auth.frameAllowance > 0
}

/**
 * Helper to check if authorization has contact coverage
 */
export function hasContactCoverage(auth: QuoteAuthorizationContext | null): boolean {
  if (!auth) return false
  return auth.contactAllowance !== null && auth.contactAllowance > 0
}

/**
 * Helper to get the appropriate polycarbonate copay based on patient age
 */
export function getPolyCopay(auth: QuoteAuthorizationContext | null): number | string | null {
  if (!auth) return null

  if (auth.specialRules.isChild) {
    return auth.materialCopays.polycarbonateChild
  }
  return auth.materialCopays.polycarbonate
}

/**
 * Helper to get progressive copay by tier code
 */
export function getProgressiveCopay(
  auth: QuoteAuthorizationContext | null,
  tierCode: string
): number | null {
  if (!auth) return null

  const copay = auth.progressiveTiers[tierCode]
  if (copay === null || copay === undefined) return null
  if (typeof copay === 'string') {
    // Handle "80% of U&C" type values - return null to indicate special handling
    return null
  }
  return copay
}

/**
 * Helper to get AR coating copay by tier code
 */
export function getArCopay(
  auth: QuoteAuthorizationContext | null,
  tierCode: string
): number | null {
  if (!auth) return null

  const copay = auth.arCoatingTiers[tierCode]
  if (copay === null || copay === undefined) return null
  if (typeof copay === 'string') {
    return null
  }
  return copay
}
