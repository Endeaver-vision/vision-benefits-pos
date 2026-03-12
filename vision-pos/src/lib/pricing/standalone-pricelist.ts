/**
 * Standalone Price List Generator
 *
 * Generates complete price lists for each carrier (EyeMed, VSP, Spectera, Cash)
 * NOT connected to database - returns pure pricing data
 *
 * Usage:
 *   const eyemedList = generateEyeMedPriceList(auth);
 *   const vspList = generateVSPPriceList();
 *   const cashList = generateCashPriceList();
 */

import {
  PRODUCT_CATALOG,
  Product,
  getProductsByCarrier,
  getProductById,
} from "./product-catalog";

// ============================================================================
// TYPES
// ============================================================================

export interface PriceListItem {
  productId: string;
  productName: string;
  category: string;
  retail: number;
  wholesale: number;

  // Insurance pricing (tier-based for EyeMed/Spectera, code-based for VSP)
  tier?: string;
  carrier: "EYEMED" | "VSP" | "SPECTERA" | "CASH";

  // Patient out-of-pocket (calculated based on auth)
  copay?: number;
  description?: string;

  // Audit trail
  rulesApplied?: string[];
  notes?: string;
}

export interface EyeMedAuth {
  examCopay?: number;
  svCopay?: number;
  bifocalCopay?: number;
  trifocalCopay?: number;
  polyCopay?: number;
  trivexCopay?: number;
  highIndexCopay?: number;
  photochromicCopay?: number;

  progressiveTierCopays?: {
    standard?: number;
    tier1?: number;
    tier2?: number;
    tier3?: number;
    tier4?: number;
    tier5?: number;
  };

  arTierCopays?: {
    tier0?: number;
    tier1?: number;
    tier2?: number;
    tier3?: number;
  };

  frameAllowance?: number;
  frameOverageDiscount?: number; // percentage

  backsideUVSurcharge?: number; // default: 15
  photochromicFreeUnder19?: boolean;
  polyFreeUnder18?: boolean;

  tier5Fallback?: boolean; // use Tier 4 if Tier 5 not available
  maxTierCovered?: number;
}

export interface PriceListResult {
  carrier: "EYEMED" | "VSP" | "SPECTERA" | "CASH";
  items: PriceListItem[];
  generatedAt: Date;
}

// ============================================================================
// EYEMED PRICE LIST GENERATOR
// ============================================================================

export function generateEyeMedPriceList(auth: EyeMedAuth = {}): PriceListResult {
  const items: PriceListItem[] = [];

  // Get all EyeMed-eligible products
  const products = getProductsByCarrier("EYEMED");

  for (const product of products) {
    // Skip cash-only items on insurance price list
    if (product.cashOnly) continue;

    const item: PriceListItem = {
      productId: product.id,
      productName: product.name,
      category: product.category,
      retail: product.retail,
      wholesale: product.wholesale,
      tier: product.eyemedTier as string,
      carrier: "EYEMED",
      rulesApplied: [],
      notes: product.note,
    };

    // Calculate copay based on product category
    const copay = calculateEyeMedCopay(product, auth);
    item.copay = copay;

    if (copay !== product.retail) {
      item.rulesApplied?.push(`EyeMed copay: $${copay}`);
    }

    // Apply Tier 5 fallback rule for progressives
    if (product.eyemedTier === "Tier 5" && !auth.progressiveTierCopays?.tier5) {
      item.rulesApplied?.push("Tier 5 fallback: use Tier 4 copay");
    }

    // Note age-based free benefits
    if (product.freeUnder18) {
      item.rulesApplied?.push("FREE under 18");
    }
    if (product.freeUnder19) {
      item.rulesApplied?.push("FREE under 19");
    }

    // Flag backside UV surcharge
    if (product.backsideUV && product.category === "ar_coating") {
      const uvSurcharge = auth.backsideUVSurcharge || 15;
      item.rulesApplied?.push(`+$${uvSurcharge} backside UV surcharge (EyeMed)`);
    }

    items.push(item);
  }

  return {
    carrier: "EYEMED",
    items,
    generatedAt: new Date(),
  };
}

