/**
 * Product Visibility Service
 *
 * Resolves product visibility settings with location-specific overrides.
 * When a location has a custom setting, it takes precedence over global defaults.
 */

import { prisma } from '@/lib/prisma'
import { ProductType } from '@prisma/client'

export interface VisibilitySettings {
  showInPos: boolean
  isFeatured: boolean
  posDisplayOrder: number
  hasLocationOverride: boolean
}

export interface GlobalVisibilityDefaults {
  showInPos: boolean
  isFeatured: boolean
  posDisplayOrder: number
}

/**
 * Get effective visibility settings for a single product at a location
 * Returns location override if exists, otherwise global defaults
 */
export async function getEffectiveVisibility(
  locationId: string,
  productType: ProductType,
  productId: string,
  globalDefaults: GlobalVisibilityDefaults
): Promise<VisibilitySettings> {
  // Check for location-specific override
  const override = await prisma.locationProductSettings.findUnique({
    where: {
      locationId_productType_productId: {
        locationId,
        productType,
        productId
      }
    }
  })

  if (override) {
    return {
      showInPos: override.showInPos,
      isFeatured: override.isFeatured,
      posDisplayOrder: override.posDisplayOrder,
      hasLocationOverride: true
    }
  }

  // Fall back to global defaults
  return {
    ...globalDefaults,
    hasLocationOverride: false
  }
}

/**
 * Get all location-specific settings for a location
 * Returns a map keyed by "productType:productId"
 */
export async function getLocationSettings(
  locationId: string,
  productType?: ProductType
): Promise<Map<string, VisibilitySettings>> {
  const where: { locationId: string; productType?: ProductType } = { locationId }
  if (productType) {
    where.productType = productType
  }

  const settings = await prisma.locationProductSettings.findMany({
    where
  })

  const settingsMap = new Map<string, VisibilitySettings>()

  for (const setting of settings) {
    const key = `${setting.productType}:${setting.productId}`
    settingsMap.set(key, {
      showInPos: setting.showInPos,
      isFeatured: setting.isFeatured,
      posDisplayOrder: setting.posDisplayOrder,
      hasLocationOverride: true
    })
  }

  return settingsMap
}

/**
 * Update or create location-specific visibility settings
 */
export async function upsertLocationSettings(
  locationId: string,
  productType: ProductType,
  productId: string,
  settings: Partial<Pick<VisibilitySettings, 'showInPos' | 'isFeatured' | 'posDisplayOrder'>>
): Promise<void> {
  const updateData: Record<string, boolean | number> = {}
  if (settings.showInPos !== undefined) updateData.showInPos = settings.showInPos
  if (settings.isFeatured !== undefined) updateData.isFeatured = settings.isFeatured
  if (settings.posDisplayOrder !== undefined) updateData.posDisplayOrder = settings.posDisplayOrder

  await prisma.locationProductSettings.upsert({
    where: {
      locationId_productType_productId: {
        locationId,
        productType,
        productId
      }
    },
    create: {
      locationId,
      productType,
      productId,
      showInPos: settings.showInPos ?? true,
      isFeatured: settings.isFeatured ?? false,
      posDisplayOrder: settings.posDisplayOrder ?? 999,
    },
    update: updateData
  })
}

/**
 * Delete location-specific settings (revert to global defaults)
 */
export async function deleteLocationSettings(
  locationId: string,
  productType: ProductType,
  productId: string
): Promise<void> {
  await prisma.locationProductSettings.delete({
    where: {
      locationId_productType_productId: {
        locationId,
        productType,
        productId
      }
    }
  }).catch(() => {
    // Ignore if doesn't exist
  })
}

/**
 * Bulk upsert location settings
 */
export async function bulkUpsertLocationSettings(
  locationId: string,
  updates: Array<{
    productType: ProductType
    productId: string
    showInPos?: boolean
    isFeatured?: boolean
    posDisplayOrder?: number
  }>
): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0

  for (const update of updates) {
    try {
      await upsertLocationSettings(
        locationId,
        update.productType,
        update.productId,
        {
          showInPos: update.showInPos,
          isFeatured: update.isFeatured,
          posDisplayOrder: update.posDisplayOrder
        }
      )
      success++
    } catch {
      failed++
    }
  }

  return { success, failed }
}

/**
 * Helper to merge global defaults with location overrides
 * Returns products with their effective visibility settings
 */
export function mergeVisibilitySettings<T extends { id: string; showInPos: boolean; isFeatured: boolean; posDisplayOrder: number }>(
  products: T[],
  locationSettings: Map<string, VisibilitySettings>,
  productType: ProductType
): Array<T & { hasLocationOverride: boolean }> {
  return products.map(product => {
    const key = `${productType}:${product.id}`
    const override = locationSettings.get(key)

    if (override) {
      return {
        ...product,
        showInPos: override.showInPos,
        isFeatured: override.isFeatured,
        posDisplayOrder: override.posDisplayOrder,
        hasLocationOverride: true
      }
    }

    return {
      ...product,
      hasLocationOverride: false
    }
  })
}
