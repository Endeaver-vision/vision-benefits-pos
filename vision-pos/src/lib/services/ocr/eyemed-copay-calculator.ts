/**
 * EyeMed Copay Calculator (TypeScript Port)
 *
 * Applies formulas to calculate patient copays based on extracted benefits and retail prices.
 * Supports 4 formula types:
 * 1. Flat copay (fixed amount)
 * 2. Base copay + percentage (copay + % of amount over allowance)
 * 3. Allowance + percentage (% of amount over allowance)
 * 4. Percentage only (% of retail price)
 */

export interface BenefitData {
  exact_text_found?: string
  category?: string
  base_copay?: number
  copay?: number
  allowance?: number
  discount_factor?: number
  formula_type: string
}

export interface CalculationResult {
  retail_price: number
  eyemed_benefit: string
  formula: string
  calculation_steps: string[]
  patient_copay: number | null
  formula_type: string
  error?: string
}

export class EyeMedCopayCalculator {
  /**
   * Calculate patient copay based on benefit formula and retail price
   */
  static calculate(retailPrice: number, benefitData: BenefitData): CalculationResult {
    if (!benefitData) {
      return {
        retail_price: retailPrice,
        eyemed_benefit: '',
        formula: '',
        calculation_steps: [],
        patient_copay: null,
        formula_type: 'unknown',
        error: 'No benefit data provided',
      }
    }

    const formulaType = benefitData.formula_type || 'unknown'
    const category = benefitData.category || 'unknown'

    // Route to appropriate formula based on type
    switch (formulaType) {
      case 'flat_copay':
        return this.flatCopay(retailPrice, benefitData)

      case 'base_copay_plus_percentage':
        return this.basePlusPercentage(retailPrice, benefitData)

      case 'allowance_plus_percentage':
        return this.allowancePlusPercentage(retailPrice, benefitData)

      case 'percentage_only':
        return this.percentageOnly(retailPrice, benefitData)

      case 'simple':
        // Simple fixed copay (like Single Vision $25 copay)
        if (benefitData.copay !== undefined) {
          return this.flatCopay(retailPrice, benefitData)
        }
        // Fall through to error

      default:
        return {
          retail_price: retailPrice,
          eyemed_benefit: benefitData.exact_text_found || '',
          formula: '',
          calculation_steps: [],
          patient_copay: null,
          formula_type: formulaType,
          error: `Unknown formula type: ${formulaType}`,
        }
    }
  }

  /**
   * Simple flat copay (e.g., Progressive Tier 4 $185 copay, or Single Vision $25 copay)
   * Patient pays only the copay amount, no additional calculation
   */
  private static flatCopay(retailPrice: number, benefitData: BenefitData): CalculationResult {
    const copay = benefitData.base_copay ?? benefitData.copay ?? 0

    return {
      retail_price: retailPrice,
      eyemed_benefit: benefitData.exact_text_found || '',
      formula: `Flat copay: $${copay}`,
      calculation_steps: [`Patient pays fixed amount: $${copay}`],
      patient_copay: Math.round(copay * 100) / 100,
      formula_type: 'flat_copay',
    }
  }

  /**
   * Base copay + percentage formula
   * Example: Progressive Tier 4 $85 copay; 20% off retail price less $120 allowance
   * Formula: base_copay + ((retail - allowance) * discount_factor)
   *
   * Note: "20% off" means patient gets 20% OFF, so patient PAYS 20% of the excess
   * The formula already accounts for this - we calculate 20% of the excess amount
   * which is what the patient pays in addition to the base copay
   */
  private static basePlusPercentage(
    retailPrice: number,
    benefitData: BenefitData
  ): CalculationResult {
    const baseCopay = benefitData.base_copay ?? 0
    const allowance = benefitData.allowance ?? 0
    const discountFactor = benefitData.discount_factor ?? 0

    // Calculate excess over allowance
    const excess = Math.max(0, retailPrice - allowance)

    // Patient pays: base copay + (percentage of excess)
    const additionalCost = excess * discountFactor
    const totalCopay = baseCopay + additionalCost

    const roundedTotal = Math.round(totalCopay * 100) / 100
    const roundedAdditional = Math.round(additionalCost * 100) / 100

    return {
      retail_price: retailPrice,
      eyemed_benefit: benefitData.exact_text_found || '',
      formula: `${baseCopay} + ((${retailPrice} - ${allowance}) × ${discountFactor})`,
      calculation_steps: [
        `Base copay: $${baseCopay}`,
        `Retail price: $${retailPrice}`,
        `Less allowance: $${allowance}`,
        `Excess amount: $${excess}`,
        `Patient pays ${discountFactor * 100}% of excess: $${excess} × ${discountFactor} = $${roundedAdditional}`,
        `Total: $${baseCopay} + $${roundedAdditional} = $${roundedTotal}`,
      ],
      patient_copay: roundedTotal,
      formula_type: 'base_copay_plus_percentage',
    }
  }

