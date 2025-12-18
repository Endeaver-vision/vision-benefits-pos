import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// Location IDs from database
const LOCATIONS = {
  insight: 'cmi990a9l00000b065hm0sb0a',
  spectrum: 'spectrum_vision_ihb'
}

interface FrameRecord {
  brand: string
  model: string
  color: string
  colorCode: string
  eyeSize: number | null
  bridge: number | null
  temple: number | null
  upc: string
  sku: string
  retailPrice: number
  wholesaleCost: number
  insightStock: number
  spectrumStock: number
}

function parseCSV(content: string): string[][] {
  const lines = content.split('\n')
  const result: string[][] = []

  for (const line of lines) {
    if (!line.trim()) continue

    const row: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    row.push(current.trim())
    result.push(row)
  }

  return result
}

function parsePrice(price: string): number {
  if (!price) return 0
  const cleaned = price.replace(/[$,]/g, '').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

function parseStock(stock: string): number {
  if (!stock) return 0
  const num = parseInt(stock.trim())
  // Convert negative stock to 0
  return isNaN(num) || num < 0 ? 0 : num
}

async function importFrames() {
  console.log('Starting frame import with location tracking...\n')

  // Read both CSV files
  const insightPath = '/Users/cmac/Documents/vision-pos-order-tracking/Frames-insight.csv'
  const spectrumPath = '/Users/cmac/Documents/Cleanup/Frames-spectrum.csv'

  const insightContent = fs.readFileSync(insightPath, 'utf-8').replace(/^\uFEFF/, '')
  const spectrumContent = fs.readFileSync(spectrumPath, 'utf-8').replace(/^\uFEFF/, '')

  const insightRows = parseCSV(insightContent)
  const spectrumRows = parseCSV(spectrumContent)

  console.log(`Insight CSV: ${insightRows.length - 1} rows`)
  console.log(`Spectrum CSV: ${spectrumRows.length - 1} rows`)

  // Map to merge frames by brand+model+color
  const frameMap = new Map<string, FrameRecord>()

  // Process Insight frames (skip header)
  // Columns: Manufacturer,Brand,Collection,Model,Color,Color Code,Eye,Bridge,Temple,#,Description,UPC,SKU,Retail,Wholesale,Stock
  for (let i = 1; i < insightRows.length; i++) {
    const row = insightRows[i]
    if (row.length < 16) continue

    const brand = row[1]?.trim()
    const model = row[3]?.trim()
    const color = row[4]?.trim()

    if (!brand || !model || !color) continue

    const key = `${brand}|${model}|${color}`.toLowerCase()
    const stock = parseStock(row[15])

    if (frameMap.has(key)) {
      // Add to existing frame's insight stock
      const existing = frameMap.get(key)!
      existing.insightStock += stock
    } else {
      frameMap.set(key, {
        brand,
        model,
        color,
        colorCode: row[5]?.trim() || '',
        eyeSize: parseInt(row[6]) || null,
        bridge: parseInt(row[7]) || null,
        temple: parseInt(row[8]) || null,
        upc: row[11]?.trim() || '',
        sku: row[12]?.trim() || '',
        retailPrice: parsePrice(row[13]),
        wholesaleCost: parsePrice(row[14]),
        insightStock: stock,
        spectrumStock: 0
      })
    }
  }

  // Process Spectrum frames (skip header)
  for (let i = 1; i < spectrumRows.length; i++) {
    const row = spectrumRows[i]
    if (row.length < 16) continue

    const brand = row[1]?.trim()
    const model = row[3]?.trim()
    const color = row[4]?.trim()

    if (!brand || !model || !color) continue

    const key = `${brand}|${model}|${color}`.toLowerCase()
    const stock = parseStock(row[15])

    if (frameMap.has(key)) {
      // Add to existing frame's spectrum stock
      const existing = frameMap.get(key)!
      existing.spectrumStock += stock
    } else {
      frameMap.set(key, {
        brand,
        model,
        color,
        colorCode: row[5]?.trim() || '',
        eyeSize: parseInt(row[6]) || null,
        bridge: parseInt(row[7]) || null,
        temple: parseInt(row[8]) || null,
        upc: row[11]?.trim() || '',
        sku: row[12]?.trim() || '',
        retailPrice: parsePrice(row[13]),
        wholesaleCost: parsePrice(row[14]),
        insightStock: 0,
        spectrumStock: stock
      })
    }
  }

  console.log(`\nUnique frames after merge: ${frameMap.size}`)

  // Count stats
  let insightOnly = 0
  let spectrumOnly = 0
  let bothLocations = 0
  let totalInsightStock = 0
  let totalSpectrumStock = 0

  for (const frame of frameMap.values()) {
    if (frame.insightStock > 0 && frame.spectrumStock > 0) bothLocations++
    else if (frame.insightStock > 0) insightOnly++
    else if (frame.spectrumStock > 0) spectrumOnly++
    totalInsightStock += frame.insightStock
    totalSpectrumStock += frame.spectrumStock
  }

  console.log(`\nLocation breakdown:`)
  console.log(`  Insight only: ${insightOnly}`)
  console.log(`  Spectrum only: ${spectrumOnly}`)
  console.log(`  Both locations: ${bothLocations}`)
  console.log(`  Total Insight stock: ${totalInsightStock}`)
  console.log(`  Total Spectrum stock: ${totalSpectrumStock}`)

  // Clear existing data
  console.log('\nClearing existing frame data...')
  await prisma.frameInventory.deleteMany({})
  await prisma.frame.deleteMany({})

  // Insert frames in batches
  console.log('\nInserting frames...')
  const frames = Array.from(frameMap.values())
  const batchSize = 100
  let insertedCount = 0
  const skuSet = new Set<string>()

  for (let i = 0; i < frames.length; i += batchSize) {
    const batch = frames.slice(i, i + batchSize)

    for (const frame of batch) {
      // Generate unique SKU if empty or duplicate
      let sku = frame.sku || null
      if (sku && skuSet.has(sku)) {
        sku = null // Clear duplicate SKU
      }
      if (sku) skuSet.add(sku)

      const totalStock = frame.insightStock + frame.spectrumStock

      try {
        const created = await prisma.frame.create({
          data: {
            manufacturer: '', // No longer using manufacturer
            brand: frame.brand,
            collection: null, // No longer using collection
            model: frame.model,
            color: frame.color,
            colorCode: frame.colorCode || null,
            eyeSize: frame.eyeSize,
            bridge: frame.bridge,
            temple: frame.temple,
            upc: frame.upc || null,
            sku: sku,
            wholesaleCost: frame.wholesaleCost,
            retailPrice: frame.retailPrice,
            stockQuantity: totalStock,
            pricingCategory: 'FRAME',
            isActive: true,
            showInPos: true
          }
        })

        // Create inventory records for each location with stock
        const inventoryRecords = []

        if (frame.insightStock > 0) {
          inventoryRecords.push({
            frameId: created.id,
            locationId: LOCATIONS.insight,
            quantity: frame.insightStock
          })
        }

        if (frame.spectrumStock > 0) {
          inventoryRecords.push({
            frameId: created.id,
            locationId: LOCATIONS.spectrum,
            quantity: frame.spectrumStock
          })
        }

        if (inventoryRecords.length > 0) {
          await prisma.frameInventory.createMany({
            data: inventoryRecords
          })
        }

        insertedCount++
      } catch (err) {
        // Skip on error (likely duplicate)
        console.error(`Error inserting ${frame.brand} ${frame.model}: ${err}`)
      }
    }

    process.stdout.write(`\rInserted ${insertedCount} frames...`)
  }

  console.log(`\n\nImport complete!`)
  console.log(`Total frames: ${insertedCount}`)

  // Verify inventory records
  const inventoryCount = await prisma.frameInventory.count()
  console.log(`Inventory records created: ${inventoryCount}`)

  // Show sample
  const sample = await prisma.frame.findMany({
    take: 5,
    include: {
      inventory: {
        include: {
          location: true
        }
      }
    }
  })

  console.log('\nSample frames with inventory:')
  for (const f of sample) {
    console.log(`  ${f.brand} ${f.model} (${f.color}): ${f.stockQuantity} total`)
    for (const inv of f.inventory) {
      console.log(`    - ${inv.location.name}: ${inv.quantity}`)
    }
  }
}

importFrames()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
