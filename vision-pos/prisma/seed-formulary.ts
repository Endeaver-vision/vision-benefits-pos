import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Helper to read JSON lines file (one JSON object per line)
function readJsonLines(filename: string): any[] {
  const filePath = path.join(__dirname, 'seed-data', filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  return content
    .trim()
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}

async function seedFormularies() {
  console.log('🌱 Seeding formulary data...\n');

  // VSP Progressive Formulary
  console.log('📦 Seeding VSP Progressive Formulary...');
  const vspProgressive = readJsonLines('vsp_progressive.json');
  for (const item of vspProgressive) {
    await prisma.vspProgressiveFormulary.upsert({
      where: { productId: item.product_id },
      update: {
        brand: item.brand,
        productName: item.product_name,
        tier: item.tier,
        tierName: item.tier_name,
        isCustomizable: item.is_customizable || false,
        baseCode: item.base_code,
        designType: item.design_type,
      },
      create: {
        productId: item.product_id,
        brand: item.brand,
        productName: item.product_name,
        tier: item.tier,
        tierName: item.tier_name,
        isCustomizable: item.is_customizable || false,
        baseCode: item.base_code,
        designType: item.design_type,
      },
    });
  }
  console.log(`   ✅ ${vspProgressive.length} records\n`);

  // VSP AR Coating Formulary
  console.log('📦 Seeding VSP AR Coating Formulary...');
  const vspArCoating = readJsonLines('vsp_ar_coating.json');
  for (const item of vspArCoating) {
    await prisma.vspArCoatingFormulary.upsert({
      where: { productId: item.product_id },
      update: {
        brand: item.brand,
        productName: item.product_name,
        vspTier: item.vsp_tier,
        tierName: item.tier_name,
        code: item.code,
        hasBlueLight: item.has_blue_light || false,
        warrantyYears: item.warranty_years,
      },
      create: {
        productId: item.product_id,
        brand: item.brand,
        productName: item.product_name,
        vspTier: item.vsp_tier,
        tierName: item.tier_name,
        code: item.code,
        hasBlueLight: item.has_blue_light || false,
        warrantyYears: item.warranty_years,
      },
    });
  }
  console.log(`   ✅ ${vspArCoating.length} records\n`);

  // EyeMed Progressive Formulary
  console.log('📦 Seeding EyeMed Progressive Formulary...');
  const eyemedProgressive = readJsonLines('eyemed_progressive.json');
  for (const item of eyemedProgressive) {
    await prisma.eyemedProgressiveFormulary.upsert({
      where: { productId: item.product_id },
      update: {
        brand: item.brand,
        productName: item.product_name,
        tier: item.tier,
        isDigital: item.is_digital || false,
        isShort: item.is_short || false,
        isWrap: item.is_wrap || false,
        isOccupational: item.is_occupational || false,
        designType: item.design_type,
      },
      create: {
        productId: item.product_id,
        brand: item.brand,
        productName: item.product_name,
        tier: item.tier,
        isDigital: item.is_digital || false,
        isShort: item.is_short || false,
        isWrap: item.is_wrap || false,
        isOccupational: item.is_occupational || false,
        designType: item.design_type,
      },
    });
  }
  console.log(`   ✅ ${eyemedProgressive.length} records\n`);

  // EyeMed AR Coating Formulary
  console.log('📦 Seeding EyeMed AR Coating Formulary...');
  const eyemedArCoating = readJsonLines('eyemed_ar_coating.json');
  for (const item of eyemedArCoating) {
    await prisma.eyemedArCoatingFormulary.upsert({
      where: { productId: item.product_id },
      update: {
        brand: item.brand,
        productName: item.product_name,
        tier: item.tier,
        hasBlueLight: item.has_blue_light || false,
        isBacksideOnly: item.is_backside_only || false,
        isSunSpecific: item.is_sun_specific || false,
      },
      create: {
        productId: item.product_id,
        brand: item.brand,
        productName: item.product_name,
        tier: item.tier,
        hasBlueLight: item.has_blue_light || false,
        isBacksideOnly: item.is_backside_only || false,
        isSunSpecific: item.is_sun_specific || false,
      },
    });
  }
  console.log(`   ✅ ${eyemedArCoating.length} records\n`);

  // Spectera Progressive Formulary
  console.log('📦 Seeding Spectera Progressive Formulary...');
  const specteraProgressive = readJsonLines('spectera_progressive.json');
  for (const item of specteraProgressive) {
    await prisma.specteraProgressiveFormulary.upsert({
      where: { productId: item.product_id },
      update: {
        brand: item.brand,
        productName: item.product_name,
        tier: item.tier,
        isDigital: item.is_digital || false,
        isRayBan: item.is_ray_ban || false,
        isShort: item.is_short || false,
        designType: item.design_type,
      },
      create: {
        productId: item.product_id,
        brand: item.brand,
        productName: item.product_name,
        tier: item.tier,
        isDigital: item.is_digital || false,
        isRayBan: item.is_ray_ban || false,
        isShort: item.is_short || false,
        designType: item.design_type,
      },
    });
  }
  console.log(`   ✅ ${specteraProgressive.length} records\n`);

  // Spectera AR Coating Formulary
  console.log('📦 Seeding Spectera AR Coating Formulary...');
  const specteraArCoating = readJsonLines('spectera_ar_coating.json');
  for (const item of specteraArCoating) {
    await prisma.specteraArCoatingFormulary.upsert({
      where: { productId: item.product_id },
      update: {
        brand: item.brand,
        productName: item.product_name,
        tier: item.tier,
        hasBlueLight: item.has_blue_light || false,
        hasMirrorOption: item.has_mirror_option || false,
        hasUvBackside: item.has_uv_backside || false,
        isRayBan: item.is_ray_ban || false,
      },
      create: {
        productId: item.product_id,
        brand: item.brand,
        productName: item.product_name,
        tier: item.tier,
        hasBlueLight: item.has_blue_light || false,
        hasMirrorOption: item.has_mirror_option || false,
        hasUvBackside: item.has_uv_backside || false,
        isRayBan: item.is_ray_ban || false,
      },
    });
  }
  console.log(`   ✅ ${specteraArCoating.length} records\n`);

  // Practice Data
  console.log('📦 Seeding Practice Data...');
  const practiceData = readJsonLines('practice_data.json');
  for (const item of practiceData) {
    await prisma.practiceData.upsert({
      where: { practiceId: item.practice_id },
      update: {
        practiceName: item.practice_name,
        vspUcPrices: item.vsp_uc_prices || {},
        specteraUcPrices: item.spectera_uc_prices || {},
        eyemedUcPrices: item.eyemed_uc_prices || {},
        vspBundles: item.vsp_bundles || [],
        specteraBundles: item.spectera_bundles || [],
        eyemedBundles: item.eyemed_bundles || [],
      },
      create: {
        practiceId: item.practice_id,
        practiceName: item.practice_name,
        vspUcPrices: item.vsp_uc_prices || {},
        specteraUcPrices: item.spectera_uc_prices || {},
        eyemedUcPrices: item.eyemed_uc_prices || {},
        vspBundles: item.vsp_bundles || [],
        specteraBundles: item.spectera_bundles || [],
        eyemedBundles: item.eyemed_bundles || [],
      },
    });
  }
  console.log(`   ✅ ${practiceData.length} records\n`);

  console.log('🎉 Formulary seeding complete!');
}

async function main() {
  try {
    await seedFormularies();
  } catch (error) {
    console.error('Error seeding formularies:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
