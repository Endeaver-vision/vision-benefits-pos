/**
 * Price List Version Service
 *
 * Manages versioned price lists for patients.
 * Each version stores:
 * - Full lens matrix data (VSP)
 * - Extracted benefits data
 * - Complete price list JSON
 * - Individual price items
 */

import { prisma } from '@/lib/prisma'

export interface PriceItem {
  productId: string
  productName?: string
  section?: string
  retailPrice: number
  finalPrice: number
  copay?: number
  tier?: string
  notes?: string[]
  isCashOnly?: boolean
  isNotCovered?: boolean
  svCopay?: number
  multiCopay?: number
  hasVariance?: boolean
}

export interface CreateVersionInput {
  customerId: string
  carrier: 'VSP' | 'EyeMed' | 'Spectera'
  authorizationId?: string
  planName?: string
  lensMatrixData?: Record<string, unknown>
  extractedData?: Record<string, unknown>
  priceListData?: Record<string, unknown>
  priceItems: PriceItem[]
  createdBy?: string
}

export interface PriceListVersionSummary {
  id: string
  version: number
  versionLabel: string
  insuranceCarrier: string
  planName: string | null
  active: boolean
  createdAt: Date
  itemCount: number
}

export interface PriceListVersionFull {
  id: string
  version: number
  versionLabel: string
  insuranceCarrier: string
  planName: string | null
  active: boolean
  createdAt: Date
  createdBy: string | null
  lensMatrixData: Record<string, unknown> | null
  extractedData: Record<string, unknown> | null
  priceListData: Record<string, unknown> | null
  priceItems: Array<{
    id: string
    productId: string
    retailPrice: number
    finalPrice: number | null
    tier: string | null
  }>
}

/**
 * Create a new price list version for a customer
 * Auto-increments version number per customer+carrier
 */
export async function createPriceListVersion(input: CreateVersionInput): Promise<{
  version: PriceListVersionSummary
  itemsCreated: number
}> {
  const {
    customerId,
    carrier,
    authorizationId,
    planName,
    lensMatrixData,
    extractedData,
    priceListData,
    priceItems,
    createdBy
  } = input

  // Get next version number for this customer+carrier
  const existingVersions = await prisma.priceListVersion.findMany({
    where: { customerId, insuranceCarrier: carrier },
    orderBy: { version: 'desc' },
    take: 1
  })

  const nextVersion = existingVersions.length > 0 ? existingVersions[0].version + 1 : 1
  const today = new Date().toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  })
  const versionLabel = `v${nextVersion} - ${today}`

  // Deactivate all existing versions for this customer+carrier
  await prisma.priceListVersion.updateMany({
    where: { customerId, insuranceCarrier: carrier },
    data: { active: false }
  })

  // Create the new version with price items in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create the version
    const newVersion = await tx.priceListVersion.create({
      data: {
        customerId,
        authorizationId,
        insuranceCarrier: carrier,
        planName,
        version: nextVersion,
        versionLabel,
        lensMatrixData: lensMatrixData ?? undefined,
        extractedData: extractedData ?? undefined,
        priceListData: priceListData ?? undefined,
        active: true,
        createdBy
      }
    })

    // Create price items linked to this version
    const priceItemsData = priceItems.map(item => ({
      customerId,
      productId: item.productId,
      authorizationId,
      retailPrice: item.retailPrice,
      finalPrice: item.finalPrice,
      savings: item.retailPrice - item.finalPrice,
      insuranceCarrier: carrier,
      planName,
      tier: item.tier,
      versionId: newVersion.id,
      active: true
    }))

    await tx.patientPriceList.createMany({
      data: priceItemsData
    })

    return { newVersion, itemCount: priceItemsData.length }
  })

  return {
    version: {
      id: result.newVersion.id,
      version: result.newVersion.version,
      versionLabel: result.newVersion.versionLabel,
      insuranceCarrier: result.newVersion.insuranceCarrier,
      planName: result.newVersion.planName,
      active: result.newVersion.active,
      createdAt: result.newVersion.createdAt,
      itemCount: result.itemCount
    },
    itemsCreated: result.itemCount
  }
}