function calculateEyeMedCopay(product: Product, auth: EyeMedAuth): number {
  // Lens type
  if (product.category === "lens_type") {
    if (product.eyemedTier === "Standard") return auth.svCopay || 0;
    if (product.eyemedTier === "Tier 1") return auth.progressiveTierCopays?.tier1 || 0;
    if (product.eyemedTier === "Tier 2") return auth.progressiveTierCopays?.tier2 || 0;
    if (product.eyemedTier === "Tier 3") return auth.progressiveTierCopays?.tier3 || 0;
    if (product.eyemedTier === "Tier 4") return auth.progressiveTierCopays?.tier4 || 0;
    if (product.eyemedTier === "Tier 5") {
      // Tier 5 fallback: use Tier 4 if Tier 5 not available
      return auth.progressiveTierCopays?.tier5 || auth.progressiveTierCopays?.tier4 || 0;
    }
    return product.retail; // Not covered
  }

  // Material
  if (product.category === "lens_material") {
    if (product.id === "cr39") return 0; // Base material, always free
    if (product.id === "poly") return auth.polyCopay || 0;
    if (product.id === "trivex") return auth.trivexCopay || product.retail;
    if (product.id === "hiIndex167" || product.id === "ultraHi172") {
      return auth.highIndexCopay || product.retail;
    }
    return product.retail; // Uncovered material = full retail
  }

  // AR Coating
  if (product.category === "ar_coating") {
    if (product.id === "none") return 0;
    if (product.eyemedTier === "Tier 0" || product.eyemedTier === "N/A") return 0;
    if (product.eyemedTier === "Tier 2") return auth.arTierCopays?.tier2 || 0;
    if (product.eyemedTier === "Tier 3") return auth.arTierCopays?.tier3 || 0;
    return product.retail; // Tier not covered = full retail
  }

  // Photochromic
  if (product.category === "photochromic") {
    if (product.id === "none") return 0;
    return auth.photochromicCopay || product.retail;
  }

  // Add-ons: mostly full retail, some special handling
  if (product.category === "add_on") {
    if (product.id === "tint") return auth.photochromicCopay || product.retail; // Often same as photochromic
    return product.retail; // Most add-ons are full retail
  }

  // Mount fees: not covered
  if (product.category === "mount_fee") {
    return product.retail;
  }

  return product.retail;
}

// ============================================================================
// VSP PRICE LIST GENERATOR
// (Placeholder - VSP has code matrix structure, not tier-based)
// ============================================================================

export function generateVSPPriceList(): PriceListResult {
  const items: PriceListItem[] = [];

  const products = getProductsByCarrier("VSP");

  for (const product of products) {
    if (product.cashOnly) continue;

    const item: PriceListItem = {
      productId: product.id,
      productName: product.name,
      category: product.category,
      retail: product.retail,
      wholesale: product.wholesale,
      tier: product.vspTier as string,
      carrier: "VSP",
      copay: product.retail, // VSP pricing requires more complex matrix
      rulesApplied: ["VSP code matrix - requires plan data"],
      notes: product.note,
    };

    items.push(item);
  }

  return {
    carrier: "VSP",
    items,
    generatedAt: new Date(),
  };
}

// ============================================================================
// SPECTERA PRICE LIST GENERATOR
// (Similar to EyeMed - tier-based)
// ============================================================================

export function generateSpecteraPriceList(auth: EyeMedAuth = {}): PriceListResult {
  const items: PriceListItem[] = [];

  const products = getProductsByCarrier("SPECTERA");

  for (const product of products) {
    if (product.cashOnly) continue;

    const item: PriceListItem = {
      productId: product.id,
      productName: product.name,
      category: product.category,
      retail: product.retail,
      wholesale: product.wholesale,
      tier: product.specteraTier as string,
      carrier: "SPECTERA",
      copay: product.retail, // Placeholder
      rulesApplied: ["Spectera tier-based pricing"],
      notes: product.note,
    };

    items.push(item);
  }

  return {
    carrier: "SPECTERA",
    items,
    generatedAt: new Date(),
  };
}

// ============================================================================
// CASH/RETAIL PRICE LIST
// Shows full retail prices (reference for all insurance options)
// ============================================================================

export function generateCashPriceList(): PriceListResult {
  const items: PriceListItem[] = [];

  const products = getProductsByCarrier("CASH");

  for (const product of products) {
    const item: PriceListItem = {
      productId: product.id,
      productName: product.name,
      category: product.category,
      retail: product.retail,
      wholesale: product.wholesale,
      tier: "CASH",
      carrier: "CASH",
      copay: product.retail,
      rulesApplied: ["Full retail price"],
      notes: product.note || (product.cashOnly ? "Cash-only product" : ""),
    };

    items.push(item);
  }

  return {
    carrier: "CASH",
    items,
    generatedAt: new Date(),
  };
}

// ============================================================================
// UTILITY: Generate all 4 price lists at once
// ============================================================================

export function generateAllPriceLists(
  eyemedAuth: EyeMedAuth = {}
): Record<"EYEMED" | "VSP" | "SPECTERA" | "CASH", PriceListResult> {
  return {
    EYEMED: generateEyeMedPriceList(eyemedAuth),
    VSP: generateVSPPriceList(),
    SPECTERA: generateSpecteraPriceList(eyemedAuth),
    CASH: generateCashPriceList(),
  };
}
