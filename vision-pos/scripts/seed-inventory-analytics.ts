import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedInventoryData() {
  try {
    console.log('🌱 Seeding inventory analytics data...');
    
    // 1. Create suppliers
    const suppliers = [
      {
        name: 'Luxottica Group',
        contactName: 'Sarah Johnson',
        email: 'sarah.johnson@luxottica.com',
        phone: '(555) 123-4567',
        address: '123 Vision Boulevard',
        city: 'Milan',
        state: 'NY',
        zipCode: '10001',
        paymentTerms: 'Net 30',
        website: 'https://luxottica.com'
      },
      {
        name: 'Essilor International',
        contactName: 'Michael Chen',
        email: 'michael.chen@essilor.com',
        phone: '(555) 234-5678',
        address: '456 Lens Street',
        city: 'Paris',
        state: 'TX',
        zipCode: '75001',
        paymentTerms: 'Net 45',
        website: 'https://essilor.com'
      },
      {
        name: 'Safilo Group',
        contactName: 'Emma Rodriguez',
        email: 'emma.rodriguez@safilo.com',
        phone: '(555) 345-6789',
        address: '789 Frame Avenue',
        city: 'Padova',
        state: 'CA',
        zipCode: '90001',
        paymentTerms: 'Net 30',
        website: 'https://safilo.com'
      },
      {
        name: 'CooperVision',
        contactName: 'David Kim',
        email: 'david.kim@coopervision.com',
        phone: '(555) 456-7890',
        address: '321 Contact Way',
        city: 'Fairport',
        state: 'NY',
        zipCode: '14450',
        paymentTerms: 'Net 15',
        website: 'https://coopervision.com'
      },
      {
        name: 'Zeiss Vision Care',
        contactName: 'Lisa Wang',
        email: 'lisa.wang@zeiss.com',
        phone: '(555) 567-8901',
        address: '654 Optics Drive',
        city: 'Oberkochen',
        state: 'OH',
        zipCode: '44101',
        paymentTerms: 'Net 30',
        website: 'https://zeiss.com'
      }
    ];

    console.log('Creating suppliers...');
    const createdSuppliers = [];
    for (const supplier of suppliers) {
      const created = await prisma.supplier.upsert({
        where: { name: supplier.name },
        update: supplier,
        create: supplier
      });
      createdSuppliers.push(created);
    }

    // 2. Get all products and locations
    const products = await prisma.product.findMany({
      include: { category: true }
    });
    const locations = await prisma.location.findMany();

    // 3. Create product-supplier relationships
    console.log('Creating product-supplier relationships...');
    const productSupplierPairs = [];
    
    for (const product of products) {
      // Assign suppliers based on category
      let supplierId;
      let supplierPrice;
      let leadTimeDays;
      
      switch (product.category.code) {
        case 'frames':
          // Frame suppliers: Luxottica, Safilo
          supplierId = Math.random() < 0.6 ? createdSuppliers[0].id : createdSuppliers[2].id;
          supplierPrice = product.basePrice * 0.45; // 45% of retail
          leadTimeDays = Math.floor(Math.random() * 10) + 5; // 5-14 days
          break;
        case 'lenses':
          // Lens suppliers: Essilor, Zeiss
          supplierId = Math.random() < 0.7 ? createdSuppliers[1].id : createdSuppliers[4].id;
          supplierPrice = product.basePrice * 0.35; // 35% of retail
          leadTimeDays = Math.floor(Math.random() * 7) + 3; // 3-9 days
          break;
        case 'coatings':
          // Coating suppliers: Essilor, Zeiss
          supplierId = Math.random() < 0.6 ? createdSuppliers[1].id : createdSuppliers[4].id;
          supplierPrice = product.basePrice * 0.30; // 30% of retail
          leadTimeDays = Math.floor(Math.random() * 5) + 2; // 2-6 days
          break;
        case 'contacts':
          // Contact suppliers: CooperVision
          supplierId = createdSuppliers[3].id;
          supplierPrice = product.basePrice * 0.50; // 50% of retail
          leadTimeDays = Math.floor(Math.random() * 3) + 1; // 1-3 days
          break;
        default:
          // Default to Luxottica
          supplierId = createdSuppliers[0].id;
          supplierPrice = product.basePrice * 0.40;
          leadTimeDays = Math.floor(Math.random() * 7) + 3;
      }

      const productSupplier = {
        productId: product.id,
        supplierId: supplierId,
        supplierSku: `SUP-${product.sku || Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        supplierPrice: Math.round(supplierPrice * 100) / 100,
        leadTimeDays: leadTimeDays,
        minimumOrder: Math.floor(Math.random() * 5) + 1,
        isPrimary: true
      };

      const created = await prisma.productSupplier.upsert({
        where: {
          productId_supplierId: {
            productId: product.id,
            supplierId: supplierId
          }
        },
        update: productSupplier,
        create: productSupplier
      });
      
      productSupplierPairs.push(created);
    }

    // 4. Create/update inventory records with more realistic data
    console.log('Updating inventory records...');
    for (const location of locations) {
      for (const product of products) {
        // Generate realistic stock levels based on product category
        let currentStock, reorderPoint, reorderQuantity;
        
        switch (product.category.code) {
          case 'frames':
            currentStock = Math.floor(Math.random() * 50) + 10; // 10-59
            reorderPoint = Math.floor(Math.random() * 10) + 5; // 5-14
            reorderQuantity = Math.floor(Math.random() * 20) + 10; // 10-29
            break;
          case 'lenses':
            currentStock = Math.floor(Math.random() * 100) + 50; // 50-149
            reorderPoint = Math.floor(Math.random() * 20) + 10; // 10-29
            reorderQuantity = Math.floor(Math.random() * 40) + 20; // 20-59
            break;
          case 'coatings':
            currentStock = Math.floor(Math.random() * 80) + 30; // 30-109
            reorderPoint = Math.floor(Math.random() * 15) + 8; // 8-22
            reorderQuantity = Math.floor(Math.random() * 30) + 15; // 15-44
            break;
          case 'contacts':
            currentStock = Math.floor(Math.random() * 200) + 100; // 100-299
            reorderPoint = Math.floor(Math.random() * 40) + 20; // 20-59
            reorderQuantity = Math.floor(Math.random() * 80) + 40; // 40-119
            break;
          default:
            currentStock = Math.floor(Math.random() * 30) + 5;
            reorderPoint = Math.floor(Math.random() * 10) + 3;
            reorderQuantity = Math.floor(Math.random() * 20) + 10;
        }

        const reservedStock = Math.floor(Math.random() * Math.min(currentStock * 0.2, 10));
        const availableStock = currentStock - reservedStock;
        
        // Find supplier price for cost calculation
        const productSupplier = productSupplierPairs.find(ps => ps.productId === product.id);
        const costPrice = productSupplier ? productSupplier.supplierPrice : product.basePrice * 0.4;
        
        // Random dates for last activity
        const lastRestocked = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Last 30 days
        const lastSold = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Last 7 days

        await prisma.inventory.upsert({
          where: {
            productId_locationId: {
              productId: product.id,
              locationId: location.id
            }
          },
          update: {
            currentStock,
            reservedStock,
            availableStock,
            reorderPoint,
            reorderQuantity,
            maxStock: reorderQuantity * 3,
            costPrice,
            lastCostPrice: costPrice * (0.9 + Math.random() * 0.2), // ±10% variance
            lastRestocked,
            lastSold
          },
          create: {
            productId: product.id,
            locationId: location.id,
            currentStock,
            reservedStock,
            availableStock,
            reorderPoint,
            reorderQuantity,
            maxStock: reorderQuantity * 3,
            costPrice,
            lastCostPrice: costPrice * (0.9 + Math.random() * 0.2),
            lastRestocked,
            lastSold
          }
        });
      }
    }

    // 5. Create some inventory movements for analytics
    console.log('Creating inventory movements...');
    const inventoryRecords = await prisma.inventory.findMany();
    const users = await prisma.user.findMany();
    
    for (let i = 0; i < 100; i++) {
      const inventory = inventoryRecords[Math.floor(Math.random() * inventoryRecords.length)];
      const user = users[Math.floor(Math.random() * users.length)];
      
      const movementTypes = ['SALE', 'RETURN', 'RESTOCK', 'ADJUSTMENT'];
      const type = movementTypes[Math.floor(Math.random() * movementTypes.length)];
      
      let quantity;
      switch (type) {
        case 'SALE':
          quantity = -(Math.floor(Math.random() * 5) + 1); // -1 to -5
          break;
        case 'RETURN':
          quantity = Math.floor(Math.random() * 3) + 1; // 1 to 3
          break;
        case 'RESTOCK':
          quantity = Math.floor(Math.random() * 20) + 10; // 10 to 29
          break;
        case 'ADJUSTMENT':
          quantity = Math.floor(Math.random() * 11) - 5; // -5 to 5
          break;
      }

      const createdAt = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000); // Last 60 days

      await prisma.inventoryMovement.create({
        data: {
          inventoryId: inventory.id,
          type: type as any,
          quantity,
          reason: `${type} operation`,
          referenceType: type.toLowerCase(),
          referenceId: `ref-${Math.random().toString(36).substr(2, 9)}`,
          unitCost: inventory.costPrice,
          userId: user.id,
          createdAt
        }
      });
    }

    // 6. Create some purchase orders
    console.log('Creating purchase orders...');
    for (let i = 0; i < 15; i++) {
      const supplier = createdSuppliers[Math.floor(Math.random() * createdSuppliers.length)];
      const location = locations[Math.floor(Math.random() * locations.length)];
      const user = users[Math.floor(Math.random() * users.length)];
      
      const orderDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const expectedDate = new Date(orderDate.getTime() + (Math.random() * 14 + 3) * 24 * 60 * 60 * 1000);
      
      const statuses = ['PENDING', 'SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      const receivedDate = status === 'RECEIVED' ? 
        new Date(orderDate.getTime() + Math.random() * 21 * 24 * 60 * 60 * 1000) : 
        null;

      const orderNumber = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      
      const purchaseOrder = await prisma.purchaseOrder.create({
        data: {
          supplierId: supplier.id,
          locationId: location.id,
          userId: user.id,
          orderNumber,
          status: status as any,
          subtotal: 0, // Will be calculated after items
          tax: 0,
          shipping: Math.random() * 50 + 10,
          total: 0, // Will be calculated after items
          orderDate,
          expectedDate,
          receivedDate,
          notes: `Purchase order for ${supplier.name}`,
        }
      });

      // Add items to purchase order
      const supplierProducts = productSupplierPairs.filter(ps => ps.supplierId === supplier.id);
      const numItems = Math.floor(Math.random() * 5) + 2; // 2-6 items per order
      
      let subtotal = 0;
      for (let j = 0; j < numItems && j < supplierProducts.length; j++) {
        const productSupplier = supplierProducts[j];
        const quantityOrdered = Math.floor(Math.random() * 20) + 5; // 5-24
        const quantityReceived = status === 'RECEIVED' ? quantityOrdered : 
                                status === 'PARTIALLY_RECEIVED' ? Math.floor(quantityOrdered * 0.7) : 0;
        
        const total = quantityOrdered * productSupplier.supplierPrice;
        subtotal += total;

        await prisma.purchaseOrderItem.create({
          data: {
            purchaseOrderId: purchaseOrder.id,
            productId: productSupplier.productId,
            quantityOrdered,
            quantityReceived,
            unitCost: productSupplier.supplierPrice,
            total
          }
        });
      }

      const tax = subtotal * 0.08; // 8% tax
      const totalAmount = subtotal + tax + purchaseOrder.shipping;

      await prisma.purchaseOrder.update({
        where: { id: purchaseOrder.id },
        data: {
          subtotal,
          tax,
          total: totalAmount
        }
      });
    }

    console.log('✅ Inventory analytics data seeded successfully!');
    
    // Print summary
    const finalCounts = {
      suppliers: await prisma.supplier.count(),
      productSuppliers: await prisma.productSupplier.count(),
      inventory: await prisma.inventory.count(),
      movements: await prisma.inventoryMovement.count(),
      purchaseOrders: await prisma.purchaseOrder.count(),
      purchaseOrderItems: await prisma.purchaseOrderItem.count()
    };
    
    console.log('\n📊 Final counts:');
    console.log(`  - Suppliers: ${finalCounts.suppliers}`);
    console.log(`  - Product-Supplier relationships: ${finalCounts.productSuppliers}`);
    console.log(`  - Inventory records: ${finalCounts.inventory}`);
    console.log(`  - Inventory movements: ${finalCounts.movements}`);
    console.log(`  - Purchase orders: ${finalCounts.purchaseOrders}`);
    console.log(`  - Purchase order items: ${finalCounts.purchaseOrderItems}`);

  } catch (error) {
    console.error('❌ Error seeding inventory data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedInventoryData();