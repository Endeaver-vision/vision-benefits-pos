import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createSampleTransactions() {
  console.log('🛒 Creating sample transactions for analytics...')

  try {
    // Get required data
    const [location, users, customers, products] = await Promise.all([
      prisma.location.findFirst(),
      prisma.user.findMany(),
      prisma.customer.findMany(),
      prisma.product.findMany({
        include: {
          category: true
        }
      })
    ])

    if (!location || users.length === 0 || customers.length === 0 || products.length === 0) {
      throw new Error('Missing required data. Please run main seed scripts first.')
    }

    // Create transactions for the last 30 days
    const transactions = []
    const now = new Date()
    
    for (let daysBack = 29; daysBack >= 0; daysBack--) {
      const transactionDate = new Date()
      transactionDate.setDate(now.getDate() - daysBack)
      
      // Vary number of transactions per day (higher on weekends)
      const isWeekend = transactionDate.getDay() === 0 || transactionDate.getDay() === 6
      const baseTransactions = isWeekend ? 8 : 5
      const numTransactions = Math.floor(Math.random() * 4) + baseTransactions
      
      for (let i = 0; i < numTransactions; i++) {
        // Random time during business hours (9 AM - 7 PM)
        const hour = 9 + Math.floor(Math.random() * 10)
        const minute = Math.floor(Math.random() * 60)
        transactionDate.setHours(hour, minute, 0, 0)
        
        const customer = customers[Math.floor(Math.random() * customers.length)]
        const user = users[Math.floor(Math.random() * users.length)]
        
        // Generate transaction items (1-4 items per transaction)
        const numItems = Math.floor(Math.random() * 4) + 1
        const transactionItems = []
        const selectedProducts = new Set()
        
        for (let j = 0; j < numItems; j++) {
          let product
          do {
            product = products[Math.floor(Math.random() * products.length)]
          } while (selectedProducts.has(product.id))
          
          selectedProducts.add(product.id)
          
          const quantity = Math.floor(Math.random() * 2) + 1
          const basePrice = product.basePrice
          
          // Apply insurance discount based on customer
          let insuranceDiscount = 0
          let insuranceTier = null
          
          if (customer.insuranceCarrier) {
            switch (customer.insuranceCarrier) {
              case 'VSP':
                if (product.tierVsp) {
                  insuranceTier = product.tierVsp
                  insuranceDiscount = getVspDiscount(product.tierVsp) * basePrice
                }
                break
              case 'EyeMed':
                if (product.tierEyemed) {
                  insuranceTier = product.tierEyemed
                  insuranceDiscount = getEyemedDiscount(product.tierEyemed) * basePrice
                }
                break
              case 'Spectera':
                if (product.tierSpectera) {
                  insuranceTier = product.tierSpectera
                  insuranceDiscount = getSpecteraDiscount(product.tierSpectera) * basePrice
                }
                break
            }
          }
          
          const unitPrice = Math.max(basePrice - insuranceDiscount, basePrice * 0.1) // Minimum 10% of base price
          const itemTotal = unitPrice * quantity
          
          transactionItems.push({
            productId: product.id,
            quantity,
            unitPrice,
            discount: 0,
            total: itemTotal,
            insuranceTier,
            insuranceDiscount: insuranceDiscount * quantity
          })
        }
        
        // Calculate transaction totals
        const subtotal = transactionItems.reduce((sum, item) => sum + item.total, 0)
        const totalInsuranceDiscount = transactionItems.reduce((sum, item) => sum + item.insuranceDiscount, 0)
        const tax = subtotal * 0.0875 // 8.75% tax rate
        const total = subtotal + tax
        
        transactions.push({
          customerId: customer.id,
          userId: user.id,
          locationId: location.id,
          subtotal,
          tax,
          discount: 0,
          total,
          insuranceCarrier: customer.insuranceCarrier,
          insuranceDiscount: totalInsuranceDiscount,
          patientPortion: total,
          status: 'COMPLETED' as const,
          paymentMethod: getRandomPaymentMethod(),
          createdAt: new Date(transactionDate),
          updatedAt: new Date(transactionDate),
          items: transactionItems
        })
      }
    }

    console.log(`💳 Creating ${transactions.length} sample transactions...`)

    // Create transactions with items
    for (const txData of transactions) {
      const { items, ...transactionData } = txData
      
      const transaction = await prisma.transaction.create({
        data: transactionData
      })
      
      // Create transaction items
      for (const itemData of items) {
        await prisma.transactionItem.create({
          data: {
            ...itemData,
            transactionId: transaction.id
          }
        })
      }
    }

    console.log('✅ Sample transactions created successfully!')
    
    // Print summary
    const totalRevenue = transactions.reduce((sum, tx) => sum + tx.total, 0)
    const avgOrderValue = totalRevenue / transactions.length
    
    console.log(`📊 Summary:`)
    console.log(`   - Total transactions: ${transactions.length}`)
    console.log(`   - Total revenue: $${totalRevenue.toFixed(2)}`)
    console.log(`   - Average order value: $${avgOrderValue.toFixed(2)}`)
    console.log(`   - Date range: ${transactions[0]?.createdAt.toDateString()} to ${now.toDateString()}`)

  } catch (error) {
    console.error('❌ Error creating sample transactions:', error)
    throw error
  }
}

function getVspDiscount(tier: string): number {
  switch (tier) {
    case 'K': return 0.40 // 40% discount
    case 'J': return 0.30 // 30% discount
    case 'F': return 0.20 // 20% discount
    case 'O': return 0.15 // 15% discount
    case 'N': return 0.10 // 10% discount
    default: return 0
  }
}

function getEyemedDiscount(tier: string): number {
  switch (tier) {
    case 'tier_1': return 0.40
    case 'tier_2': return 0.30
    case 'tier_3': return 0.20
    case 'tier_4': return 0.15
    case 'tier_5': return 0.10
    default: return 0
  }
}

function getSpecteraDiscount(tier: string): number {
  switch (tier) {
    case 'I': return 0.40
    case 'II': return 0.30
    case 'III': return 0.20
    case 'IV': return 0.15
    case 'V': return 0.10
    default: return 0
  }
}

function getRandomPaymentMethod(): string {
  const methods = ['Credit Card', 'Cash', 'Insurance', 'Debit Card']
  return methods[Math.floor(Math.random() * methods.length)]
}

async function main() {
  try {
    await createSampleTransactions()
  } catch (error) {
    console.error(error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}

export { createSampleTransactions }