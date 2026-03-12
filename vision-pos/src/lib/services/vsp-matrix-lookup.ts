/**
 * VSP Matrix Lookup Service
 *
 * VSP uses combined codes for progressive + material pricing. For example:
 * - Varilux X (N tier) + Hi-Index 1.74 (J code) = "NJ" = $125
 * - NOT: NA ($175) + AJ ($118) = $293 (wrong additive approach)
 *
 * The matrix structure:
 * - Progressive tier (K, J, F, O, N) is the first letter
 * - Material code (A, D, B, H, J, P) is the second letter
 * - Combined code (e.g., "NJ") is looked up in copays JSON
 *
 * Material upgrades (D, B, H, J, P) are FLAT across all progressive tiers.
 * Only CR-39 (A) varies by tier because it's the base lens cost.
 */

export type ProgressiveTier = 'K' | 'J' | 'F' | 'O' | 'N'
export type MaterialCode = 'A' | 'D' | 'B' | 'H' | 'J' | 'P'

export interface VspMatrixResult {
  combinedCode: string
  copay: number
  progressiveTier: ProgressiveTier
  materialCode: MaterialCode
  isSingleVision: boolean
}

/**
 * Map progressive lens product names to VSP tier letters
 * K = Standard/Economy Progressive
 * J = Varilux Comfort DRx (Premium J)
 * F = Varilux Comfort Max (Premium F)
 * O = Custom 1 / Other Premium
 * N = Varilux X Design (Custom N)
 */
export const PROGRESSIVE_TIER_MAP: Record<string, ProgressiveTier> = {
  // Standard progressives
  'Standard Progressive': 'K',
  'Economy Progressive': 'K',

  // J tier progressives
  'Varilux Comfort DRx': 'J',
  'Varilux Physio DRx': 'J',
  'Premium Progressive': 'J',

  // F tier progressives
  'Varilux Comfort Max': 'F',
  'Varilux Physio Enhanced': 'F',

  // O tier progressives (custom/premium)
  'Custom Progressive': 'O',
  'Varilux S Design': 'O',

  // N tier progressives (top tier)
  'Varilux X Design': 'N',
  'Varilux X Series': 'N',
  'Varilux XR': 'N',
}

/**
 * Map material product names to VSP material letters
 * A = CR-39 (standard plastic) - varies by progressive tier
 * D = Polycarbonate - flat copay across tiers
 * B = Trivex - flat copay across tiers
 * H = Hi-Index 1.67 - flat copay across tiers
 * J = Hi-Index 1.70/1.74 - flat copay across tiers
 * P = Polycarbonate Plus - flat copay across tiers
 */
export const MATERIAL_CODE_MAP: Record<string, MaterialCode> = {
  // A - Standard plastic (CR-39)
  'CR-39': 'A',
  'CR-39 (Standard Plastic)': 'A',
  'Standard Plastic': 'A',
  'Plastic': 'A',

  // D - Polycarbonate
  'Polycarbonate': 'D',
  'Polycarbonate (Single Vision)': 'D',
  'Polycarbonate (Multifocal)': 'D',
  'Poly': 'D',

  // B - Trivex
  'Trivex': 'B',
  'Trivex (Single Vision)': 'B',
  'Trivex (Multifocal)': 'B',

  // H - Hi-Index 1.67
  'Hi-Index 1.67': 'H',
  'Hi-Index 1.67 (Single Vision)': 'H',
  'Hi-Index 1.67 (Multifocal)': 'H',
  '1.67': 'H',

  // J - Hi-Index 1.70+
  'Hi-Index 1.70': 'J',
  'Hi-Index 1.74': 'J',
  'Hi-Index 1.74 (Single Vision)': 'J',
  'Hi-Index 1.74 (Multifocal)': 'J',
  '1.70': 'J',
  '1.74': 'J',

  // P - Polycarbonate Plus
  'Polycarbonate Plus': 'P',
  'Poly Plus': 'P',
}

/**
 * Get the combined copay for a progressive + material selection
 * Uses the VSP matrix lookup (e.g., "NJ" for Varilux X + Hi-Index 1.70+)
 *
 * @param progressiveName - The progressive lens product name (e.g., "Varilux X Design")
 * @param materialName - The material product name (e.g., "Hi-Index 1.74")
 * @param copays - The copays JSON from InsuranceAuthorization
 * @returns The combined copay result or null if lookup fails
 */
export function getVspCombinedCopay(
  progressiveName: string,
  materialName: string,
  copays: Record<string, number | null | undefined>
): VspMatrixResult | null {
  const tier = getProgressiveTier(progressiveName)
  const mat = getMaterialCode(materialName)

  if (!tier || !mat) {
    console.log(`[VSP Matrix] Could not map: progressive="${progressiveName}" (${tier}), material="${materialName}" (${mat})`)
    return null
  }

  const combinedCode = tier + mat  // e.g., "NJ"
  const copay = copays[combinedCode]

  if (copay === null || copay === undefined) {
    console.log(`[VSP Matrix] Combined code "${combinedCode}" not found in copays`)
    return null
  }

  return {
    combinedCode,
    copay,
    progressiveTier: tier,
    materialCode: mat,
    isSingleVision: false,
  }
}

