import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkInventory() {
  try {
    const inventoryCount = await prisma.inventory.count();
    const productCount = await prisma.product.count();
    const supplierCount = await prisma.supplier.count();
    
    console.log('=== Current Inventory Status ===');
    console.log(`Products: ${productCount}`);
    console.log(`Inventory records: ${inventoryCount}`);
    console.log(`Suppliers: ${supplierCount}`);
    
    // Check for some sample data
    const sampleInventory = await prisma.inventory.findMany({
      take: 5,
      include: {
        product: {
          include: {
            category: true
          }
        },
        location: true
      }
    });
    
    console.log('\n=== Sample Inventory Records ===');
    sampleInventory.forEach(item => {
      console.log(`${item.product.name} (${item.product.category.name}) - Stock: ${item.currentStock} at ${item.location.name}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInventory();