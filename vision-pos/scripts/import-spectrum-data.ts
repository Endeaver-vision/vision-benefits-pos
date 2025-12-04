import { PrismaClient } from '@prisma/client'
import fs from 'fs'

const prisma = new PrismaClient()
const SPECTRUM_LOCATION_ID = 'spectrum_vision_ihb'

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter(l => l.trim())
  const headers = lines[0].replace(/^\uFEFF/, '').split(',').map(h => h.trim())
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values: string[] = []
    let current = '', inQuotes = false
    for (const char of lines[i]) {
      if (char === '"') inQuotes = !inQuotes
      else if (char === ',' && !inQuotes) { values.push(current.trim()); current = '' }
      else current += char
    }
    values.push(current.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => row[h] = values[idx] || '')
    rows.push(row)
  }
  return rows
}

async function main() {
  console.log('🚀 Fast import starting...\n')

  // FRAMES
  console.log('📦 Loading frames CSV...')
  const frameRows = parseCSV(fs.readFileSync('/Users/cmac/Downloads/spectrum_frame_inventory.csv', 'utf-8'))
  const frames = frameRows.map((row, i) => ({
    manufacturer: row['Manufacturer'] || 'Unknown',
    brand: row['Brand'] || row['Manufacturer'] || 'Unknown',
    collection: row['Collection'] || null,
    model: row['Model'] || 'Unknown',
    color: row['Color'] || 'Unknown',
    colorCode: row['Color Code'] || null,
    eyeSize: parseInt(row['Eye']) || null,
    bridge: parseInt(row['Bridge']) || null,
    temple: parseInt(row['Temple']) || null,
    upc: row['UPC'] || null,
    sku: row['UPC'] || `spectrum_${row['#'] || i}`,
    internalId: row['#'] || null,
    description: row['Description'] || null,
    retailPrice: parseFloat(row['Retail']?.replace(/[$,]/g, '')) || 0,
    wholesaleCost: parseFloat(row['Wholesale']?.replace(/[$,]/g, '')) || 0,
    stockQuantity: parseInt(row['Stock']) || 0,
  }))
  console.log(`  Parsed ${frames.length} frames, inserting...`)
  const frameResult = await prisma.frame.createMany({ data: frames, skipDuplicates: true })
  console.log(`✓ Frames: ${frameResult.count} inserted\n`)

  // CUSTOMERS
  console.log('👥 Loading customers CSV...')
  const custRows = parseCSV(fs.readFileSync('/Users/cmac/Downloads/spectrum_final.csv', 'utf-8'))
  const customers = custRows.map(row => ({
    customerNumber: row['Patient #'] ? `SP-${row['Patient #']}` : null,
    firstName: row['Patient First Name'] || 'Unknown',
    lastName: row['Patient Last Name'] || 'Unknown',
    address: row['Patient Address 1'] || null,
    city: row['Patient City'] || null,
    state: row['Patient State/Prov'] || null,
    zipCode: row['Patient Zip Code'] || null,
    phone: row['Patient Preferred Phone']?.replace(/[^\d]/g, '').slice(-10) || null,
    email: row['Patient Email'] || null,
    lastVisit: row['Last Exam Date'] ? new Date(row['Last Exam Date']) : null,
    primaryLocationId: SPECTRUM_LOCATION_ID,
  }))
  console.log(`  Parsed ${customers.length} customers, inserting...`)
  const custResult = await prisma.customer.createMany({ data: customers, skipDuplicates: true })
  console.log(`✓ Customers: ${custResult.count} inserted\n`)

  // Summary
  const [frameCount, customerCount] = await Promise.all([prisma.frame.count(), prisma.customer.count()])
  console.log(`📊 Database totals: ${frameCount} frames, ${customerCount} customers`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
