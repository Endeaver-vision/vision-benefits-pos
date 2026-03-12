/**
 * EyeMed Pricing Engine Unit Tests
 *
 * Tests for:
 * - Formula parser
 * - Static rules
 * - Product matcher
 * - Main pricing engine
 */

import { describe, it, expect } from 'vitest'
import {
  parseFormula,
  calculateFormulaResult,
  parseAndCalculate,
} from './eyemed-formula-parser'
import {
  applyUvSurcharge,
  applyCashOnlyRule,
  applyAgeBasedRule,
  applyStaticRules,
  isTierAvailable,
} from './eyemed-static-rules'
import {
  matchProductToAuth,
  matchSingleVisionLens,
  matchFrame,
} from './eyemed-product-matcher'
import {
  calculateEyeMedPricing,
  validateEyemedAuthorization,
} from './eyemed-pricing-engine'
import {
  createEmptyEyemedAuth,
  EyemedBenefitAuthorization,
} from '@/types/benefit-authorization'
import { ProductCatalogEntry } from '@/types/product-catalog'
import { FormulaType } from './eyemed-formula-types'

// =============================================================================
// TEST DATA
// =============================================================================

function createTestAuth(): EyemedBenefitAuthorization {
  return createEmptyEyemedAuth(
    {
      name: 'Test Patient',
      dob: '1990-01-01',
      age: 34,
      memberId: 'TEST123',
    },
    {
      carrier: 'eyemed',
      planId: 'TEST-PLAN',
      planName: 'Test Plan',
    }
  ) as EyemedBenefitAuthorization
}

function createTestProduct(overrides?: Partial<ProductCatalogEntry>): ProductCatalogEntry {
  return {
    sku: 'TEST-SKU-001',
    displayName: 'Test Product',
    category: 'lens_progressive',
    retailPrice: 250,
    isActive: true,
    eyemed: {
      progressiveTier: 'tier_4',
    },
    ...overrides,
  }
}

// =============================================================================
// FORMULA PARSER TESTS
// =============================================================================

describe('Formula Parser', () => {
  describe('parseFormula', () => {
    it('parses simple copay', () => {
      const formula = parseFormula('$45 copay')
      expect(formula.type).toBe(FormulaType.FIXED_COPAY)
      expect(formula.components[0]?.value).toBe(45)
    })

    it('parses copay without text', () => {
      const formula = parseFormula('$45')
      expect(formula.type).toBe(FormulaType.FIXED_COPAY)
      expect(formula.components[0]?.value).toBe(45)
    })

    it('parses covered', () => {
      const formula = parseFormula('covered')
      expect(formula.type).toBe(FormulaType.COVERED)
    })

    it('parses allowance with overage', () => {
      const formula = parseFormula('$120 allowance; 20% off balance over allowance')
      expect(formula.type).toBe(FormulaType.ALLOWANCE_WITH_OVERAGE)
      expect(formula.components[0]?.value).toBe(120)
      expect(formula.components[1]?.value).toBe(0.2)
    })

    it('parses tiered allowance', () => {
      const formula = parseFormula('$90 progressive; 20% off retail price less $120 allowance')
      expect(formula.type).toBe(FormulaType.TIERED_ALLOWANCE)
      expect(formula.components[0]?.value).toBe(90) // copay
      expect(formula.components[1]?.value).toBe(0.2) // discount
      expect(formula.components[2]?.value).toBe(120) // allowance
    })

    it('parses percent of retail', () => {
      const formula = parseFormula('80% of retail')
      expect(formula.type).toBe(FormulaType.PERCENT_OF_RETAIL)
      expect(formula.components[0]?.value).toBe(0.8)
    })
  })

  describe('calculateFormulaResult', () => {
    it('calculates fixed copay', () => {
      const formula = parseFormula('$45 copay')
      const result = calculateFormulaResult(formula, 250)
      expect(result.patientOop).toBe(45)
      expect(result.insurancePays).toBe(205)
    })

    it('calculates allowance', () => {
      const formula = parseFormula('$120 allowance')
      const result = calculateFormulaResult(formula, 250)
      expect(result.insurancePays).toBe(120)
      expect(result.patientOop).toBe(130)
    })

    it('calculates allowance with overage discount', () => {
      const formula = parseFormula('$120 allowance; 20% off balance')
      const result = calculateFormulaResult(formula, 250)
      // Overage = 250 - 120 = 130
      // Discount on overage = 130 * 0.20 = 26
      // Patient pays = 130 - 26 = 104
      expect(result.patientOop).toBe(104)
      expect(result.insurancePays).toBe(146) // 120 + 26
    })

    it('handles copay exceeding retail', () => {
      const formula = parseFormula('$300 copay')
      const result = calculateFormulaResult(formula, 250)
      expect(result.patientOop).toBe(250) // Capped at retail
      expect(result.insurancePays).toBe(0)
    })
  })

  describe('parseAndCalculate', () => {
    it('parses and calculates in one step', () => {
      const result = parseAndCalculate('$45 copay', 250)
      expect(result.patientOop).toBe(45)
      expect(result.insurancePays).toBe(205)
    })

    it('handles null input as covered', () => {
      const result = parseAndCalculate(null, 250)
      expect(result.formulaType).toBe(FormulaType.COVERED)
      expect(result.patientOop).toBe(0)
      expect(result.insurancePays).toBe(250)
    })
  })
})