/**
 * Get the material copay for a Single Vision lens (no progressive matrix)
 * Uses the material-only codes with _sv suffix (e.g., "AD_sv" for Poly SV)
 *
 * @param materialName - The material product name (e.g., "Polycarbonate")
 * @param copays - The copays JSON from InsuranceAuthorization
 * @returns The material copay for single vision or null if not found
 */
export function getVspSingleVisionMaterialCopay(
  materialName: string,
  copays: Record<string, number | null | undefined>
): VspMatrixResult | null {
  const mat = getMaterialCode(materialName)

  if (!mat) {
    console.log(`[VSP Matrix] Could not map SV material: "${materialName}"`)
    return null
  }

  // For SV, we use material-only codes like "AD", "AH" etc. with _sv suffix
  // The copays JSON stores these as "AD_sv", "AH_sv" for single vision prices
  const materialBaseCode = 'A' + mat  // e.g., "AD" for Polycarbonate
  const svCode = materialBaseCode + '_sv'  // e.g., "AD_sv"

  // Try SV-specific code first
  let copay = copays[svCode]

  // Fallback to base code if SV not found (some plans don't differentiate)
  if (copay === null || copay === undefined) {
    copay = copays[materialBaseCode]
  }

  if (copay === null || copay === undefined) {
    console.log(`[VSP Matrix] SV material code "${svCode}" or "${materialBaseCode}" not found in copays`)
    return null
  }

  return {
    combinedCode: svCode,
    copay,
    progressiveTier: 'K',  // Not applicable for SV, use K as placeholder
    materialCode: mat,
    isSingleVision: true,
  }
}

/**
 * Get the flat add-on copay (AR coating, photochromic, etc.)
 * These are NOT part of the progressive+material matrix
 *
 * @param addonCode - The VSP two-letter code (e.g., "QV", "PR", "LF")
 * @param copays - The copays JSON from InsuranceAuthorization
 * @param preferMultifocal - Whether to prefer MF copay over SV (default true)
 * @returns The addon copay or null if not found
 */
export function getVspFlatAddonCopay(
  addonCode: string,
  copays: Record<string, number | null | undefined>,
  preferMultifocal: boolean = true
): number | null {
  // Flat addons have both regular code and _sv suffix versions
  // Most are identical, but some differ (like TA tech addon)

  if (preferMultifocal) {
    // Try MF first (regular code), then SV
    const mfCopay = copays[addonCode]
    if (mfCopay !== null && mfCopay !== undefined) {
      return mfCopay
    }
    const svCopay = copays[addonCode + '_sv']
    return svCopay ?? null
  } else {
    // Try SV first, then MF
    const svCopay = copays[addonCode + '_sv']
    if (svCopay !== null && svCopay !== undefined) {
      return svCopay
    }
    const mfCopay = copays[addonCode]
    return mfCopay ?? null
  }
}

/**
 * Helper: Get progressive tier letter from product name
 */
export function getProgressiveTier(productName: string): ProgressiveTier | null {
  // Direct lookup
  if (PROGRESSIVE_TIER_MAP[productName]) {
    return PROGRESSIVE_TIER_MAP[productName]
  }

  // Partial match for flexibility
  const lowerName = productName.toLowerCase()

  if (lowerName.includes('varilux x') || lowerName.includes('varilux xr')) {
    return 'N'
  }
  if (lowerName.includes('varilux s')) {
    return 'O'
  }
  if (lowerName.includes('comfort max') || lowerName.includes('physio enhanced')) {
    return 'F'
  }
  if (lowerName.includes('comfort drx') || lowerName.includes('physio drx')) {
    return 'J'
  }
  if (lowerName.includes('standard') || lowerName.includes('economy')) {
    return 'K'
  }

  return null
}

/**
 * Helper: Get material code letter from product name
 */
export function getMaterialCode(productName: string): MaterialCode | null {
  // Direct lookup
  if (MATERIAL_CODE_MAP[productName]) {
    return MATERIAL_CODE_MAP[productName]
  }

  // Partial match for flexibility
  const lowerName = productName.toLowerCase()

  if (lowerName.includes('1.74') || lowerName.includes('1.70')) {
    return 'J'
  }
  if (lowerName.includes('1.67')) {
    return 'H'
  }
  if (lowerName.includes('trivex')) {
    return 'B'
  }
  if (lowerName.includes('polycarbonate') || lowerName.includes('poly')) {
    return 'D'
  }
  if (lowerName.includes('cr-39') || lowerName.includes('plastic') || lowerName.includes('standard')) {
    return 'A'
  }

  return null
}

