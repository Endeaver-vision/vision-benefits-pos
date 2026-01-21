/**
 * Insurance Summary API
 * GET /api/customers/[id]/insurance-summary
 *
 * Returns copay and allowance information for display in the quote builder.
 * This is discrete summary info, not pricing data.
 *
 * Uses the unified insurance_authorizations table directly.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface InsuranceSummary {
  carrier: string
  planName: string
  copays: {
    exam: number | null
    materials: number | null
    frameAllowance: number | null
    contactAllowance: number | null
    contactFitting: number | null
  }
  tierCopays: TierCopay[]
  expirationDate: string | null
  // Declining balance support
  benefitStructure: 'COPAY_ALLOWANCE' | 'DECLINING_BALANCE'
  decliningBalance?: {
    totalAllowance: number | null
    appliesTo: string[]
    overageDiscounts: {
      frameLensPackage: number
      contactsConventional: number
      contactsDisposable: number
    }
    eitherOrRestriction: boolean
  }
}

interface TierCopay {
  code: string
  description: string
  copay: number | null
}

// Type for the copays JSON structure in insurance_authorizations
interface CopaysJson {
  examCopay?: number
  materialsCopay?: number
  singleVision?: number
  bifocal?: number
  trifocal?: number
  progressiveStandard?: number
  progressiveTier1?: number
  progressiveTier2?: number
  progressiveTier3?: number
  progressiveTier4?: number
  progressiveTier5?: number
  arStandard?: number
  arTier1?: number
  arTier2?: number
  arTier3?: number
  polycarbonate?: number
  polycarbonateChild?: number
  trivex?: number
  highIndex167?: number
  highIndex174?: number
  photochromic?: number
  polarized?: number
  blueLight?: number
  tint?: number
  uvTreatment?: number
  scratchCoating?: number
  [key: string]: number | undefined
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: customerId } = await params

    // Query the unified insurance_authorizations table directly
    const authorization = await prisma.insuranceAuthorization.findFirst({
      where: {
        customerId,
        isActive: true
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!authorization) {
      return NextResponse.json({
        success: true,
        hasInsurance: false,
        summary: null,
      })
    }

    const carrier = authorization.carrier.toUpperCase()
    const copays = (authorization.copays as CopaysJson) || {}

    // Build tier copays array based on carrier
    const tierCopays: TierCopay[] = []

    // Build tier copays based on what's in the JSON
    if (carrier === 'EYEMED') {
      // Progressive tiers
      const progressiveTiers = [
        { code: 'standard', key: 'progressiveStandard', desc: 'Standard Progressive' },
        { code: 'tier_1', key: 'progressiveTier1', desc: 'Tier 1 Progressive' },
        { code: 'tier_2', key: 'progressiveTier2', desc: 'Tier 2 Progressive' },
        { code: 'tier_3', key: 'progressiveTier3', desc: 'Tier 3 Progressive' },
        { code: 'tier_4', key: 'progressiveTier4', desc: 'Tier 4 Progressive' },
        { code: 'tier_5', key: 'progressiveTier5', desc: 'Premium Progressive' },
      ]
      for (const tier of progressiveTiers) {
        const value = copays[tier.key]
        if (value !== null && value !== undefined) {
          tierCopays.push({
            code: tier.code,
            description: tier.desc,
            copay: value,
          })
        }
      }

      // AR tiers
      const arTiers = [
        { code: 'ar_standard', key: 'arStandard', desc: 'Standard AR' },
        { code: 'ar_tier_1', key: 'arTier1', desc: 'Tier 1 AR' },
        { code: 'ar_tier_2', key: 'arTier2', desc: 'Tier 2 AR' },
        { code: 'ar_tier_3', key: 'arTier3', desc: 'Tier 3 AR' },
      ]
      for (const tier of arTiers) {
        const value = copays[tier.key]
        if (value !== null && value !== undefined) {
          tierCopays.push({
            code: tier.code,
            description: tier.desc,
            copay: value,
          })
        }
      }

      // Lens types
      const lensTypes = [
        { code: 'sv', key: 'singleVision', desc: 'Single Vision' },
        { code: 'bifocal', key: 'bifocal', desc: 'Bifocal' },
        { code: 'trifocal', key: 'trifocal', desc: 'Trifocal' },
      ]
      for (const lens of lensTypes) {
        const value = copays[lens.key]
        if (value !== null && value !== undefined) {
          tierCopays.push({ code: lens.code, description: lens.desc, copay: value })
        }
      }

      // Materials
      const materials = [
        { code: 'poly', key: 'polycarbonate', desc: 'Polycarbonate' },
        { code: 'trivex', key: 'trivex', desc: 'Trivex' },
        { code: 'hi167', key: 'highIndex167', desc: 'High Index 1.67' },
        { code: 'hi174', key: 'highIndex174', desc: 'High Index 1.74' },
      ]
      for (const mat of materials) {
        const value = copays[mat.key]
        if (value !== null && value !== undefined) {
          tierCopays.push({ code: mat.code, description: mat.desc, copay: value })
        }
      }

      // Enhancements
      const enhancements = [
        { code: 'photo', key: 'photochromic', desc: 'Photochromic' },
        { code: 'polarized', key: 'polarized', desc: 'Polarized' },
        { code: 'blue', key: 'blueLight', desc: 'Blue Light Filter' },
        { code: 'tint', key: 'tint', desc: 'Tint' },
      ]
      for (const enh of enhancements) {
        const value = copays[enh.key]
        if (value !== null && value !== undefined) {
          tierCopays.push({ code: enh.code, description: enh.desc, copay: value })
        }
      }
    } else if (carrier === 'VSP') {
      // VSP uses code-based system - check copays object for codes
      const vspProgressives = [
        { code: 'NA', desc: 'Standard Progressive' },
        { code: 'OA', desc: 'Tier O Progressive' },
        { code: 'FA', desc: 'Premium Progressive' },
        { code: 'JA', desc: 'Tier J Progressive' },
        { code: 'KA', desc: 'Ultra Progressive' },
      ]
      for (const prog of vspProgressives) {
        const value = copays[prog.code] ?? copays[prog.code.toLowerCase()]
        if (value !== undefined) {
          tierCopays.push({
            code: prog.code,
            description: prog.desc,
            copay: value,
          })
        }
      }

      const vspAr = [
        { code: 'QM', desc: 'Standard AR' },
        { code: 'QT', desc: 'Premium AR' },
        { code: 'QV', desc: 'Ultra AR' },
      ]
      for (const ar of vspAr) {
        const value = copays[ar.code] ?? copays[ar.code.toLowerCase()]
        if (value !== undefined) {
          tierCopays.push({
            code: ar.code,
            description: ar.desc,
            copay: value,
          })
        }
      }
    } else if (carrier === 'SPECTERA') {
      // Spectera uses Roman numerals
      const specteraProgressives = [
        { code: 'I', key: 'progressiveTierI', desc: 'Standard Progressive' },
        { code: 'II', key: 'progressiveTierII', desc: 'Tier II Progressive' },
        { code: 'III', key: 'progressiveTierIII', desc: 'Tier III Progressive' },
        { code: 'IV', key: 'progressiveTierIV', desc: 'Tier IV Progressive' },
        { code: 'V', key: 'progressiveTierV', desc: 'Premium Progressive' },
      ]
      for (const prog of specteraProgressives) {
        const value = copays[prog.key]
        if (value !== undefined) {
          tierCopays.push({
            code: prog.code,
            description: prog.desc,
            copay: value,
          })
        }
      }
    }

    // Determine benefit structure
    const benefitStructure = (authorization.benefitStructure as 'COPAY_ALLOWANCE' | 'DECLINING_BALANCE') || 'COPAY_ALLOWANCE'
    const isDecliningBalance = benefitStructure === 'DECLINING_BALANCE'

    const summary: InsuranceSummary = {
      carrier: authorization.carrier,
      planName: authorization.planName || 'Unknown Plan',
      copays: {
        exam: authorization.examCopay ? Number(authorization.examCopay) : (copays.examCopay ?? null),
        materials: isDecliningBalance ? 0 : (authorization.materialsCopay ? Number(authorization.materialsCopay) : (copays.materialsCopay ?? null)),
        frameAllowance: authorization.frameAllowance ? Number(authorization.frameAllowance) : null,
        contactAllowance: authorization.contactAllowance ? Number(authorization.contactAllowance) : null,
        contactFitting: null, // Not stored in unified table currently
      },
      tierCopays: isDecliningBalance ? [] : tierCopays, // No tier copays for declining balance plans
      expirationDate: authorization.expirationDate?.toISOString().split('T')[0] ?? null,
      benefitStructure,
      // Include declining balance details if applicable
      decliningBalance: isDecliningBalance ? {
        totalAllowance: authorization.totalMaterialsAllowance ? Number(authorization.totalMaterialsAllowance) : null,
        appliesTo: authorization.decliningBalanceAppliesTo || ['frame', 'lens', 'lensOptions', 'contacts'],
        overageDiscounts: {
          frameLensPackage: authorization.overageDiscountFrame ? Number(authorization.overageDiscountFrame) : 20,
          contactsConventional: authorization.overageDiscountContactConv ? Number(authorization.overageDiscountContactConv) : 15,
          contactsDisposable: authorization.overageDiscountContactDisp ? Number(authorization.overageDiscountContactDisp) : 0,
        },
        eitherOrRestriction: authorization.eitherOrRestriction ?? true,
      } : undefined,
    }

    return NextResponse.json({
      success: true,
      hasInsurance: true,
      carrier: authorization.carrier.toLowerCase(),
      summary,
    })
  } catch (error) {
    console.error('[Insurance Summary API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch insurance summary' },
      { status: 500 }
    )
  }
}
