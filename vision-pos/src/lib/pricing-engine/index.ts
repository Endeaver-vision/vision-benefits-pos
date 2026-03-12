/**
 * Vision Pricing Engine
 *
 * Multi-carrier pricing engine for vision insurance benefits.
 * Currently supports: EyeMed
 * Coming soon: VSP, Spectera
 *
 * Usage:
 *   import { eyemed } from '@/lib/pricing-engine'
 *   const results = eyemed.calculateEyeMedPricing(benefits)
 *
 * Or import directly:
 *   import { calculateEyeMedPricing } from '@/lib/pricing-engine/eyemed'
 */

// EyeMed exports
import * as eyemed from './eyemed'
export { eyemed }

// Re-export commonly used EyeMed functions at top level
export {
  calculateEyeMedPricing,
  generatePatientPriceList,
  calculateSingleProduct,
  EYEMED_PRODUCTS,
  formatCurrency
} from './eyemed'

// Re-export types
export type {
  Product,
  ExtractedBenefits,
  PricingResult,
  PatientPriceList,
  ProductType
} from './eyemed'