/**
 * Check if a lens type is Single Vision (not progressive/bifocal)
 */
export function isSingleVisionLens(lensTypeName: string): boolean {
  const lowerName = lensTypeName.toLowerCase()
  return lowerName.includes('single vision') ||
         lowerName.includes('sv') ||
         lowerName.includes('eyezen')
}

/**
 * Check if a lens type is a progressive/multifocal
 */
export function isProgressiveLens(lensTypeName: string): boolean {
  const lowerName = lensTypeName.toLowerCase()
  return lowerName.includes('progressive') ||
         lowerName.includes('varilux') ||
         lowerName.includes('bifocal') ||
         lowerName.includes('trifocal') ||
         lowerName.includes('multifocal')
}

/**
 * Build the full matrix of combined codes and copays from a copays JSON
 * Useful for displaying the price list grid
 */
export function buildVspPriceMatrix(
  copays: Record<string, number | null | undefined>
): {
  matrix: Record<ProgressiveTier, Record<MaterialCode, number | null>>
  flatAddons: Record<string, { sv: number | null; mf: number | null }>
} {
  const progressiveTiers: ProgressiveTier[] = ['K', 'J', 'F', 'O', 'N']
  const materialCodes: MaterialCode[] = ['A', 'D', 'B', 'H', 'J', 'P']

  const matrix: Record<ProgressiveTier, Record<MaterialCode, number | null>> = {
    K: { A: null, D: null, B: null, H: null, J: null, P: null },
    J: { A: null, D: null, B: null, H: null, J: null, P: null },
    F: { A: null, D: null, B: null, H: null, J: null, P: null },
    O: { A: null, D: null, B: null, H: null, J: null, P: null },
    N: { A: null, D: null, B: null, H: null, J: null, P: null },
  }

  // Build the progressive + material matrix
  for (const tier of progressiveTiers) {
    for (const mat of materialCodes) {
      const code = tier + mat
      const value = copays[code]
      matrix[tier][mat] = value !== undefined ? value : null
    }
  }

  // Build flat add-ons map
  const flatAddonCodes = ['QM', 'QT', 'QV', 'PR', 'LF', 'MN', 'DA', 'SP', 'SW', 'TA']
  const flatAddons: Record<string, { sv: number | null; mf: number | null }> = {}

  for (const code of flatAddonCodes) {
    const svValue = copays[code + '_sv']
    const mfValue = copays[code]
    flatAddons[code] = {
      sv: svValue !== undefined ? svValue : null,
      mf: mfValue !== undefined ? mfValue : null,
    }
  }

  return { matrix, flatAddons }
}

/**
 * Get human-readable labels for progressive tiers
 * These should match the actual product names in the catalog
 */
export const PROGRESSIVE_TIER_LABELS: Record<ProgressiveTier, string> = {
  K: 'Standard Progressive',
  J: 'Varilux Comfort DRx',
  F: 'Varilux Comfort Max',
  O: 'Varilux S Design',
  N: 'Varilux X Design',
}

/**
 * Get human-readable labels for material codes
 * These should match the actual product names in the catalog
 */
export const MATERIAL_CODE_LABELS: Record<MaterialCode, string> = {
  A: 'CR-39 (Standard Plastic)',
  D: 'Polycarbonate',
  B: 'Trivex',
  H: 'Hi-Index 1.67',
  J: 'Hi-Index 1.74',
  P: 'Polycarbonate Plus',
}

/**
 * Map tier codes to product names that exist in our catalog
 * Used to filter the matrix to only show products we actually sell
 */
export const TIER_TO_PRODUCT_NAMES: Record<ProgressiveTier, string[]> = {
  K: ['Standard Progressive', 'Economy Progressive'],
  J: ['Varilux Comfort DRx', 'Varilux Physio DRx'],
  F: ['Varilux Comfort Max', 'Varilux Physio Enhanced'],
  O: ['Varilux S Design', 'Custom Progressive'],
  N: ['Varilux X Design', 'Varilux X Series', 'Varilux XR'],
}

/**
 * Map material codes to product names that exist in our catalog
 */
export const MATERIAL_TO_PRODUCT_NAMES: Record<MaterialCode, string[]> = {
  A: ['CR-39', 'CR-39 (Standard Plastic)', 'Standard Plastic'],
  D: ['Polycarbonate', 'Polycarbonate (Single Vision)', 'Polycarbonate (Multifocal)'],
  B: ['Trivex', 'Trivex (Single Vision)', 'Trivex (Multifocal)'],
  H: ['Hi-Index 1.67', 'Hi-Index 1.67 (Single Vision)', 'Hi-Index 1.67 (Multifocal)'],
  J: ['Hi-Index 1.74', 'Hi-Index 1.74 (Single Vision)', 'Hi-Index 1.74 (Multifocal)', 'Hi-Index 1.70'],
  P: ['Polycarbonate Plus', 'Poly Plus'],
}
