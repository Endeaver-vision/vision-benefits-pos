/**
 * Save EyeMed Price List API
 * POST /api/eyemed/save-price-list
 *
 * Saves an EyeMed price list to the database as a new version
 */

import { NextRequest, NextResponse } from 'next/server'
import { createPriceListVersion, type PriceItem } from '@/lib/services/price-list-version-service'

/**
 * Map EyeMed product names to our product catalog IDs
 * This ensures price lists use IDs that match the POS product catalog
 */
const EYEMED_NAME_TO_PRODUCT_ID: Record<string, string> = {
  // Exam Services
  'Routine Vision Exam': 'routine-exam',
  'Medical Exam': 'medical-exam',

  // Exam Add-ons (diagnostics)
  'Optomap': 'optomap',
  'iWellness': 'iwellness',
  'OCT Retina/ON': 'oct-retina',
  'Visual Field': 'visual-field',
  'External Photos': 'external-photos',
  'Neuro HA Screen': 'neuro-ha-screen',
  'Corneal Thickness': 'corneal-thickness',
  'Myopia Atropine Exam Consult & Follow Up': 'myopia-atropine',

  // Contact Lens Fittings
  'Sphere': 'cl-sphere',
  'Toric': 'cl-toric',
  'Multifocal Soft Lens': 'cl-multifocal',
  'Monovision': 'cl-monovision',
  'RGP': 'cl-rgp',
  'Specialty CL': 'cl-specialty',
  'Ortho-K': 'cl-orthok',
  'MiSight Fitting': 'cl-misight',

  // Lens Types
  'Single Vision': 'sv',
  'Eyezen': 'eyezen',
  'FT Bifocal': 'bifocal',
  'FT Trifocal': 'trifocal',
  'Varilux Comfort DRx': 'comfortDRx',
  'Varilux Comfort Max': 'comfortMax',
  'Varilux X': 'variluxX',
  'Stellest': 'stellest',
  'Neurolens SV': 'neurolens_sv',
  'Neurolens Progressive': 'neurolens_pal',
  'Varilux i': 'varilux-i',
  'Sequel Single Vision': 'sequal-sv',
  'Sequel Progressive': 'sequal',

  // Lens Materials
  'CR-39 (base)': 'cr39',
  'Polycarbonate': 'poly',
  '1.67 High Index': 'hiIndex167',
  '1.72 Ultra High Index': 'ultraHi172',
  'Trivex': 'trivex',

  // AR Coatings
  'Crizal EZ Pro': 'crizalEZPro',
  'Crizal SunShield': 'crizalSunShield',
  'Crizal Sapphire': 'crizalSapphire',
  'Crizal Rock': 'crizalRock',
  'Neurolens Premium AR': 'neurolens_premium',
  'Neurolens Blue AR': 'neurolens_blue',

  // Photochromics
  'Transitions Gen S': 'genS',
  'Transitions XtraActive': 'xtraActive',

  // Polarized
  'Polarized': 'polarized',

  // Mount Fees
  'Full Rim': 'fullRim',
  'Semi-Rimless': 'semiRimless',
  'Rimless': 'rimless',

  // Lens Add-ons
  'UV Coating': 'uv',
  'Tint': 'tint',
  'Mirror': 'mirror',
  'Oversize Lenses (61mm+)': 'oversize',
  'Tech Add-on Single Vision': 'tech-addon-sv',
  'Tech Add-on Multifocal': 'tech-addon-mf',
  'Prism Per Diopter': 'prism',
  'Essential Blue': 'essBlue',
  'Roll and Polish': 'rollPolish',
}

interface EyeMedSavePriceListRequest {
  customerId: string
  authorizationId?: string
  planName?: string
  extractedBenefits: Record<string, unknown>
  pricedProducts: Array<{
    category: string
    name: string
    retail: number
    patientCost: number
    type?: string
    note?: string
  }>
  createdBy?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as EyeMedSavePriceListRequest

    const {
      customerId,
      authorizationId,
      planName,
      extractedBenefits,
      pricedProducts,
      createdBy
    } = body

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'customerId is required' },
        { status: 400 }
      )
    }

    if (!pricedProducts || pricedProducts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'pricedProducts is required' },
        { status: 400 }
      )
    }

    // Convert EyeMed products to standard price items using mapped product IDs
    const priceItems: PriceItem[] = pricedProducts.map((product) => {
      // Use mapped product ID if available, otherwise generate a fallback ID
      const productId = EYEMED_NAME_TO_PRODUCT_ID[product.name] ??
        `eyemed-${product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

      return {
        productId,
        productName: product.name,
        section: product.category,
        retailPrice: product.retail,
        finalPrice: product.patientCost,
        notes: product.note ? [product.note] : [],
        isCashOnly: product.note?.toLowerCase().includes('cash') ?? false,
        isNotCovered: product.note?.toLowerCase().includes('not covered') ?? false
      }
    })

    // Group products by category for priceListData
    const priceListData: Record<string, typeof pricedProducts> = {}
    for (const product of pricedProducts) {
      if (!priceListData[product.category]) {
        priceListData[product.category] = []
      }
      priceListData[product.category].push(product)
    }

    const result = await createPriceListVersion({
      customerId,
      carrier: 'EyeMed',
      authorizationId,
      planName,
      lensMatrixData: null,
      extractedData: extractedBenefits,
      priceListData,
      priceItems,
      createdBy
    })

    return NextResponse.json({
      success: true,
      version: result.version,
      itemsCreated: result.itemsCreated,
      message: `Price list saved as ${result.version.versionLabel}`
    })
  } catch (error) {
    console.error('Error saving EyeMed price list:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : ''
    console.error('Error details:', errorMessage, errorStack)
    return NextResponse.json(
      { success: false, error: 'Failed to save price list', details: errorMessage },
      { status: 500 }
    )
  }
}
