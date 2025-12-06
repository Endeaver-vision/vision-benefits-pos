import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Updating stage configurations to match workflow...')

  // Update configurations to match: Invoice/Order same day, ship next day, vendor 3 days, receive/QC/notify same day
  const updates = [
    // Day 0 - Same day
    { stage: 'SUBMITTED', expected: 2, warning: 4, critical: 8 },        // 2h to confirm
    { stage: 'CONFIRMED', expected: 4, warning: 8, critical: 12 },       // 4h to ship to vendor (rest of day)
    
    // Day 1 - Ship to vendor
    { stage: 'SHIPPED_TO_VENDOR', expected: 24, warning: 36, critical: 48 },  // 24h to reach vendor
    
    // Days 2-4 - Vendor processing (3 days = 72 hours)
    { stage: 'VENDOR_PROCESSING', expected: 72, warning: 96, critical: 120 },
    
    // Day 5 - Arrives back, all same day
    { stage: 'VENDOR_SHIPPED', expected: 24, warning: 36, critical: 48 },     // 24h to arrive back
    { stage: 'RECEIVED', expected: 1, warning: 2, critical: 4 },              // 1h to QC
    { stage: 'QUALITY_CHECK', expected: 2, warning: 4, critical: 8 },         // 2h to complete QC
    { stage: 'PATIENT_NOTIFIED', expected: 4, warning: 8, critical: 12 },     // 4h to notify patient
  ]

  for (const update of updates) {
    await prisma.$executeRawUnsafe(`
      UPDATE "order_stage_configs"
      SET 
        "expectedDurationHours" = ${update.expected},
        "warningThresholdHours" = ${update.warning},
        "criticalThresholdHours" = ${update.critical},
        "updatedAt" = NOW()
      WHERE "stage" = '${update.stage}'
    `)
    console.log(`✓ Updated ${update.stage}: ${update.expected}h expected, ${update.warning}h warning, ${update.critical}h critical`)
  }

  console.log('\n📊 Updated Workflow Timeline:')
  console.log('Day 0: SUBMITTED (2h) → CONFIRMED (4h)')
  console.log('Day 1: SHIPPED_TO_VENDOR (24h)')
  console.log('Days 2-4: VENDOR_PROCESSING (72h = 3 days)')
  console.log('Day 5: VENDOR_SHIPPED (24h) → RECEIVED (1h) → QUALITY_CHECK (2h) → PATIENT_NOTIFIED (4h)')
  console.log('\n✅ Stage configurations updated successfully!')
}

main()
  .catch((e) => {
    console.error('Update failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
