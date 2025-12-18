/**
 * Insurance Summary API
 * GET /api/customers/[id]/insurance-summary
 *
 * Returns copay and allowance information for display in the quote builder.
 * This is discrete summary info, not pricing data.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getActiveAuthorizationForCustomer } from '@/lib/services/authorization-service'
import {
  isVspAuth,
  isEyemedAuth,
  isSpecteraAuth,
  VspBenefitAuthorization,
  EyemedBenefitAuthorization,
  SpecteraBenefitAuthorization,
} from '@/types/benefit-authorization'

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
}

interface TierCopay {
  code: string
  description: string
  copay: number | null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: customerId } = await params

    const authResult = await getActiveAuthorizationForCustomer(customerId)

    if (!authResult) {
      return NextResponse.json({
        success: true,
        hasInsurance: false,
        summary: null,
      })
    }

    const { authorization, carrier, expirationDate } = authResult
    let summary: InsuranceSummary

    if (isVspAuth(authorization)) {
      summary = buildVspSummary(authorization, expirationDate)
    } else if (isEyemedAuth(authorization)) {
      summary = buildEyemedSummary(authorization, expirationDate)
    } else if (isSpecteraAuth(authorization)) {
      summary = buildSpecteraSummary(authorization, expirationDate)
    } else {
      return NextResponse.json({
        success: true,
        hasInsurance: false,
        summary: null,
      })
    }

    return NextResponse.json({
      success: true,
      hasInsurance: true,
      carrier,
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

function buildVspSummary(auth: VspBenefitAuthorization, expirationDate: Date | null): InsuranceSummary {
  const tierCopays: TierCopay[] = []

  // Progressive tier codes
  const progressiveCodes = [
    { code: 'NA', desc: 'Progressive N (Standard)' },
    { code: 'OA', desc: 'Progressive O' },
    { code: 'FA', desc: 'Progressive F (Premium)' },
    { code: 'JA', desc: 'Progressive J' },
    { code: 'KA', desc: 'Progressive K (Ultra)' },
  ]

  for (const prog of progressiveCodes) {
    const copay = auth.planTier?.progressiveCopays?.[prog.code]
    if (copay !== undefined) {
      tierCopays.push({ code: prog.code, description: prog.desc, copay })
    }
  }

  // AR coating codes
  const arCodes = [
    { code: 'QM', desc: 'AR Standard' },
    { code: 'QT', desc: 'AR Premium' },
    { code: 'QV', desc: 'AR Ultra' },
  ]

  for (const ar of arCodes) {
    const copay = auth.planTier?.arCopays?.[ar.code]
    if (copay !== undefined) {
      tierCopays.push({ code: ar.code, description: ar.desc, copay })
    }
  }

  // Material copays
  if (auth.planTier?.materialCopays) {
    const materials = [
      { code: 'AD', desc: 'Polycarbonate', key: 'polycarbonate' },
      { code: 'AB', desc: 'Trivex', key: 'trivex' },
      { code: 'AH', desc: 'High Index 1.67', key: 'highIndex167' },
      { code: 'AJ', desc: 'High Index 1.74', key: 'highIndex174' },
    ]
    for (const mat of materials) {
      const copay = auth.planTier.materialCopays[mat.key as keyof typeof auth.planTier.materialCopays]
      if (copay !== undefined && copay !== 'covered') {
        tierCopays.push({ code: mat.code, description: mat.desc, copay: copay as number })
      }
    }
  }

  // Enhancement copays
  if (auth.planTier?.enhancementCopays) {
    const enhancements = [
      { code: 'PR', desc: 'Photochromic', key: 'photochromic' },
      { code: 'DA', desc: 'Polarized', key: 'polarized' },
      { code: 'LF', desc: 'Blue Light Filter', key: 'blueLightFilter' },
    ]
    for (const enh of enhancements) {
      const copay = auth.planTier.enhancementCopays[enh.key as keyof typeof auth.planTier.enhancementCopays]
      if (copay !== undefined) {
        tierCopays.push({ code: enh.code, description: enh.desc, copay: copay as number })
      }
    }
  }

  return {
    carrier: 'VSP',
    planName: auth.plan.planName,
    copays: {
      exam: auth.copays.examWellvision ?? null,
      materials: auth.copays.materials ?? null,
      frameAllowance: auth.copays.frameAllowanceNonFeatured ?? null,
      contactAllowance: auth.copays.contactLensAllowance ?? null,
      contactFitting: auth.copays.contactLensExamCopay ?? null,
    },
    tierCopays,
    expirationDate: expirationDate?.toISOString().split('T')[0] ?? null,
  }
}

function buildEyemedSummary(auth: EyemedBenefitAuthorization, expirationDate: Date | null): InsuranceSummary {
  const tierCopays: TierCopay[] = []

  // Progressive tiers
  if (auth.copays.progressiveCopays) {
    const tiers = [
      { code: 'tier_1', desc: 'Progressive Tier 1' },
      { code: 'tier_2', desc: 'Progressive Tier 2' },
      { code: 'tier_3', desc: 'Progressive Tier 3' },
      { code: 'tier_4', desc: 'Progressive Tier 4' },
      { code: 'tier_5', desc: 'Progressive Tier 5' },
    ]
    for (const tier of tiers) {
      const copay = auth.copays.progressiveCopays[tier.code]
      if (copay !== undefined) {
        tierCopays.push({ code: tier.code, description: tier.desc, copay })
      }
    }
  }

  // AR tiers
  if (auth.copays.arCoatingCopays) {
    const arTiers = [
      { code: 'ar_tier_1', desc: 'AR Tier 1' },
      { code: 'ar_tier_2', desc: 'AR Tier 2' },
      { code: 'ar_tier_3', desc: 'AR Tier 3' },
    ]
    for (const tier of arTiers) {
      const copay = auth.copays.arCoatingCopays[tier.code]
      if (copay !== undefined) {
        tierCopays.push({ code: tier.code, description: tier.desc, copay })
      }
    }
  }

  // Material copays
  if (auth.copays.materialCopays) {
    const materials = [
      { code: 'poly', desc: 'Polycarbonate', key: 'polycarbonateAdult' },
      { code: 'trivex', desc: 'Trivex', key: 'trivex' },
      { code: 'hi167', desc: 'High Index 1.67', key: 'highIndex167' },
      { code: 'hi174', desc: 'High Index 1.74', key: 'highIndex174' },
    ]
    for (const mat of materials) {
      const copay = auth.copays.materialCopays[mat.key as keyof typeof auth.copays.materialCopays]
      if (copay !== undefined) {
        tierCopays.push({ code: mat.code, description: mat.desc, copay: copay as number })
      }
    }
  }

  return {
    carrier: 'EyeMed',
    planName: auth.plan.planName,
    copays: {
      exam: auth.copays.exam ?? null,
      materials: auth.copays.materials ?? null,
      frameAllowance: auth.copays.frameAllowance ?? null,
      contactAllowance: auth.copays.contactAllowance ?? null,
      contactFitting: auth.copays.clFitStandardCopay ?? null,
    },
    tierCopays,
    expirationDate: expirationDate?.toISOString().split('T')[0] ?? null,
  }
}

function buildSpecteraSummary(auth: SpecteraBenefitAuthorization, expirationDate: Date | null): InsuranceSummary {
  const tierCopays: TierCopay[] = []

  // Progressive tiers
  if (auth.copays.progressiveCopays) {
    const tiers = [
      { code: 'I', desc: 'Progressive Tier I' },
      { code: 'II', desc: 'Progressive Tier II' },
      { code: 'III', desc: 'Progressive Tier III' },
      { code: 'IV', desc: 'Progressive Tier IV' },
      { code: 'V', desc: 'Progressive Tier V' },
    ]
    for (const tier of tiers) {
      const copay = auth.copays.progressiveCopays[tier.code]
      if (copay !== undefined) {
        tierCopays.push({ code: tier.code, description: tier.desc, copay })
      }
    }
  }

  // AR tiers
  if (auth.copays.arCoatingCopays) {
    const arTiers = [
      { code: 'ar_I', desc: 'AR Tier I' },
      { code: 'ar_II', desc: 'AR Tier II' },
      { code: 'ar_III', desc: 'AR Tier III' },
    ]
    for (const tier of arTiers) {
      const copay = auth.copays.arCoatingCopays[tier.code]
      if (copay !== undefined) {
        tierCopays.push({ code: tier.code, description: tier.desc, copay })
      }
    }
  }

  // Material copays
  if (auth.copays.materialCopays) {
    const materials = [
      { code: 'poly', desc: 'Polycarbonate', key: 'polycarbonateAdult' },
      { code: 'trivex', desc: 'Trivex', key: 'trivex' },
      { code: 'hi174', desc: 'High Index 1.74', key: 'highIndex174' },
    ]
    for (const mat of materials) {
      const copay = auth.copays.materialCopays[mat.key as keyof typeof auth.copays.materialCopays]
      if (copay !== undefined) {
        tierCopays.push({ code: mat.code, description: mat.desc, copay: copay as number })
      }
    }
  }

  return {
    carrier: 'Spectera',
    planName: auth.plan.planName,
    copays: {
      exam: auth.copays.examAdult ?? null,
      materials: auth.copays.materials ?? null,
      frameAllowance: auth.copays.frameAllowance ?? null,
      contactAllowance: auth.copays.nonSelectionClAllowance ?? null,
      contactFitting: auth.copays.selectionClFitCopay ?? null,
    },
    tierCopays,
    expirationDate: expirationDate?.toISOString().split('T')[0] ?? null,
  }
}
