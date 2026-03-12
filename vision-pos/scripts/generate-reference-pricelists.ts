import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

interface PriceListRow {
  category: string
  productName: string
  wholesale: number
  retail: number
  multiplier: number
  vspTier: string
  eyemedTier: string
  specteraTier: string
  cashOnly: boolean
  note: string
}

const prisma = new PrismaClient()

function parseCSV(content: string): PriceListRow[] {
  const lines = content.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  
  return lines.slice(1).map(line => {
    // Simple CSV parsing (handles quoted strings)
    const cells: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    cells.push(current.trim())
    
    return {
      category: cells[0]?.replace(/"/g, '') || '',
      productName: cells[1]?.replace(/"/g, '') || '',
      wholesale: parseFloat(cells[2]) || 0,
      retail: parseFloat(cells[3]) || 0,
      multiplier: parseFloat(cells[4]) || 0,
      vspTier: cells[5]?.replace(/"/g, '') || '',
      eyemedTier: cells[6]?.replace(/"/g, '') || '',
      specteraTier: cells[7]?.replace(/"/g, '') || '',
      cashOnly: cells[8]?.toLowerCase() === 'yes',
      note: cells[9]?.replace(/"/g, '') || ''
    }
  })
}

async function generateReferencePriceLists() {
  console.log('📋 Loading product pricelist...')
  
  // Read FINAL_PRODUCT_PRICELIST.csv
  const pricelistPath = '/Users/cmac/let/vision-pos/Reference-Docs/FINAL_PRODUCT_PRICELIST.csv'
  const pricelistContent = fs.readFileSync(pricelistPath, 'utf-8')
  const products = parseCSV(pricelistContent)
  
  console.log(`✓ Loaded ${products.length} products\n`)
  
  // Get all active authorizations
  console.log('🔍 Fetching authorizations from database...')
  const auths = await prisma.insuranceAuthorization.findMany({
    where: { isActive: true },
    include: {
      customer: {
        select: { firstName: true, lastName: true, id: true }
      }
    },
    orderBy: { carrier: 'asc' }
  })
  
  console.log(`✓ Found ${auths.length} active authorizations\n`)
  
  // Create output directory structure
  const baseDir = '/Users/cmac/let/vision-pos/reference-pricelists'
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true })
  }
  
  let generatedCount = 0
  
  // Generate reference pricelist for each auth
  for (const auth of auths) {
    const customerName = `${auth.customer?.firstName || 'Unknown'}_${auth.customer?.lastName || 'Unknown'}`.replace(/\s+/g, '_')
    const carrierFolder = auth.carrier.toUpperCase()
    const outputDir = path.join(baseDir, carrierFolder)
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    const cleanPlanName = (auth.planName || 'Unknown').replace(/[^a-zA-Z0-9]/g, '_')
    const filename = `${customerName}_${cleanPlanName}_RefPriceList.csv`
    const filepath = path.join(outputDir, filename)
    
    // Generate price list for this customer
    const priceLines = ['Product Name,Category,Retail Price,Patient Cost,Insurance Pays,Savings,Tier Used,Pricing Method,Note']
    
    for (const product of products) {
      try {
        const retail = product.retail
        if (retail === 0 && product.category.includes('EXAM')) continue // Skip service exams
        
        const carrier = auth.carrier.toLowerCase()
        let tier = ''
        
        if (carrier === 'eyemed') {
          tier = product.eyemedTier
        } else if (carrier === 'vsp') {
          tier = product.vspTier
        } else if (carrier === 'spectera') {
          tier = product.specteraTier
        }
        
        let patientCost = 0
        let insurancePays = 0
        let pricingMethod = 'cash'
        
        // Determine pricing based on category and auth benefits
        const category = product.category.toUpperCase()
        
        if (category.includes('EXAM')) {
          if (auth.examEligible && auth.examCopay !== null) {
            patientCost = Number(auth.examCopay)
            insurancePays = Math.max(0, retail - patientCost)
            pricingMethod = 'exam_copay'
          } else {
            patientCost = retail
          }
        } else if (category.includes('CONTACT LENS FITTING')) {
          if (auth.contactsEligible && auth.clExamCopay !== null) {
            patientCost = Number(auth.clExamCopay)
            insurancePays = Math.max(0, retail - patientCost)
            pricingMethod = 'cl_copay'
          } else {
            patientCost = retail
          }
        } else if (category.includes('LENS') || category.includes('MATERIAL')) {
          if (auth.lensesEligible) {
            // Frame vs lenses
            if (category.includes('FRAME')) {
              // Frame allowance
              if (auth.frameAllowance !== null) {
                const allowance = Number(auth.frameAllowance)
                patientCost = Math.max(0, retail - allowance)
                insurancePays = Math.min(retail, allowance)
                pricingMethod = 'frame_allowance'
                
                // Apply overage discount if applicable
                if (patientCost > 0 && auth.overageDiscountFrame !== null) {
                  const discountRate = Number(auth.overageDiscountFrame) / 100
                  patientCost = patientCost * (1 - discountRate)
                  pricingMethod = `frame_allowance_${auth.overageDiscountFrame}%_overage`
                }
              }
            } else {
              // Lenses/materials copay
              if (auth.materialsCopay !== null) {
                patientCost = Number(auth.materialsCopay)
                insurancePays = Math.max(0, retail - patientCost)
                pricingMethod = 'materials_copay'
              }
            }
          } else {
            patientCost = retail
          }
        } else if (category.includes('COATING') || category.includes('TREATMENT')) {
          // Addons - patient pays full unless covered
          patientCost = retail
          pricingMethod = 'addon'
        } else {
          patientCost = retail
        }
        
        const savings = Math.max(0, insurancePays)
        const line = `"${product.productName}","${product.category}",${retail},${patientCost.toFixed(2)},${insurancePays.toFixed(2)},${savings.toFixed(2)},"${tier}","${pricingMethod}","${product.note}"`
        priceLines.push(line)
      } catch (err) {
        console.error(`Error pricing ${product.productName}:`, err)
      }
    }
    
    // Write to file
    fs.writeFileSync(filepath, priceLines.join('\n'))
    generatedCount++
    console.log(`✓ ${filename}`)
  }
  
  console.log(`\n✅ Generated ${generatedCount} reference price lists`)
  console.log(`📁 Location: ${baseDir}`)
  
  await prisma.$disconnect()
}

generateReferencePriceLists().catch(e => {
  console.error('❌ Error:', e)
  process.exit(1)
})
