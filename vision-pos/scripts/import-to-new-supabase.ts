import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const SUPABASE_URL = 'https://arflfrnwnbpnhpghwilk.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_KEY env var required')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

function parseCSV(content: string): any[] {
  const lines = content.split('\n')
  const headers = lines[0].split(',')
  const rows: any[] = []

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue

    // Handle quoted fields with commas
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current)
        current = ''
      } else {
        current += char
      }
    }
    values.push(current)

    const row: any = {}
    headers.forEach((header, idx) => {
      let val = values[idx] || ''
      // Convert empty strings to null for certain fields
      if (val === '' || val === 'null') {
        row[header] = null
      } else if (val === 't') {
        row[header] = true
      } else if (val === 'f') {
        row[header] = false
      } else if (header.includes('Date') || header === 'createdAt' || header === 'updatedAt' || header === 'lastVisit' || header === 'registrationDate') {
        row[header] = val || null
      } else if (['totalSpent', 'averageOrderValue', 'customerLifetimeValue', 'wholesaleCost', 'retailPrice'].includes(header)) {
        row[header] = val ? parseFloat(val) : 0
      } else if (['eyeSize', 'bridge', 'temple', 'stockQuantity', 'posDisplayOrder'].includes(header)) {
        row[header] = val ? parseInt(val) : null
      } else {
        row[header] = val
      }
    })
    rows.push(row)
  }
  return rows
}

async function importCustomers() {
  const csv = fs.readFileSync(path.join(__dirname, '../db-backup-20251211/customers.csv'), 'utf8')
  const customers = parseCSV(csv)

  console.log(`Importing ${customers.length} customers...`)

  const batchSize = 100
  for (let i = 0; i < customers.length; i += batchSize) {
    const batch = customers.slice(i, i + batchSize)
    const { error } = await supabase.from('customers').insert(batch)
    if (error) {
      console.error(`Error at batch ${i}:`, error.message)
    } else {
      console.log(`Imported customers ${i + 1} to ${Math.min(i + batchSize, customers.length)}`)
    }
  }
}

async function importFrames() {
  const csv = fs.readFileSync(path.join(__dirname, '../db-backup-20251211/frames.csv'), 'utf8')
  const frames = parseCSV(csv)

  console.log(`Importing ${frames.length} frames...`)

  const batchSize = 100
  for (let i = 0; i < frames.length; i += batchSize) {
    const batch = frames.slice(i, i + batchSize)
    const { error } = await supabase.from('frames').insert(batch)
    if (error) {
      console.error(`Error at batch ${i}:`, error.message)
    } else {
      console.log(`Imported frames ${i + 1} to ${Math.min(i + batchSize, frames.length)}`)
    }
  }
}

async function main() {
  console.log('Starting import...')
  await importCustomers()
  await importFrames()
  console.log('Done!')
}

main()
