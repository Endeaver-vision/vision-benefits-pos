/**
 * Formulary Service
 *
 * Provides lookup functions for carrier-specific formulary data
 * (progressives, AR coatings, and their tier mappings)
 */

import { prisma } from '@/lib/prisma'

export interface FormularyItem {
  productId: string
  brand: string
  productName: string
  tier: string
  type: 'progressive' | 'ar_coating'
}

export interface FormularyData {
  progressives: FormularyItem[]
  arCoatings: FormularyItem[]
}

/**
 * Get all formulary products for a carrier
 */
export async function getFormularyByCarrier(carrier: string): Promise<FormularyData> {
  const progressives: FormularyItem[] = []
  const arCoatings: FormularyItem[] = []

  try {
    if (carrier === 'VSP') {
      const progs = await prisma.vspProgressiveFormulary.findMany()
      progressives.push(
        ...progs.map((p) => ({
          productId: p.productId,
          brand: p.brand,
          productName: p.productName,
          tier: p.tier,
          type: 'progressive' as const,
        }))
      )

      const ars = await prisma.vspArCoatingFormulary.findMany()
      arCoatings.push(
        ...ars.map((a) => ({
          productId: a.productId,
          brand: a.brand,
          productName: a.productName,
          tier: a.vspTier,
          type: 'ar_coating' as const,
        }))
      )
    } else if (carrier === 'EyeMed') {
      const progs = await prisma.eyemedProgressiveFormulary.findMany()
      progressives.push(
        ...progs.map((p) => ({
          productId: p.productId,
          brand: p.brand,
          productName: p.productName,
          tier: p.tier,
          type: 'progressive' as const,
        }))
      )

      const ars = await prisma.eyemedArCoatingFormulary.findMany()
      arCoatings.push(
        ...ars.map((a) => ({
          productId: a.productId,
          brand: a.brand,
          productName: a.productName,
          tier: a.tier,
          type: 'ar_coating' as const,
        }))
      )
    } else if (carrier === 'Spectera') {
      const progs = await prisma.specteraProgressiveFormulary.findMany()
      progressives.push(
        ...progs.map((p) => ({
          productId: p.productId,
          brand: p.brand,
          productName: p.productName,
          tier: p.tier,
          type: 'progressive' as const,
        }))
      )

      const ars = await prisma.specteraArCoatingFormulary.findMany()
      arCoatings.push(
        ...ars.map((a) => ({
          productId: a.productId,
          brand: a.brand,
          productName: a.productName,
          tier: a.tier,
          type: 'ar_coating' as const,
        }))
      )
    }
  } catch (error) {
    console.error(`Error fetching formulary for ${carrier}:`, error)
  }

  return { progressives, arCoatings }
}

/**
 * Look up a progressive lens in the formulary
 */
export async function lookupProgressiveFormulary(
  carrier: string,
  brand?: string,
  productName?: string
): Promise<{ tier: string; tierName: string; brand: string } | null> {
  if (!brand && !productName) return null

  try {
    if (carrier === 'VSP') {
      const match = await prisma.vspProgressiveFormulary.findFirst({
        where: {
          OR: [
            { brand: { contains: brand || '', mode: 'insensitive' } },
            { productName: { contains: productName || '', mode: 'insensitive' } },
          ],
        },
      })
      if (match) {
        return { tier: match.tier, tierName: match.tierName, brand: match.brand }
      }
    } else if (carrier === 'EyeMed') {
      const match = await prisma.eyemedProgressiveFormulary.findFirst({
        where: {
          OR: [
            { brand: { contains: brand || '', mode: 'insensitive' } },
            { productName: { contains: productName || '', mode: 'insensitive' } },
          ],
        },
      })
      if (match) {
        return { tier: match.tier, tierName: match.tier, brand: match.brand }
      }
    } else if (carrier === 'Spectera') {
      const match = await prisma.specteraProgressiveFormulary.findFirst({
        where: {
          OR: [
            { brand: { contains: brand || '', mode: 'insensitive' } },
            { productName: { contains: productName || '', mode: 'insensitive' } },
          ],
        },
      })
      if (match) {
        return { tier: match.tier, tierName: match.tier, brand: match.brand }
      }
    }
  } catch (error) {
    console.error('Progressive formulary lookup error:', error)
  }

  return null
}

/**
 * Look up an AR coating in the formulary
 */
export async function lookupArCoatingFormulary(
  carrier: string,
  brand?: string,
  productName?: string
): Promise<{ tier: string; tierName: string; brand: string } | null> {
  if (!brand && !productName) return null

  try {
    if (carrier === 'VSP') {
      const match = await prisma.vspArCoatingFormulary.findFirst({
        where: {
          OR: [
            { brand: { contains: brand || '', mode: 'insensitive' } },
            { productName: { contains: productName || '', mode: 'insensitive' } },
          ],
        },
      })
      if (match) {
        return { tier: match.vspTier, tierName: match.tierName, brand: match.brand }
      }
    } else if (carrier === 'EyeMed') {
      const match = await prisma.eyemedArCoatingFormulary.findFirst({
        where: {
          OR: [
            { brand: { contains: brand || '', mode: 'insensitive' } },
            { productName: { contains: productName || '', mode: 'insensitive' } },
          ],
        },
      })
      if (match) {
        return { tier: match.tier, tierName: match.tier, brand: match.brand }
      }
    } else if (carrier === 'Spectera') {
      const match = await prisma.specteraArCoatingFormulary.findFirst({
        where: {
          OR: [
            { brand: { contains: brand || '', mode: 'insensitive' } },
            { productName: { contains: productName || '', mode: 'insensitive' } },
          ],
        },
      })
      if (match) {
        return { tier: match.tier, tierName: match.tier, brand: match.brand }
      }
    }
  } catch (error) {
    console.error('AR coating formulary lookup error:', error)
  }

  return null
}