/**
 * List all versions for a customer, optionally filtered by carrier
 */
export async function getPriceListVersions(
  customerId: string,
  carrier?: string
): Promise<PriceListVersionSummary[]> {
  const where: Record<string, unknown> = { customerId }
  if (carrier) {
    where.insuranceCarrier = carrier
  }

  const versions = await prisma.priceListVersion.findMany({
    where,
    orderBy: [
      { insuranceCarrier: 'asc' },
      { version: 'desc' }
    ],
    include: {
      _count: {
        select: { priceItems: true }
      }
    }
  })

  return versions.map(v => ({
    id: v.id,
    version: v.version,
    versionLabel: v.versionLabel,
    insuranceCarrier: v.insuranceCarrier,
    planName: v.planName,
    active: v.active,
    createdAt: v.createdAt,
    itemCount: v._count.priceItems
  }))
}

/**
 * Get full details of a specific version including all price items
 */
export async function getPriceListVersion(
  versionId: string
): Promise<PriceListVersionFull | null> {
  const version = await prisma.priceListVersion.findUnique({
    where: { id: versionId },
    include: {
      priceItems: {
        select: {
          id: true,
          productId: true,
          retailPrice: true,
          finalPrice: true,
          tier: true
        }
      }
    }
  })

  if (!version) return null

  return {
    id: version.id,
    version: version.version,
    versionLabel: version.versionLabel,
    insuranceCarrier: version.insuranceCarrier,
    planName: version.planName,
    active: version.active,
    createdAt: version.createdAt,
    createdBy: version.createdBy,
    lensMatrixData: version.lensMatrixData as Record<string, unknown> | null,
    extractedData: version.extractedData as Record<string, unknown> | null,
    priceListData: version.priceListData as Record<string, unknown> | null,
    priceItems: version.priceItems.map(item => ({
      id: item.id,
      productId: item.productId,
      retailPrice: Number(item.retailPrice),
      finalPrice: item.finalPrice ? Number(item.finalPrice) : null,
      tier: item.tier
    }))
  }
}

/**
 * Get the currently active version for a customer+carrier
 */
export async function getActiveVersion(
  customerId: string,
  carrier: string
): Promise<PriceListVersionSummary | null> {
  const version = await prisma.priceListVersion.findFirst({
    where: {
      customerId,
      insuranceCarrier: carrier,
      active: true
    },
    include: {
      _count: {
        select: { priceItems: true }
      }
    }
  })

  if (!version) return null

  return {
    id: version.id,
    version: version.version,
    versionLabel: version.versionLabel,
    insuranceCarrier: version.insuranceCarrier,
    planName: version.planName,
    active: version.active,
    createdAt: version.createdAt,
    itemCount: version._count.priceItems
  }
}

/**
 * Activate a specific version (deactivates all others for same customer+carrier)
 */
export async function activatePriceListVersion(
  customerId: string,
  versionId: string
): Promise<void> {
  // Get the version to find its carrier
  const version = await prisma.priceListVersion.findUnique({
    where: { id: versionId },
    select: { insuranceCarrier: true, customerId: true }
  })

  if (!version) {
    throw new Error('Version not found')
  }

  if (version.customerId !== customerId) {
    throw new Error('Version does not belong to this customer')
  }

  // Deactivate all versions for this customer+carrier
  await prisma.priceListVersion.updateMany({
    where: {
      customerId,
      insuranceCarrier: version.insuranceCarrier
    },
    data: { active: false }
  })

  // Activate the specified version
  await prisma.priceListVersion.update({
    where: { id: versionId },
    data: { active: true }
  })
}

/**
 * Delete a version and all its price items
 */
export async function deletePriceListVersion(
  versionId: string
): Promise<void> {
  // Cascade delete will handle price items
  await prisma.priceListVersion.delete({
    where: { id: versionId }
  })
}
