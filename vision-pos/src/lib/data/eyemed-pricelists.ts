/**
 * EyeMed Pricelists - Extracted directly from insurance PDFs
 * These are fallback/reference pricelists used for display and testing
 */

export interface PricedProduct {
  category: string
  productName: string
  tierEyemed: string
  benefit: string
  copay: number
  formula: string | null
  rulesApplied: string[]
  notes: string
}

export interface MemberPricelist {
  member: {
    name: string
    memberId: string
    dob: string
    age: number
    network: string
    group: string
    benefitLevel: number
    dateOfService: string
  }
  pricedProducts: PricedProduct[]
  summary: {
    totalProducts: number
    productsWithCopay: number
    productsWithFormula: number
    productsAtNoCost: number
    keyBenefits: Record<string, any>
    restrictions: string
  }
}

/**
 * Angela Clayton - Member ID: 20706244103
 * Extracted from: /Reference-Docs/Eyemed Only/EyeMed_AC_Benefits.pdf
 * Date: 10/20/2025
 */
export const ANGELA_CLAYTON_PRICELIST: MemberPricelist = {
  member: {
    name: 'ANGELA CLAYTON',
    memberId: '20706244103',
    dob: '02/15/1970',
    age: 54,
    network: 'Access 101 FF 360',
    group: 'SOUTHEASTERN FREIGHT LINES (9909425)',
    benefitLevel: 2,
    dateOfService: '10/20/2025',
  },
  pricedProducts: [
    // EXAM SERVICES
    {
      category: 'Exam',
      productName: 'Exam',
      tierEyemed: 'exam',
      benefit: '$0 copay',
      copay: 0,
      formula: null,
      rulesApplied: [],
      notes: 'Once every calendar year',
    },
    {
      category: 'Exam',
      productName: 'Retinal Imaging',
      tierEyemed: 'retinal_imaging',
      benefit: 'Up to $39',
      copay: 0,
      formula: 'Up to $39 allowance',
      rulesApplied: ['allowance_based'],
      notes: 'Allowance benefit',
    },
    // CONTACT LENS FIT AND FOLLOW-UP
    {
      category: 'Contact Lens Services',
      productName: 'Contact Lens Fit and Follow-up - Standard',
      tierEyemed: 'cl_fit_standard',
      benefit: '$0 copay',
      copay: 0,
      formula: null,
      rulesApplied: [],
      notes: 'Once every calendar year',
    },
    {
      category: 'Contact Lens Services',
      productName: 'Contact Lens Fit and Follow-up - Premium',
      tierEyemed: 'cl_fit_premium',
      benefit: '$0 copay; 10% off retail price less $55 allowance',
      copay: 0,
      formula: '10% off retail price less $55 allowance',
      rulesApplied: ['percentage_discount', 'allowance_based'],
      notes: 'Once every calendar year',
    },
    // FRAMES
    {
      category: 'Frame',
      productName: 'Frame',
      tierEyemed: 'frame',
      benefit: '$0 copay; 20% off balance over $180 allowance',
      copay: 0,
      formula: '20% off balance over $180 allowance',
      rulesApplied: ['percentage_discount', 'allowance_based'],
      notes: 'Once every 2 calendar years',
    },
    // LENSES - Per PDF structure
    {
      category: 'Lens',
      productName: 'Single Vision',
      tierEyemed: 'single_vision',
      benefit: '$25 copay',
      copay: 25,
      formula: null,
      rulesApplied: [],
      notes: 'Once every calendar year',
    },
    {
      category: 'Lens',
      productName: 'Bifocal',
      tierEyemed: 'bifocal',
      benefit: '$25 copay',
      copay: 25,
      formula: null,
      rulesApplied: [],
      notes: 'Once every calendar year',
    },
    {
      category: 'Lens',
      productName: 'Bifocal - Blended',
      tierEyemed: 'bifocal_blended',
      benefit: '20% off retail price',
      copay: 0,
      formula: '20% off retail price',
      rulesApplied: ['percentage_discount'],
      notes: 'Once every calendar year',
    },
    {
      category: 'Lens',
      productName: 'Trifocal',
      tierEyemed: 'trifocal',
      benefit: '$25 copay',
      copay: 25,
      formula: null,
      rulesApplied: [],
      notes: 'Once every calendar year',
    },
    {
      category: 'Lens',
      productName: 'Lenticular',
      tierEyemed: 'lenticular',
      benefit: '$25 copay',
      copay: 25,
      formula: null,
      rulesApplied: [],
      notes: 'Once every calendar year',
    },
    {
      category: 'Lens',
      productName: 'Progressive - Standard',
      tierEyemed: 'progressive_standard',
      benefit: '$25 copay',
      copay: 25,
      formula: null,
      rulesApplied: [],
      notes: 'Once every calendar year',
    },
    {
      category: 'Lens',
      productName: 'Progressive - Premium Tier 4',
      tierEyemed: 'progressive_premium_tier4',
      benefit: '$25 copay; 20% off retail price less $120 allowance',
      copay: 25,
      formula: '20% off retail price less $120 allowance',
      rulesApplied: ['percentage_discount', 'allowance_based'],
      notes: 'Once every calendar year',
    },
    {
      category: 'Lens',
      productName: 'Progressive - Premium',
      tierEyemed: 'progressive_premium',
      benefit: '$25 copay; 20% off retail price less $120 allowance',
      copay: 25,
      formula: '20% off retail price less $120 allowance',
      rulesApplied: ['percentage_discount', 'allowance_based'],
      notes: 'Once every calendar year',
    },
    // LENS OPTIONS / COATINGS / MATERIALS
    {
      category: 'Lens Option',
      productName: 'Anti Reflective Coating - Standard',
      tierEyemed: 'arc_standard',
      benefit: '$45',
      copay: 45,
      formula: null,
      rulesApplied: [],
      notes: 'Standard AR coating',
    },
    {
      category: 'Lens Option',
      productName: 'Anti Reflective Coating - Premium',
      tierEyemed: 'arc_premium',
      benefit: '20% off retail price',
      copay: 0,
      formula: '20% off retail price',
      rulesApplied: ['percentage_discount'],
      notes: 'Premium AR coating',
    },
    {
      category: 'Lens Option',
      productName: 'Polycarbonate - Standard - age 19 and over',
      tierEyemed: 'poly_standard_adult',
      benefit: '$40',
      copay: 40,
      formula: null,
      rulesApplied: ['age_based'],
      notes: 'For patients age 19 and over',
    },
    {
      category: 'Lens Option',
      productName: 'Polycarbonate - Standard - under age 19',
      tierEyemed: 'poly_standard_child',
      benefit: '$0 copay',
      copay: 0,
      formula: null,
      rulesApplied: ['age_based'],
      notes: 'For patients under age 19',
    },
    {
      category: 'Lens Option',
      productName: 'Scratch Coating - Standard Plastic',
      tierEyemed: 'scratch_coating',
      benefit: '$15',
      copay: 15,
      formula: null,
      rulesApplied: [],
      notes: 'Standard scratch resistant coating',
    },
    {
      category: 'Lens Option',
      productName: 'Tint - Solid and Gradient',
      tierEyemed: 'tint',
      benefit: '$15',
      copay: 15,
      formula: null,
      rulesApplied: [],
      notes: 'Solid and gradient tints',
    },
    {
      category: 'Lens Option',
      productName: 'UV Treatment',
      tierEyemed: 'uv_treatment',
      benefit: '$15',
      copay: 15,
      formula: null,
      rulesApplied: [],
      notes: 'UV protection treatment',
    },
    {
      category: 'Lens Option',
      productName: 'All Other Lens Options',
      tierEyemed: 'other_options',
      benefit: '20% off retail price',
      copay: 0,
      formula: '20% off retail price',
      rulesApplied: ['percentage_discount'],
      notes: 'Fallback for unlisted lens options',
    },
    // CONTACT LENSES
    {
      category: 'Contact Lens',
      productName: 'Contacts - Conventional',
      tierEyemed: 'contacts_conventional',
      benefit: '$0 copay; 15% off balance over $130 allowance',
      copay: 0,
      formula: '15% off balance over $130 allowance',
      rulesApplied: ['percentage_discount', 'allowance_based'],
      notes: 'Once every calendar year',
    },
    {
      category: 'Contact Lens',
      productName: 'Contacts - Disposable',
      tierEyemed: 'contacts_disposable',
      benefit: '$0 copay; 100% of balance over $130 allowance',
      copay: 0,
      formula: '100% of balance over $130 allowance',
      rulesApplied: ['full_coverage', 'allowance_based'],
      notes: 'Once every calendar year',
    },
    {
      category: 'Contact Lens',
      productName: 'Contacts - Medically Necessary',
      tierEyemed: 'contacts_medical',
      benefit: '$0 copay',
      copay: 0,
      formula: null,
      rulesApplied: [],
      notes: 'Once every calendar year',
    },
  ],
  summary: {
    totalProducts: 24,
    productsWithCopay: 11,
    productsWithFormula: 6,
    productsAtNoCost: 7,
    keyBenefits: {
      examCopay: 0,
      singleVisionLensCopay: 25,
      bifocalLensCopay: 25,
      progressiveLensCopay: 25,
      frameBenefit: '$0 copay + 20% off over $180',
      contactLensCopay: 0,
    },
    restrictions:
      'Plan allows member to receive EITHER contacts and frame, OR frame and lens services (not both in same visit)',
  },
}

/**
 * Lookup pricelist by member ID
 */
export function getPricelistByMemberId(memberId: string): MemberPricelist | null {
  const pricelists: Record<string, MemberPricelist> = {
    '20706244103': ANGELA_CLAYTON_PRICELIST,
  }
  return pricelists[memberId] || null
}
