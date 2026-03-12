/**
 * EyeMed Master Pricing Map
 *
 * ONE FILE that combines:
 * - Product catalog (retail prices)
 * - Formulary (product-to-tier mapping)
 * - Rosetta stone (insurance terminology)
 *
 * Structure: Insurance Term → Products with Retail Prices
 *
 * When you see "Progressive - Premium Tier 4" on an auth PDF,
 * look it up here to find all products and their retail prices.
 */

export interface Product {
  name: string
  retail: number
  uvSurcharge?: boolean  // Add $15 for Crizal backside UV
  cashOnly?: boolean     // No insurance pricing
  ageRule?: 'freeUnder19' // Special age-based pricing
}

export interface InsuranceTerm {
  /** What to match against in the auth PDF */
  match: string[]
  /** Products that fall under this insurance term */
  products: Product[]
  /** Observed copay ranges from real auths */
  observedRange?: string
  /** Notes about this term */
  notes?: string
}

export interface Category {
  [term: string]: InsuranceTerm
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAM SERVICES
// ═══════════════════════════════════════════════════════════════════════════

export const EXAM: Category = {
  'Exam': {
    match: ['Exam', 'Eye Exam'],
    products: [
      { name: 'Routine Vision Exam', retail: 100 }
    ],
    observedRange: '$0-$20'
  },
  'Retinal Imaging': {
    match: ['Retinal Imaging'],
    products: [
      { name: 'Optomap', retail: 39 }
    ],
    observedRange: 'Up to $39'
  },
  'Medical Exam': {
    match: ['Medical'],
    products: [
      { name: 'Medical Exam', retail: 100, cashOnly: true }
    ],
    notes: 'Billed to medical insurance, not vision'
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAM ADD-ONS (mostly cash or medical billing)
// ═══════════════════════════════════════════════════════════════════════════

export const EXAM_ADDONS: Category = {
  'Cash Only Add-Ons': {
    match: [],
    products: [
      { name: 'iWellness', retail: 19, cashOnly: true },
      { name: 'Neuro HA Screen', retail: 89, cashOnly: true },
      { name: 'Myopia Atropine Exam Consult & Follow Up', retail: 350, cashOnly: true }
    ],
    notes: 'Not covered by vision insurance'
  },
  'Medical Billing Add-Ons': {
    match: [],
    products: [
      { name: 'OCT Retina/ON', retail: 39, cashOnly: true },
      { name: 'Visual Field', retail: 39, cashOnly: true },
      { name: 'External Photos', retail: 29, cashOnly: true },
      { name: 'Corneal Thickness', retail: 29, cashOnly: true }
    ],
    notes: 'Billed to medical insurance'
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTACT LENS FITTING
// ═══════════════════════════════════════════════════════════════════════════

export const CONTACT_LENS_FITTING: Category = {
  'Fit and Follow-up - Standard': {
    match: [
      'Fit and Follow-up - Standard',
      'Contact Lens Fit and Follow-up',
      'Contact Lens Fit and Follow',
      'Contact Lens Fit and Follow-Up'
    ],
    products: [
      { name: 'Sphere', retail: 75 },
      { name: 'Toric', retail: 100 },
      { name: 'Monovision', retail: 120 }
    ],
    observedRange: '$0-$55'
  },
  'Fit and Follow-up - Premium': {
    match: ['Fit and Follow-up - Premium'],
    products: [
      { name: 'Multifocal Soft Lens', retail: 150 }
    ],
    notes: 'Can be discount-based: 10% off retail'
  },
  'Specialty Contact Lens Fitting': {
    match: [],
    products: [
      { name: 'RGP', retail: 350, cashOnly: true },
      { name: 'Specialty CL', retail: 850, cashOnly: true },
      { name: 'Ortho-K', retail: 2200, cashOnly: true },
      { name: 'MiSight Fitting', retail: 1250, cashOnly: true }
    ],
    notes: 'Specialty fittings usually not covered'
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LENS TYPES - SINGLE VISION, BIFOCAL, TRIFOCAL
// ═══════════════════════════════════════════════════════════════════════════

export const LENS_TYPES: Category = {
  'Single Vision': {
    match: ['Single Vision'],
    products: [
      { name: 'Single Vision', retail: 96 }
    ],
    observedRange: '$10-$55'
  },
  'Eyezen': {
    match: ['Single Vision'],  // Eyezen is premium SV, uses SV copay
    products: [
      { name: 'Eyezen', retail: 144 }
    ],
    notes: 'Premium single vision, priced as SV'
  },
  'Bifocal': {
    match: ['Bifocal'],
    products: [
      { name: 'FT Bifocal', retail: 182 }
    ],
    observedRange: '$10-$75'
  },
  'Trifocal': {
    match: ['Trifocal'],
    products: [
      { name: 'FT Trifocal', retail: 155 }
    ],
    observedRange: '$10-$105'
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PROGRESSIVES
// The big one - maps insurance tiers to actual products
// ═══════════════════════════════════════════════════════════════════════════

export const PROGRESSIVES: Category = {
  'Progressive - Standard': {
    match: ['Progressive - Standard', 'Standard Progressives'],
    products: [
      // We don't currently sell standard progressives
    ],
    observedRange: '$0-$135',
    notes: 'Entry-level progressive'
  },

  'Progressive - Premium Tier 1': {
    match: ['Progressive - Premium Tier 1', 'Premium Tier 1', 'Tier 1'],
    products: [
      // We don't currently sell tier 1 progressives
    ],
    observedRange: '$30-$110'
  },

  'Progressive - Premium Tier 2': {
    match: ['Progressive - Premium Tier 2'],
    products: [
      // We don't currently sell tier 2 progressives
    ],
    observedRange: '$40-$115'
  },

  'Progressive - Premium Tier 3': {
    match: ['Progressive - Premium Tier 3'],
    products: [
      { name: 'Varilux Comfort DRx', retail: 280 }
    ],
    observedRange: '$55-$145'
  },

  'Progressive - Premium Tier 4': {
    match: [
      'Progressive - Premium Tier 4',
      'Progressive - Premium',  // Same pricing as Tier 4
      'Progressive - Premium Tier 4 - age 19 and over',
      'Progressive - Premium Tier 4 - under age 19'
    ],
    products: [
      { name: 'Varilux Comfort Max', retail: 409 },
      { name: 'Varilux X', retail: 615 }
      // Note: Varilux X is often called "Tier 5" but EyeMed
      // doesn't have Tier 5 on auth PDFs - it uses Tier 4 pricing
    ],
    observedRange: '$15-$185 or formula',
    notes: 'Highest tier. Can be copay OR formula: "$25; 20% off over $120"'
  },

  'Cash Only Progressives': {
    match: [],
    products: [
      { name: 'Neurolens SV', retail: 400, cashOnly: true },
      { name: 'Neurolens Progressive', retail: 700, cashOnly: true },
      { name: 'Varilux i', retail: 480, cashOnly: true },
      { name: 'Stellest', retail: 500, cashOnly: true },
      { name: 'Sequel Single Vision', retail: 350, cashOnly: true },
      { name: 'Sequel Progressive', retail: 536, cashOnly: true }
    ],
    notes: 'Not covered by EyeMed'
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LENS MATERIALS
// ═══════════════════════════════════════════════════════════════════════════

export const LENS_MATERIALS: Category = {
  'Polycarbonate - Standard': {
    match: [
      'Polycarbonate - Standard',
      'Polycarbonate - Standard - age 19 and over',
      'Polycarbonate - Standard - under age 19'
    ],
    products: [
      { name: 'Polycarbonate', retail: 65, ageRule: 'freeUnder19' }
    ],
    observedRange: '$0-$40',
    notes: 'FREE for patients under 19'
  },

  'High Index': {
    match: ['High Index', '1.67', '1.74'],
    products: [
      { name: '1.67 High Index', retail: 130 },
      { name: '1.72 Ultra High Index', retail: 150 }
    ],
    observedRange: '$55-$95 or 20% off retail'
  },

  'Trivex': {
    match: ['Trivex'],
    products: [
      { name: 'Trivex', retail: 75 }
    ],
    notes: 'Rare in EyeMed docs, check auth'
  },

  'Standard Plastic': {
    match: [],
    products: [
      { name: 'CR-39 (base)', retail: 0 }
    ],
    notes: 'Included - no charge'
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AR COATINGS
// ═══════════════════════════════════════════════════════════════════════════

export const AR_COATINGS: Category = {
  'Anti-Reflective Coating - Standard': {
    match: [
      'Anti Reflective Coating - Standard',
      'Anti-Reflective Coating - Standard'
    ],
    products: [
      // We don't sell standard AR
    ],
    observedRange: '$0-$45'
  },

  'Anti-Reflective Coating - Premium Tier 1': {
    match: ['Anti Reflective Coating - Premium Tier 1'],
    products: [
      // We don't sell tier 1 AR
    ],
    observedRange: '$0-$57'
  },

  'Anti-Reflective Coating - Premium Tier 2': {
    match: [
      'Anti Reflective Coating - Premium Tier 2',
      'Anti Reflective Coating - Premium'  // Non-tiered premium often = Tier 2
    ],
    products: [
      { name: 'Crizal EZ Pro', retail: 148, uvSurcharge: true },
      { name: 'Crizal SunShield', retail: 180, uvSurcharge: true }
    ],
    observedRange: '$23-$85 or 20% off retail'
  },

  'Anti-Reflective Coating - Premium Tier 3': {
    match: ['Anti Reflective Coating - Premium Tier 3'],
    products: [
      { name: 'Crizal Sapphire', retail: 187, uvSurcharge: true },
      { name: 'Crizal Rock', retail: 158, uvSurcharge: true }
    ],
    observedRange: '$85-$105 or 20% off retail',
    notes: 'Crizal products require $15 UV surcharge'
  },

  'Cash Only AR': {
    match: [],
    products: [
      { name: 'Neurolens Premium AR', retail: 180, cashOnly: true },
      { name: 'Neurolens Blue AR', retail: 180, cashOnly: true }
    ],
    notes: 'Not covered by EyeMed'
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PHOTOCHROMIC / TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════════

export const PHOTOCHROMIC: Category = {
  'Photochromic - Non-Glass': {
    match: [
      'Photochromic - Non-Glass',
      'Photochromic - Non-Glass - age 19 and over',
      'Photochromic - Non-Glass - under age 19',
      'Photochromic'
    ],
    products: [
      { name: 'Transitions Gen S', retail: 160 },
      { name: 'Transitions XtraActive', retail: 160 }
    ],
    observedRange: '$0-$88',
    notes: 'May be free for under 19'
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POLARIZED
// ═══════════════════════════════════════════════════════════════════════════

export const POLARIZED: Category = {
  'Polarized': {
    match: ['Polarized'],
    products: [
      { name: 'Polarized', retail: 180 }
    ],
    observedRange: '$66-$75 or 20% off retail'
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LENS ADD-ONS
// ═══════════════════════════════════════════════════════════════════════════

export const LENS_ADDONS: Category = {
  'UV Treatment': {
    match: ['UV Treatment'],
    products: [
      { name: 'UV Coating', retail: 16 }
    ],
    observedRange: '$0-$15'
  },

  'Tint - Solid and Gradient': {
    match: ['Tint - Solid and Gradient', 'Tint'],
    products: [
      { name: 'Tint', retail: 30 }
    ],
    observedRange: '$0-$15'
  },

  'Oversize Lens': {
    match: ['Oversize Lens'],
    products: [
      { name: 'Oversize Lenses (61mm+)', retail: 30 }
    ],
    observedRange: '$0-$14'
  },

  'All Other Lens Options': {
    match: ['All Other Lens Options'],
    products: [
      { name: 'Mirror', retail: 55 },
      { name: 'Tech Add-on Single Vision', retail: 10 },
      { name: 'Tech Add-on Multifocal', retail: 40 },
      { name: 'Prism Per Diopter', retail: 15 },
      { name: 'Essential Blue', retail: 40 },
      { name: 'Roll and Polish', retail: 30 }
    ],
    notes: '20% off retail for unlisted options'
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MOUNT FEES (not insurance terms, but included for completeness)
// ═══════════════════════════════════════════════════════════════════════════

export const MOUNT_FEES: Category = {
  'Mount Fee': {
    match: [],
    products: [
      { name: 'Full Rim', retail: 0 },
      { name: 'Semi-Rimless', retail: 35 },
      { name: 'Rimless', retail: 45 }
    ],
    notes: 'Patient pays full amount'
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MASTER MAP - All categories combined
// ═══════════════════════════════════════════════════════════════════════════

export const EYEMED_MASTER_MAP = {
  exam: EXAM,
  examAddons: EXAM_ADDONS,
  contactLensFitting: CONTACT_LENS_FITTING,
  lensTypes: LENS_TYPES,
  progressives: PROGRESSIVES,
  lensMaterials: LENS_MATERIALS,
  arCoatings: AR_COATINGS,
  photochromic: PHOTOCHROMIC,
  polarized: POLARIZED,
  lensAddons: LENS_ADDONS,
  mountFees: MOUNT_FEES
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Find products by insurance term
 * Searches all categories for a matching term
 */
export function findByInsuranceTerm(term: string): { category: string; entry: InsuranceTerm } | null {
  const normalizedTerm = term.toLowerCase().trim()

  for (const [categoryName, category] of Object.entries(EYEMED_MASTER_MAP)) {
    for (const [termName, entry] of Object.entries(category)) {
      // Check if the term matches any of the match patterns
      const matches = entry.match.some(m =>
        normalizedTerm.includes(m.toLowerCase()) ||
        m.toLowerCase().includes(normalizedTerm)
      )
      if (matches) {
        return { category: categoryName, entry }
      }
    }
  }
  return null
}

/**
 * Find a specific product and get its insurance term
 */
export function findProduct(productName: string): {
  category: string
  insuranceTerm: string
  product: Product
} | null {
  const normalizedName = productName.toLowerCase().trim()

  for (const [categoryName, category] of Object.entries(EYEMED_MASTER_MAP)) {
    for (const [termName, entry] of Object.entries(category)) {
      const product = entry.products.find(p =>
        p.name.toLowerCase() === normalizedName
      )
      if (product) {
        return {
          category: categoryName,
          insuranceTerm: termName,
          product
        }
      }
    }
  }
  return null
}

/**
 * Get all products in a category
 */
export function getProductsByCategory(categoryName: keyof typeof EYEMED_MASTER_MAP): Product[] {
  const category = EYEMED_MASTER_MAP[categoryName]
  if (!category) return []

  const products: Product[] = []
  for (const entry of Object.values(category)) {
    products.push(...entry.products)
  }
  return products
}
