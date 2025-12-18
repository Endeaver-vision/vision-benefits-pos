/**
 * Contact Lens Annual Supply Calculation Utilities
 *
 * Hybrid approach:
 * - Uses database override if annualSupplyBothEyes is set
 * - Otherwise calculates dynamically from modality + boxSize
 */

// Lenses needed per eye per year by modality
export const LENSES_PER_YEAR: Record<string, number> = {
  daily: 365,
  weekly: 52,
  biweekly: 26,
  monthly: 12,
}

/**
 * Calculate annual supply threshold (total boxes for both eyes)
 *
 * @param modality - 'daily' | 'weekly' | 'biweekly' | 'monthly'
 * @param boxSize - Number of lenses per box
 * @param dbOverride - Optional database override value (annualSupplyBothEyes)
 * @returns Total boxes needed for annual supply (both eyes)
 */
export function calculateAnnualSupplyThreshold(
  modality: string | null | undefined,
  boxSize: number,
  dbOverride?: number | null
): number {
  // Use database override if explicitly set
  if (dbOverride && dbOverride > 0) {
    return dbOverride
  }

  // Calculate dynamically from modality
  const lensesPerYear = LENSES_PER_YEAR[modality?.toLowerCase() || '']

  if (!lensesPerYear) {
    // Default to daily if modality unknown
    console.warn(`Unknown modality "${modality}", defaulting to daily (365 lenses/year)`)
    return Math.ceil(365 / boxSize) * 2
  }

  // Formula: ceil(lensesPerYear / boxSize) * 2 eyes
  const boxesPerEye = Math.ceil(lensesPerYear / boxSize)
  return boxesPerEye * 2
}

/**
 * Calculate boxes per eye for annual supply
 */
export function calculateBoxesPerEye(
  modality: string | null | undefined,
  boxSize: number,
  dbOverride?: number | null
): number {
  const totalBoxes = calculateAnnualSupplyThreshold(modality, boxSize, dbOverride)
  return Math.ceil(totalBoxes / 2)
}

/**
 * Get modality from lens flags (isDaily, isWeekly, isMonthly)
 * Falls back to modality string if flags not available
 */
export function getModalityFromLens(lens: {
  isDaily?: boolean
  isWeekly?: boolean
  isMonthly?: boolean
  modality?: string | null
}): string {
  // Check modality string first - it's the most accurate source
  const mod = lens.modality?.toLowerCase()
  if (mod === 'daily' || mod === 'weekly' || mod === 'biweekly' || mod === 'monthly') {
    return mod
  }

  // Fall back to boolean flags
  if (lens.isDaily) return 'daily'
  if (lens.isWeekly) return 'biweekly'  // isWeekly historically means bi-weekly
  if (lens.isMonthly) return 'monthly'

  // Default to daily if unknown
  return 'daily'
}

/**
 * Check if a quantity meets annual supply threshold
 */
export function meetsAnnualSupply(
  totalBoxes: number,
  modality: string | null | undefined,
  boxSize: number,
  dbOverride?: number | null
): boolean {
  const threshold = calculateAnnualSupplyThreshold(modality, boxSize, dbOverride)
  return totalBoxes >= threshold
}
