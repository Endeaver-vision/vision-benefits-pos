import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createInventoryData() {
  console.log('🌱 Seeding inventory data...')

  try {
    // Get the first location (should exist from previous seeding)
    const location = await prisma.location.findFirst()
    if (!location) {
      throw new Error('No location found. Please run the main seed script first.')
    }

    // Get categories
    const categories = await prisma.productCategory.findMany()
    if (categories.length === 0) {
      throw new Error('No categories found. Please run the main seed script first.')
    }

    const framesCategory = categories.find(c => c.code === 'frames')
    const lensesCategory = categories.find(c => c.code === 'lenses')
    const coatingsCategory = categories.find(c => c.code === 'coatings')

    if (!framesCategory || !lensesCategory || !coatingsCategory) {
      throw new Error('Required categories not found.')
    }

    // Create additional products for inventory
    const inventoryProducts = [
      // Frames
      {
        name: 'Ray-Ban Classic Aviator',
        sku: 'RB3025-001',
        categoryId: framesCategory.id,
        manufacturer: 'Ray-Ban',
        basePrice: 189.99,
        tierVsp: 'F',
        tierEyemed: 'tier_2',
        tierSpectera: 'II',
      },
      {
        name: 'Oakley Holbrook',
        sku: 'OO9102-01',
        categoryId: framesCategory.id,
        manufacturer: 'Oakley',
        basePrice: 149.99,
        tierVsp: 'J',
        tierEyemed: 'tier_3',
        tierSpectera: 'III',
      },
      {
        name: 'Tom Ford Designer Frame',
        sku: 'TF5401-001',
        categoryId: framesCategory.id,
        manufacturer: 'Tom Ford',
        basePrice: 425.00,
        tierVsp: 'O',
        tierEyemed: 'tier_5',
        tierSpectera: 'V',
      },
      {
        name: 'Warby Parker Harper',
        sku: 'WP-HARPER-BLK',
        categoryId: framesCategory.id,
        manufacturer: 'Warby Parker',
        basePrice: 95.00,
        tierVsp: 'K',
        tierEyemed: 'tier_1',
        tierSpectera: 'I',
      },
      
      // Lenses
      {
        name: 'Single Vision CR-39',
        sku: 'SV-CR39-STD',
        categoryId: lensesCategory.id,
        manufacturer: 'Essilor',
        basePrice: 89.99,
        tierVsp: 'K',
        tierEyemed: 'tier_1',
        tierSpectera: 'I',
      },
      {
        name: 'Progressive Varilux Comfort',
        sku: 'PROG-VAR-COMF',
        categoryId: lensesCategory.id,
        manufacturer: 'Essilor',
        basePrice: 295.00,
        tierVsp: 'F',
        tierEyemed: 'tier_3',
        tierSpectera: 'III',
      },
      {
        name: 'High Index 1.67',
        sku: 'HI-167-STD',
        categoryId: lensesCategory.id,
        manufacturer: 'Zeiss',
        basePrice: 199.99,
        tierVsp: 'J',
        tierEyemed: 'tier_2',
        tierSpectera: 'II',
      },
      
      // Coatings
      {
        name: 'Anti-Reflective Coating',
        sku: 'AR-STD',
        categoryId: coatingsCategory.id,
        manufacturer: 'Crizal',
        basePrice: 79.99,
        tierVsp: 'K',
        tierEyemed: 'tier_1',
        tierSpectera: 'I',
      },
      {
        name: 'Blue Light Filter',
        sku: 'BLF-STD',
        categoryId: coatingsCategory.id,
        manufacturer: 'Crizal',
        basePrice: 99.99,
        tierVsp: 'K',
        tierEyemed: 'tier_2',
        tierSpectera: 'I',
      },
      {
        name: 'Transition Lenses',
        sku: 'TRANS-STD',
        categoryId: coatingsCategory.id,
        manufacturer: 'Transitions',
        basePrice: 149.99,
        tierVsp: 'J',
        tierEyemed: 'tier_2',
        tierSpectera: 'II',
      }
    ]

    // Create products
    const createdProducts = []
    for (const productData of inventoryProducts) {
      const existingProduct = await prisma.product.findFirst({
        where: { sku: productData.sku }
      })

      if (!existingProduct) {
        const product = await prisma.product.create({
          data: productData
        })
        createdProducts.push(product)
        console.log(`✅ Created product: ${product.name}`)
      } else {
        createdProducts.push(existingProduct)
        console.log(`⏭️  Product already exists: ${existingProduct.name}`)
      }
    }

    // Create inventory records for each product
    const inventoryData = [
      // High stock items
      { productIndex: 0, currentStock: 45, reorderPoint: 10, reorderQuantity: 25, costPrice: 95.00 }, // Ray-Ban Aviator
      { productIndex: 4, currentStock: 120, reorderPoint: 20, reorderQuantity: 50, costPrice: 45.00 }, // Single Vision
      { productIndex: 7, currentStock: 80, reorderPoint: 15, reorderQuantity: 30, costPrice: 39.99 }, // AR Coating
      
      // Medium stock items
      { productIndex: 1, currentStock: 18, reorderPoint: 8, reorderQuantity: 20, costPrice: 75.00 }, // Oakley Holbrook
      { productIndex: 6, currentStock: 25, reorderPoint: 10, reorderQuantity: 15, costPrice: 99.99 }, // High Index
      { productIndex: 8, currentStock: 32, reorderPoint: 12, reorderQuantity: 25, costPrice: 49.99 }, // Blue Light
      
      // Low stock items (below reorder point)
      { productIndex: 2, currentStock: 3, reorderPoint: 5, reorderQuantity: 10, costPrice: 212.50 }, // Tom Ford
      { productIndex: 5, currentStock: 4, reorderPoint: 8, reorderQuantity: 15, costPrice: 147.50 }, // Progressive
      
      // Very low/out of stock
      { productIndex: 3, currentStock: 0, reorderPoint: 6, reorderQuantity: 15, costPrice: 47.50 }, // Warby Parker
      { productIndex: 9, currentStock: 1, reorderPoint: 5, reorderQuantity: 20, costPrice: 74.99 }, // Transitions
    ]

    for (const invData of inventoryData) {
      const product = createdProducts[invData.productIndex]
      if (!product) continue

      const existingInventory = await prisma.inventory.findUnique({
        where: {
          productId_locationId: {
            productId: product.id,
            locationId: location.id
          }
        }
      })

      if (!existingInventory) {
        const inventory = await prisma.inventory.create({
          data: {
            productId: product.id,
            locationId: location.id,
            currentStock: invData.currentStock,
            reservedStock: 0,
            availableStock: invData.currentStock,
            reorderPoint: invData.reorderPoint,
            reorderQuantity: invData.reorderQuantity,
            costPrice: invData.costPrice,
            lastRestocked: invData.currentStock > 0 ? new Date() : null,
          }
        })

        // Create initial stock movement if there's stock
        if (invData.currentStock > 0) {
          await prisma.inventoryMovement.create({
            data: {
              inventoryId: inventory.id,
              type: 'RESTOCK',
              quantity: invData.currentStock,
              reason: 'Initial inventory setup',
              referenceType: 'adjustment',
              unitCost: invData.costPrice,
            }
          })
        }

        console.log(`📦 Created inventory for ${product.name}: ${invData.currentStock} units`)
      } else {
        console.log(`⏭️  Inventory already exists for ${product.name}`)
      }
    }

    console.log('✅ Inventory data seeding completed!')

    // Print summary
    const totalInventory = await prisma.inventory.count()
    const lowStockCount = await prisma.inventory.count({
      where: {
        OR: [
          { currentStock: { lte: prisma.inventory.fields.reorderPoint } },
          { availableStock: { lte: 0 } }
        ]
      }
    })

    console.log(`📊 Summary:`)
    console.log(`   - Total inventory items: ${totalInventory}`)
    console.log(`   - Low stock alerts: ${lowStockCount}`)

  } catch (error) {
    console.error('❌ Error seeding inventory data:', error)
    throw error
  }
}

async function main() {
  try {
    await createInventoryData()
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

export { createInventoryData }