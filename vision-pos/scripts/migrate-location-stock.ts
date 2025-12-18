/**
 * Migrate existing frame data to use locationStock JSON field
 *
 * Converts:
 * - locations: ["Insight", "Spectrum"]
 * - stockQuantity: 10
 *
 * To:
 * - locationStock: {"Insight": 5, "Spectrum": 5}
 *
 * Logic: Split stockQuantity evenly across locations, with remainder going to first location
 *
 * Run with: npx tsx scripts/migrate-location-stock.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting locationStock migration...\n');

  // Get all frames with locations
  const frames = await prisma.frame.findMany({
    where: {
      locations: { isEmpty: false }
    },
    select: {
      id: true,
      brand: true,
      model: true,
      locations: true,
      stockQuantity: true,
    }
  });

  console.log(`Found ${frames.length} frames with locations to migrate\n`);

  let migrated = 0;
  let errors = 0;

  for (const frame of frames) {
    try {
      const locationCount = frame.locations.length;
      const totalStock = frame.stockQuantity || 0;

      // Split stock evenly, with remainder going to first location
      const baseStock = Math.floor(totalStock / locationCount);
      const remainder = totalStock % locationCount;

      const locationStock: Record<string, number> = {};

      frame.locations.forEach((loc, index) => {
        // First location gets the remainder
        locationStock[loc] = baseStock + (index === 0 ? remainder : 0);
      });

      await prisma.frame.update({
        where: { id: frame.id },
        data: { locationStock }
      });

      migrated++;

      if (migrated % 500 === 0) {
        console.log(`  Migrated ${migrated}/${frames.length} frames...`);
      }
    } catch (err) {
      errors++;
      console.error(`Error migrating frame ${frame.id} (${frame.brand} ${frame.model}):`, err);
    }
  }

  console.log(`\nMigration complete!`);
  console.log(`  - Migrated: ${migrated}`);
  console.log(`  - Errors: ${errors}`);

  // Show some sample data
  console.log('\nSample migrated data:');
  const samples = await prisma.frame.findMany({
    where: {
      locations: { isEmpty: false }
    },
    select: {
      brand: true,
      model: true,
      locations: true,
      stockQuantity: true,
      locationStock: true,
    },
    take: 5
  });

  samples.forEach(s => {
    console.log(`  ${s.brand} ${s.model}:`);
    console.log(`    locations: [${s.locations.join(', ')}]`);
    console.log(`    stockQuantity: ${s.stockQuantity}`);
    console.log(`    locationStock: ${JSON.stringify(s.locationStock)}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