  /**
   * Allowance with percentage overage (e.g., Frame allowances)
   * Example: Frame $0 copay; 20% off balance over $150 allowance
   * Formula: if retail > allowance: (retail - allowance) * discount_factor else: 0
   */
  private static allowancePlusPercentage(
    retailPrice: number,
    benefitData: BenefitData
  ): CalculationResult {
    const allowance = benefitData.allowance ?? 0
    const discountFactor = benefitData.discount_factor ?? 0

    if (retailPrice <= allowance) {
      return {
        retail_price: retailPrice,
        eyemed_benefit: benefitData.exact_text_found || '',
        formula: 'Fully covered by allowance',
        calculation_steps: [
          `Retail price: $${retailPrice}`,
          `Allowance: $${allowance}`,
          `Price within allowance: $0`,
        ],
        patient_copay: 0.0,
        formula_type: 'allowance_plus_percentage',
      }
    }

    const excess = retailPrice - allowance
    const copay = excess * discountFactor
    const roundedCopay = Math.round(copay * 100) / 100

    return {
      retail_price: retailPrice,
      eyemed_benefit: benefitData.exact_text_found || '',
      formula: `(${retailPrice} - ${allowance}) × ${discountFactor}`,
      calculation_steps: [
        `Retail price: $${retailPrice}`,
        `Allowance: $${allowance}`,
        `Excess: $${excess}`,
        `Patient pays ${discountFactor * 100}% of excess: $${excess} × ${discountFactor} = $${roundedCopay}`,
      ],
      patient_copay: roundedCopay,
      formula_type: 'allowance_plus_percentage',
    }
  }

  /**
   * Percentage of retail only (e.g., Frame 35% off retail price)
   * Patient pays the percentage specified
   */
  private static percentageOnly(
    retailPrice: number,
    benefitData: BenefitData
  ): CalculationResult {
    const discountFactor = benefitData.discount_factor ?? 0
    const copay = retailPrice * discountFactor
    const roundedCopay = Math.round(copay * 100) / 100

    return {
      retail_price: retailPrice,
      eyemed_benefit: benefitData.exact_text_found || '',
      formula: `${retailPrice} × ${discountFactor}`,
      calculation_steps: [
        `Retail price: $${retailPrice}`,
        `Patient pays ${discountFactor * 100}% of retail`,
        `$${retailPrice} × ${discountFactor} = $${roundedCopay}`,
      ],
      patient_copay: roundedCopay,
      formula_type: 'percentage_only',
    }
  }
}

/**
 * Calculate copays for multiple products based on extracted benefits
 */
export interface ProductInfo {
  retail_price: number
  benefit_category: string
}

export function calculateProductCopays(
  extractedBenefits: Record<string, BenefitData>,
  products: Record<string, ProductInfo>
): Record<string, CalculationResult> {
  const results: Record<string, CalculationResult> = {}

  for (const [productName, productInfo] of Object.entries(products)) {
    const retailPrice = productInfo.retail_price
    const benefitCategory = productInfo.benefit_category

    // Get the extracted benefit for this category
    const benefitData = extractedBenefits[benefitCategory]

    if (!benefitData) {
      results[productName] = {
        retail_price: retailPrice,
        eyemed_benefit: '',
        formula: '',
        calculation_steps: [],
        patient_copay: null,
        formula_type: 'unknown',
        error: `Benefit category '${benefitCategory}' not found in authorization`,
      }
      continue
    }

    // Calculate copay
    const calculation = EyeMedCopayCalculator.calculate(retailPrice, benefitData)

    results[productName] = calculation
  }

  return results
}