// =============================================================================
// STATIC RULES TESTS
// =============================================================================

describe('Static Rules', () => {
  describe('UV Surcharge', () => {
    it('applies surcharge for Crizal Sapphire', () => {
      const product = createTestProduct({
        displayName: 'Crizal Sapphire',
      })
      const result = applyUvSurcharge(product)
      expect(result.applied).toBe(true)
      expect(result.surchargeAmount).toBe(15)
    })

    it('does not apply for non-UV products', () => {
      const product = createTestProduct({
        displayName: 'Regular AR Coating',
      })
      const result = applyUvSurcharge(product)
      expect(result.applied).toBe(false)
    })
  })

  describe('Cash Only Rule', () => {
    it('identifies cash-only products', () => {
      const product = createTestProduct({
        tags: ['cash-only'],
      })
      const result = applyCashOnlyRule(product)
      expect(result.applied).toBe(true)
    })

    it('allows non-cash-only products', () => {
      const product = createTestProduct({
        tags: ['insurance-covered'],
      })
      const result = applyCashOnlyRule(product)
      expect(result.applied).toBe(false)
    })
  })

  describe('Age-Based Rule', () => {
    it('applies free polycarbonate for children', () => {
      const auth = createTestAuth()
      const context = {
        auth,
        product: createTestProduct({
          category: 'material',
          displayName: 'Polycarbonate',
        }),
        quantity: 1,
        patientAge: 16,
      }
      const result = applyAgeBasedRule(context, 65)
      expect(result.applied).toBe(true)
      expect(result.finalPrice).toBe(0)
    })

    it('does not apply for adults', () => {
      const auth = createTestAuth()
      const context = {
        auth,
        product: createTestProduct({
          category: 'material',
          displayName: 'Polycarbonate',
        }),
        quantity: 1,
        patientAge: 25,
      }
      const result = applyAgeBasedRule(context, 65)
      expect(result.applied).toBe(false)
      expect(result.finalPrice).toBe(65)
    })
  })

  describe('Tier Availability', () => {
    it('checks if tier is available', () => {
      const auth = createTestAuth()
      // Set tier 4
      auth.copays.progressivePremiumTier4 = 95
      expect(isTierAvailable('tier_4', auth)).toBe(true)
      expect(isTierAvailable('tier_5', auth)).toBe(false)
    })
  })

  describe('Apply All Rules', () => {
    it('combines multiple rules', () => {
      const auth = createTestAuth()
      auth.copays.progressivePremiumTier4 = 95

      const context = {
        auth,
        product: createTestProduct({
          displayName: 'Crizal Sapphire',
          category: 'ar_coating',
        }),
        quantity: 1,
        patientAge: 34,
      }

      const result = applyStaticRules(context, 187)
      expect(result.appliedRules.length).toBeGreaterThan(0)
      // UV surcharge should be applied
      const uvRule = result.appliedRules.find((r) => r.ruleName === 'UV Surcharge')
      expect(uvRule?.applied).toBe(true)
    })
  })
})

// =============================================================================
// PRODUCT MATCHER TESTS
// =============================================================================

