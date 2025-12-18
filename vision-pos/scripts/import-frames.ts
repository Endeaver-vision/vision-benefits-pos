/**
 * Import Frames from Insight and Spectrum CSVs
 * Merges duplicates and tracks which location(s) have each frame
 *
 * CSV Format: Manufacturer,Brand,Collection,Model,Color,Color Code,Eye,Bridge,Temple,#,Description,UPC,SKU,Retail,Wholesale,Stock
 *
 * Run with: npx tsx scripts/import-frames.ts
 */

import { PrismaClient, FrameGender } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface RawFrame {
  manufacturer: string;
  brand: string;
  collection: string;
  model: string;
  color: string;
  colorCode: string;
  eyeSize: string;
  bridge: string;
  temple: string;
  internalId: string;
  description: string;
  upc: string;
  sku: string;
  retail: string;
  wholesale: string;
  stock: string;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);

  return values;
}

function parseCSV(content: string): RawFrame[] {
  const lines = content.split('\n').filter(line => line.trim());
  const frames: RawFrame[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 16) continue;

    frames.push({
      manufacturer: values[0]?.trim() || '',
      brand: values[1]?.trim() || '',
      collection: values[2]?.trim() || '',
      model: values[3]?.trim() || '',
      color: values[4]?.trim() || '',
      colorCode: values[5]?.trim() || '',
      eyeSize: values[6]?.trim() || '',
      bridge: values[7]?.trim() || '',
      temple: values[8]?.trim() || '',
      internalId: values[9]?.trim() || '',
      description: values[10]?.trim() || '',
      upc: values[11]?.trim() || '',
      sku: values[12]?.trim() || '',
      retail: values[13]?.trim() || '',
      wholesale: values[14]?.trim() || '',
      stock: values[15]?.trim() || '',
    });
  }

  return frames;
}

