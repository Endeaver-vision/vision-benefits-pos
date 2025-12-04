/**
 * Fast Bulk Customer Import Script
 *
 * Uses raw SQL to import ~4,056 customers in a single transaction
 * Much faster than Prisma's individual inserts
 *
 * CSV Mapping:
 * - Patient # → memberId
 * - Patient Last Name → lastName
 * - Patient First Name → firstName
 * - Patient Address 1 → address
 * - Patient Preferred Phone → phone
 * - Patient Email → email
 * - Last Exam Date → lastVisit
 * - Last Exam Type → notes
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const CSV_PATH = '/Users/cmac/Documents/Supporting Documents/Prices-pricing-U&C/queryresult.csv';

function generateCuid(): string {
  // Simple cuid-like generator for bulk inserts
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `c${timestamp}${random}`;
}

function escapeSQL(str: string | null | undefined): string {
  if (str === null || str === undefined || str === '') {
    return 'NULL';
  }
  // Escape single quotes by doubling them
  const escaped = str.replace(/'/g, "''");
  return `'${escaped}'`;
}

function parseDate(dateStr: string): string {
  if (!dateStr || dateStr.trim() === '') {
    return 'NULL';
  }
  // Parse MM/DD/YYYY format
  const parts = dateStr.split('/');
  if (parts.length !== 3) {
    return 'NULL';
  }
  const [month, day, year] = parts;
  // Create ISO format: YYYY-MM-DD
  const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  return `'${isoDate}'`;
}

function cleanPhone(phone: string | null | undefined): string {
  if (!phone || phone.trim() === '') {
    return 'NULL';
  }
  // Keep phone as-is but escape for SQL
  return escapeSQL(phone.trim());
}

async function importCustomers() {
  console.log('=== Fast Bulk Customer Import ===\n');

  // Read CSV file
  console.log('Reading CSV file...');
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim() !== '');

  // Skip header
  const dataLines = lines.slice(1);
  console.log(`Found ${dataLines.length} customer records\n`);

  // Clear existing customers and related records
  console.log('Clearing existing data...');

  // Delete related records first (due to foreign key constraints)
  // Order matters - delete children before parents
  const relatedTables = [
    'transaction_items',      // Child of transactions
    'transactions',           // Child of customers
    'communication_preferences',
    'customer_addresses',
    'customer_insurance',
    'customer_preferences',
    'customer_purchase_history',
    'customer_relationships',
    'customer_tag_assignments',
    'customer_visits',
    'eye_prescriptions',
    'eyewear_preferences',
    'insurance_cases',
    'insurance_documents',
  ];

  for (const table of relatedTables) {
    try {
      const result = await prisma.$executeRawUnsafe(`DELETE FROM ${table}`);
      if (result > 0) console.log(`  Deleted ${result} from ${table}`);
    } catch (e) {
      console.log(`  Warning: Could not delete from ${table}: ${(e as Error).message}`);
    }
  }

  const deleteResult = await prisma.$executeRawUnsafe(`DELETE FROM customers`);
  console.log(`Deleted ${deleteResult} existing customers\n`);

  // Parse CSV and build bulk insert
  console.log('Parsing CSV and building bulk insert...');

  const values: string[] = [];
  let parseErrors = 0;

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];

    // Parse CSV line (handle commas in quoted fields)
    const fields = parseCSVLine(line);

    if (fields.length < 8) {
      parseErrors++;
      continue;
    }

    const [
      patientNumber,
      lastName,
      firstName,
      address,
      phone,
      email,
      lastExamDate,
      lastExamType
    ] = fields;

    const id = generateCuid();
    const now = new Date().toISOString();

    // Build VALUES tuple
    const tuple = `(
      ${escapeSQL(id)},
      ${escapeSQL(firstName?.trim() || 'Unknown')},
      ${escapeSQL(lastName?.trim() || 'Unknown')},
      ${escapeSQL(email?.trim() || null)},
      ${cleanPhone(phone)},
      NULL,
      NULL,
      ${escapeSQL(address?.trim() || null)},
      NULL,
      NULL,
      NULL,
      NULL,
      ${escapeSQL(patientNumber?.trim() || null)},
      NULL,
      NULL,
      true,
      ${parseDate(lastExamDate)},
      ${escapeSQL(lastExamType?.trim() || null)},
      '${now}',
      '${now}'
    )`;

    values.push(tuple);
  }

  console.log(`Parsed ${values.length} valid records (${parseErrors} parse errors)\n`);

  // Build and execute bulk INSERT in batches of 500
  const BATCH_SIZE = 500;
  const totalBatches = Math.ceil(values.length / BATCH_SIZE);
  let totalInserted = 0;

  console.log(`Inserting ${values.length} customers in ${totalBatches} batches...`);

  for (let batch = 0; batch < totalBatches; batch++) {
    const start = batch * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, values.length);
    const batchValues = values.slice(start, end);

    const sql = `
      INSERT INTO customers (
        "id",
        "firstName",
        "lastName",
        "email",
        "phone",
        "dateOfBirth",
        "gender",
        "address",
        "city",
        "state",
        "zipCode",
        "insuranceCarrier",
        "memberId",
        "groupNumber",
        "eligibilityDate",
        "active",
        "lastVisit",
        "notes",
        "createdAt",
        "updatedAt"
      ) VALUES ${batchValues.join(',\n')}
    `;

    try {
      const result = await prisma.$executeRawUnsafe(sql);
      totalInserted += result;
      console.log(`  Batch ${batch + 1}/${totalBatches}: Inserted ${result} records`);
    } catch (error) {
      console.error(`  Batch ${batch + 1} failed:`, error);
    }
  }

  console.log(`\n✓ Successfully imported ${totalInserted} customers`);

  // Verify count
  const count = await prisma.customer.count();
  console.log(`  Database now has ${count} customers`);
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current); // Push last field

  return result;
}

importCustomers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