describe('Product Matcher', () => {
  describe('matchProductToAuth', () => {
    it('matches progressive lens to tier', () => {
      const auth = createTestAuth()
      auth.copays.progressivePremiumTier4 = 95

      const product = createTestProduct({
        eyemed: { progressiveTier: 'tier_4' },
      })

      const result = matchProductToAuth(product, auth)
      expect(result.matched).toBe(true)
      expect(result.tier).toBe('tier_4')
      expect(result.benefitValue).toBe(95)
    })

    it('falls back when tier not found', () => {
      const auth = createTestAuth()
      // Don't set tier 4
      auth.copays.progressivePremiumTier4 = undefined as any

      const product = createTestProduct({
        eyemed: { progressiveTier: 'tier_4' },
      })

      const result = matchProductToAuth(product, auth)
      expect(result.matched).toBe(false)
      expect(result.fallbackUsed).toBe(true)
      expect(result.tier).toBe('fallback')
    })
  })

  describe('matchSingleVisionLens', () => {
    it('matches single vision lens', () => {
      const auth = createTestAuth()
      auth.copays.lensSv = 25

      const product = createTestProduct({
        category: 'lens_sv',
      })

      const result = matchSingleVisionLens(product, auth)
      expect(result.matched).toBe(true)
      expect(result.tier).toBe('single_vision')
      expect(result.benefitValue).toBe(25)
    })
  })

  describe('matchFrame', () => {
    it('matches frame to allowance', () => {
      const auth = createTestAuth()
      auth.copays.frameAllowance = 150

      const product = createTestProduct({
        category: 'frame',
      })

      const result = matchFrame(product, auth)
      expect(result.matched).toBe(true)
      expect(result.tier).toBe('frame_allowance')
      expect(result.benefitValue).toBe(150)
      expect(result.isFormula).toBe(true)
    })
  })
})

// =============================================================================
// PRICING ENGINE TESTS
// =============================================================================

describe('EyeMed Pricing Engine', () => {
  describe('validateEyemedAuthorization', () => {
    it('validates correct authorization', () => {
      const auth = createTestAuth()
      const result = validateEyemedAuthorization(auth)
      expect(result.valid).toBe(true)
      expect(result.errors.length).toBe(0)
    })

    it('detects missing fields', () => {
      const auth = createTestAuth()
      auth.copays = null as any
      const result = validateEyemedAuthorization(auth)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('calculateEyeMedPricing', () => {
    it('prices a single product', async () => {
      const auth = createTestAuth()
      auth.copays.progressivePremiumTier4 = 95

      const product = createTestProduct({
        retailPrice: 250,
        eyemed: { progressiveTier: 'tier_4' },
      })

      const result = await calculateEyeMedPricing(auth, [product], {
        customerId: 'cust-123',
      })

      expect(result.carrier).toBe('eyemed')
      expect(result.pricedProducts.length).toBe(1)
      expect(result.pricedProducts[0]?.patientCopay).toBe(95)
      expect(result.pricedProducts[0]?.insurancePays).toBe(155)
      expect(result.retailTotal).toBe(250)
    })

    it('prices multiple products', async () => {
      const auth = createTestAuth()
      auth.copays.progressivePremiumTier4 = 95
      auth.copays.lensSv = 25

      const products = [
        createTestProduct({
          sku: 'PROG-001',
          retailPrice: 250,
          eyemed: { progressiveTier: 'tier_4' },
        }),
        createTestProduct({
          sku: 'SV-001',
          category: 'lens_sv',
          retailPrice: 100,
          eyemed: undefined,
        }),
      ]

      const result = await calculateEyeMedPricing(auth, products)

      expect(result.pricedProducts.length).toBe(2)
      expect(result.retailTotal).toBe(350)
      expect(result.patientTotal).toBeGreaterThan(0)
      expect(result.insuranceTotal).toBeGreaterThan(0)
    })

    it('handles cash-only products', async () => {
      const auth = createTestAuth()

      const product = createTestProduct({
        retailPrice: 100,
        tags: ['cash-only'],
      })

      const result = await calculateEyeMedPricing(auth, [product])

      expect(result.pricedProducts[0]?.patientCopay).toBe(100)
      expect(result.pricedProducts[0]?.insurancePays).toBe(0)
      expect(result.pricedProducts[0]?.tierUsed).toBe('cash-only')
    })

    it('applies UV surcharge', async () => {
      const auth = createTestAuth()
      auth.copays.arPremiumTier3 = 65

      const product = createTestProduct({
        sku: 'AR-SAPPHIRE',
        displayName: 'Crizal Sapphire',
        category: 'ar_coating',
        retailPrice: 187,
        eyemed: { arTier: 'tier_3' },
      })

      const result = await calculateEyeMedPricing(auth, [product])

      // Patient should pay copay + surcharge
      // $65 copay + $15 surcharge = $80
      expect(result.pricedProducts[0]?.patientCopay).toBe(80)
    })
  })
})