function parsePrice(price: string): number {
  const cleaned = price.replace(/[$,]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseInt2(val: string): number | null {
  const num = parseInt(val, 10);
  return isNaN(num) ? null : num;
}

function parseGender(description: string): FrameGender | null {
  const desc = description.toUpperCase();
  if (desc.includes('WOMAN') || desc.includes('WOMEN')) return 'WOMENS';
  if (desc.includes('MEN') && !desc.includes('WOMEN')) return 'MENS';
  if (desc.includes('KID') || desc.includes('CHILD')) return 'KIDS';
  if (desc.includes('UNISEX')) return 'UNISEX';
  return null;
}

function createFrameKey(frame: RawFrame): string {
  // Normalize for matching: brand + model + color (lowercased, trimmed)
  return `${frame.brand.toLowerCase()}|${frame.model.toLowerCase()}|${frame.color.toLowerCase()}`;
}

async function main() {
  console.log('Reading CSV files...');

  const insightPath = '/Users/cmac/Documents/frames-insight.csv';
  const spectrumPath = '/Users/cmac/Documents/Frames-spectrum.csv';

  const insightContent = fs.readFileSync(insightPath, 'utf-8');
  const spectrumContent = fs.readFileSync(spectrumPath, 'utf-8');

  const insightFrames = parseCSV(insightContent);
  const spectrumFrames = parseCSV(spectrumContent);

  console.log(`Parsed ${insightFrames.length} frames from Insight`);
  console.log(`Parsed ${spectrumFrames.length} frames from Spectrum`);

  // Build a map to merge duplicates
  const frameMap = new Map<string, {
    frame: RawFrame;
    locations: string[];
    stockByLocation: { location: string; stock: number }[];
  }>();

  // Process Insight frames
  for (const frame of insightFrames) {
    const key = createFrameKey(frame);
    const stock = parseInt2(frame.stock) ?? 0;

    if (frameMap.has(key)) {
      const existing = frameMap.get(key)!;
      if (!existing.locations.includes('Insight')) {
        existing.locations.push('Insight');
        existing.stockByLocation.push({ location: 'Insight', stock });
      }
    } else {
      frameMap.set(key, {
        frame,
        locations: ['Insight'],
        stockByLocation: [{ location: 'Insight', stock }],
      });
    }
  }

  // Process Spectrum frames
  for (const frame of spectrumFrames) {
    const key = createFrameKey(frame);
    const stock = parseInt2(frame.stock) ?? 0;

    if (frameMap.has(key)) {
      const existing = frameMap.get(key)!;
      if (!existing.locations.includes('Spectrum')) {
        existing.locations.push('Spectrum');
        existing.stockByLocation.push({ location: 'Spectrum', stock });
      }
    } else {
      frameMap.set(key, {
        frame,
        locations: ['Spectrum'],
        stockByLocation: [{ location: 'Spectrum', stock }],
      });
    }
  }

  console.log(`\nMerged into ${frameMap.size} unique frames`);

  // Count overlaps
  let bothLocations = 0;
  let insightOnly = 0;
  let spectrumOnly = 0;

  for (const entry of frameMap.values()) {
    if (entry.locations.length === 2) bothLocations++;
    else if (entry.locations.includes('Insight')) insightOnly++;
    else spectrumOnly++;
  }

  console.log(`  - Both locations: ${bothLocations}`);
  console.log(`  - Insight only: ${insightOnly}`);
  console.log(`  - Spectrum only: ${spectrumOnly}`);

  // Build data for batch insert
  console.log('\nPreparing frames for batch insert...');

  const skuSet = new Set<string>();
  const frameData: any[] = [];

  for (const entry of frameMap.values()) {
    const { frame, locations, stockByLocation } = entry;

    // Calculate total stock
    const totalStock = stockByLocation.reduce((sum, s) => sum + s.stock, 0);

    // Handle SKU uniqueness - skip if duplicate or empty
    let sku: string | null = frame.sku || null;
    if (sku) {
      if (skuSet.has(sku)) {
        sku = null; // Clear duplicate SKU
      } else {
        skuSet.add(sku);
      }
    }

    frameData.push({
      manufacturer: frame.manufacturer || 'Unknown',
      brand: frame.brand || 'Unknown',
      collection: frame.collection || null,
      model: frame.model || 'Unknown',
      color: frame.color || 'Unknown',
      colorCode: frame.colorCode || null,
      eyeSize: parseInt2(frame.eyeSize),
      bridge: parseInt2(frame.bridge),
      temple: parseInt2(frame.temple),
      upc: frame.upc || null,
      sku: sku,
      internalId: frame.internalId || null,
      wholesaleCost: parsePrice(frame.wholesale),
      retailPrice: parsePrice(frame.retail),
      stockQuantity: totalStock,
      gender: parseGender(frame.description),
      description: frame.description || null,
      isActive: true,
      locations: locations,
    });
  }

  // Insert in batches of 100
  const BATCH_SIZE = 100;
  let inserted = 0;
  let errors = 0;

  console.log(`\nInserting ${frameData.length} frames in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < frameData.length; i += BATCH_SIZE) {
    const batch = frameData.slice(i, i + BATCH_SIZE);

    try {
      const result = await prisma.frame.createMany({
        data: batch,
        skipDuplicates: true,
      });
      inserted += result.count;

      if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= frameData.length) {
        console.log(`  Processed ${Math.min(i + BATCH_SIZE, frameData.length)}/${frameData.length} frames (${inserted} inserted)...`);
      }
    } catch (err) {
      errors++;
      console.error(`Error in batch ${i}-${i + BATCH_SIZE}:`, err);
    }
  }

  console.log(`\nDone! Inserted ${inserted} frames, ${errors} batch errors`);

  // Verify
  const count = await prisma.frame.count();
  console.log(`Total frames in database: ${count}`);

  const withBothLocations = await prisma.frame.count({
    where: { locations: { hasEvery: ['Insight', 'Spectrum'] } }
  });
  console.log(`Frames at both locations: ${withBothLocations}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
