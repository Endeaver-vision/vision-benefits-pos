/**
 * EXAMPLE USAGE - How to use the standalone pricelist generator
 *
 * This demonstrates:
 * 1. Generating an EyeMed price list with a specific authorization
 * 2. Viewing the structure of the output
 * 3. Filtering products by category
 *
 * To run this as a Node script:
 *   npx tsx src/lib/pricing/example-usage.ts
 */

import {
  generateAllPriceLists,
  generateEyeMedPriceList,
  EyeMedAuth,
  PRODUCT_CATALOG,
} from "./standalone-pricelist";

// ============================================================================
// EXAMPLE 1: Angela Clayton's EyeMed Authorization
// (From her PDF scan - values to be filled in)
// ============================================================================

const ANGELA_CLAYTON_AUTH: EyeMedAuth = {
  examCopay: 0,
  svCopay: 0,
  bifocalCopay: 0,
  trifocalCopay: 0,
  polyCopay: 0,
  photochromicCopay: 0,

  progressiveTierCopays: {
    standard: 0,
    tier1: 0,
    tier2: 0,
    tier3: 0,
    tier4: 0,
    // Note: tier5 intentionally missing - will fall back to tier4
  },

  arTierCopays: {
    tier0: 0,
    tier1: 0,
    tier2: 0,
    tier3: 0,
  },

  frameAllowance: 150,
  frameOverageDiscount: 20,

  backsideUVSurcharge: 15,
  photochromicFreeUnder19: true,
  polyFreeUnder18: true,
};

// ============================================================================
// EXAMPLE 2: Generate EyeMed price list for Angela
// ============================================================================

function exampleGenerateEyeMedList() {
  console.log("\n" + "=".repeat(80));
  console.log("EXAMPLE: Generate EyeMed Price List");
  console.log("=".repeat(80));

  const priceList = generateEyeMedPriceList(ANGELA_CLAYTON_AUTH);

  console.log(`\nCarrier: ${priceList.carrier}`);
  console.log(`Generated: ${priceList.generatedAt}`);
  console.log(`Total Products: ${priceList.items.length}`);

  // Show products grouped by category
  const byCategory = new Map<string, typeof priceList.items>();
  for (const item of priceList.items) {
    if (!byCategory.has(item.category)) {
      byCategory.set(item.category, []);
    }
    byCategory.get(item.category)!.push(item);
  }

  for (const [category, items] of byCategory) {
    console.log(`\n${category.toUpperCase()} (${items.length} items)`);
    console.log("-".repeat(80));

    for (const item of items.slice(0, 5)) {
      // Show first 5 of each category
      console.log(
        `  ${item.productName.padEnd(30)} | Retail: $${item.retail
          .toFixed(2)
          .padStart(7)} | Copay: $${(item.copay || 0)
          .toFixed(2)
          .padStart(7)}`
      );
      if (item.rulesApplied?.length) {
        console.log(`    → Rules: ${item.rulesApplied.join(", ")}`);
      }
    }
    if (items.length > 5) {
      console.log(`  ... and ${items.length - 5} more items`);
    }
  }
}

// ============================================================================
// EXAMPLE 3: Generate all 4 carrier price lists
// ============================================================================

function exampleGenerateAllLists() {
  console.log("\n" + "=".repeat(80));
  console.log("EXAMPLE: Generate All 4 Carrier Price Lists");
  console.log("=".repeat(80));

  const allLists = generateAllPriceLists(ANGELA_CLAYTON_AUTH);

  for (const [carrier, priceList] of Object.entries(allLists)) {
    console.log(`\n${carrier}`);
    console.log(`  Items: ${priceList.items.length}`);

    // Show first 3 items of each carrier
    for (const item of priceList.items.slice(0, 3)) {
      console.log(
        `    - ${item.productName.padEnd(25)} ($${item.copay?.toFixed(2).padStart(7)})`
      );
    }
  }
}

// ============================================================================
// EXAMPLE 4: Show product catalog structure
// ============================================================================

function exampleShowCatalog() {
  console.log("\n" + "=".repeat(80));
  console.log("EXAMPLE: Product Catalog Structure");
  console.log("=".repeat(80));

  console.log("\nLens Types:");
  for (const product of PRODUCT_CATALOG.lensTypes.slice(0, 5)) {
    console.log(
      `  ${product.name.padEnd(25)} | EyeMed: ${product.eyemedTier?.toString().padEnd(12)} | VSP: ${product.vspTier?.toString().padEnd(12)} | Retail: $${product.retail}`
    );
  }

  console.log("\nLens Materials:");
  for (const product of PRODUCT_CATALOG.lensMaterials) {
    console.log(
      `  ${product.name.padEnd(25)} | EyeMed: ${product.eyemedTier?.toString().padEnd(12)} | Retail: $${product.retail}`
    );
  }

  console.log("\nAR Coatings:");
  for (const product of PRODUCT_CATALOG.arCoatings.slice(0, 5)) {
    console.log(
      `  ${product.name.padEnd(25)} | EyeMed: ${product.eyemedTier?.toString().padEnd(12)} | Backside UV: ${product.backsideUV ? "Yes" : "No"} | Retail: $${product.retail}`
    );
  }

  console.log("\nPhotochromics:");
  for (const product of PRODUCT_CATALOG.photochromics) {
    console.log(
      `  ${product.name.padEnd(25)} | Free under 19: ${product.freeUnder19 ? "Yes" : "No"} | Retail: $${product.retail}`
    );
  }
}

// ============================================================================
// EXAMPLE 5: Calculate actual patient costs
// ============================================================================

function exampleCalculatePatientCosts() {
  console.log("\n" + "=".repeat(80));
  console.log("EXAMPLE: Calculate Patient Out-of-Pocket for a Frame");
  console.log("=".repeat(80));

  const auth: EyeMedAuth = {
    examCopay: 0,
    svCopay: 0,
    frameAllowance: 150,
    frameOverageDiscount: 20,
  };

  const priceList = generateEyeMedPriceList(auth);

  // Find frame items
  const frames = priceList.items.filter((i) => i.category === "mount_fee");

  console.log("\nFrame Benefits:");
  console.log(`  Allowance: $${auth.frameAllowance}`);
  console.log(`  Overage Discount: ${auth.frameOverageDiscount}%`);

  console.log("\nFrame Options:");
  for (const frame of frames) {
    const frameCost = 250; // Example frame retail
    let copay = 0;
    if (frameCost <= (auth.frameAllowance || 0)) {
      copay = 0;
    } else {
      const overage = frameCost - (auth.frameAllowance || 0);
      const discount = (auth.frameOverageDiscount || 20) / 100;
      copay = Math.round(overage * (1 - discount) * 100) / 100;
    }

    console.log(`  ${frame.productName}`);
    console.log(`    Retail: $${frameCost}`);
    console.log(`    Patient OOP: $${copay}`);
  }
}

// ============================================================================
// RUN ALL EXAMPLES
// ============================================================================

if (require.main === module) {
  exampleShowCatalog();
  exampleGenerateEyeMedList();
  exampleGenerateAllLists();
  exampleCalculatePatientCosts();

  console.log("\n" + "=".repeat(80));
  console.log("Examples complete!");
  console.log("=".repeat(80) + "\n");
}

export { ANGELA_CLAYTON_AUTH, exampleGenerateEyeMedList, exampleShowCatalog };
