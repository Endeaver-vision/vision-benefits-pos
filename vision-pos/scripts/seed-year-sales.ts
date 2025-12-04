import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

// Product catalog
const PRODUCTS = {
  frames: [
    { name: 'Ray-Ban Wayfarer', price: 280, tierVsp: 'K', tierEyemed: 'tier_2', tierSpectera: 'II' },
    { name: 'Oakley Crosslink', price: 320, tierVsp: 'J', tierEyemed: 'tier_3', tierSpectera: 'III' },
    { name: 'Gucci GG0061O', price: 450, tierVsp: 'F', tierEyemed: 'tier_5', tierSpectera: 'V' },
    { name: 'Prada PR 17WV', price: 380, tierVsp: 'J', tierEyemed: 'tier_4', tierSpectera: 'IV' },
    { name: 'Warby Parker Percey', price: 195, tierVsp: 'K', tierEyemed: 'tier_1', tierSpectera: 'I' },
    { name: 'Costa Del Mar Fantail', price: 249, tierVsp: 'K', tierEyemed: 'tier_2', tierSpectera: 'II' },
  ],
  lenses: [
    { name: 'Single Vision - Standard', price: 150, tierVsp: 'STANDARD', tierEyemed: 'STANDARD', tierSpectera: 'STANDARD' },
    { name: 'Single Vision - High Index', price: 225, tierVsp: 'PREMIUM', tierEyemed: 'PREMIUM', tierSpectera: 'PREMIUM' },
    { name: 'Progressive - Standard', price: 350, tierVsp: 'STANDARD', tierEyemed: 'STANDARD', tierSpectera: 'STANDARD' },
    { name: 'Progressive - Premium', price: 550, tierVsp: 'PREMIUM', tierEyemed: 'PREMIUM', tierSpectera: 'PREMIUM' },
    { name: 'Bifocal', price: 250, tierVsp: 'STANDARD', tierEyemed: 'STANDARD', tierSpectera: 'STANDARD' },
    { name: 'Transitions (Photochromic)', price: 180, tierVsp: 'ADDON', tierEyemed: 'ADDON', tierSpectera: 'ADDON' },
    { name: 'Anti-Reflective Coating', price: 90, tierVsp: 'ADDON', tierEyemed: 'ADDON', tierSpectera: 'ADDON' },
    { name: 'Blue Light Blocking', price: 75, tierVsp: 'ADDON', tierEyemed: 'ADDON', tierSpectera: 'ADDON' },
  ],
  exams: [
    { name: 'Comprehensive Eye Exam', price: 125, tierVsp: 'EXAM', tierEyemed: 'EXAM', tierSpectera: 'EXAM' },
    { name: 'Contact Lens Fitting', price: 85, tierVsp: 'CONTACT_EXAM', tierEyemed: 'CONTACT_EXAM', tierSpectera: 'CONTACT_EXAM' },
    { name: 'Retinal Imaging', price: 45, tierVsp: 'ADDON', tierEyemed: 'ADDON', tierSpectera: 'ADDON' },
  ],
  services: [
    { name: 'Frame Adjustment', price: 25, tierVsp: 'SERVICE', tierEyemed: 'SERVICE', tierSpectera: 'SERVICE' },
    { name: 'Frame Repair', price: 45, tierVsp: 'SERVICE', tierEyemed: 'SERVICE', tierSpectera: 'SERVICE' },
    { name: 'Lens Cleaning Kit', price: 15, tierVsp: null, tierEyemed: null, tierSpectera: null },
  ],
};

// Insurance carriers matching customer data
const INSURANCE_CARRIERS = ['VSP', 'Eyemed', 'Spectera', null]; // null = cash pay

// Customer spending profiles
const CUSTOMER_PROFILES = {
  high: ['cmiahmqfa00020brscjg8ezfi', 'cmiahmqtt00040brs75cbqto8'], // Tony Stark, Bruce Wayne
  medium: ['cmiahmqmm00030brsdrrjr8ui', 'cmiahmq1000000brse3n6u0k0', 'cmiahmrnh00080brsz4dmwtbi'], // Diana, Hermione, Picard
  low: ['cmiahmq8600010brso2le52y1', 'cmiahmr1c00050brs486t49ap', 'cmiahmr9700060brshi91n1i0', 
        'cmiahmrg800070brsw2jcx3my', 'cmiahmrup00090brs3h434wlv', 'cmiahms1z000a0brsnplzd764', 'cmiahms8z000b0brsxwnprp2h']
};

const USER_ID = 'cmi990avd00020b06kzou7gyq';
const LOCATION_ID = 'cmi990a9l00000b065hm0sb0a';

// Helper functions
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function getSeasonalMultiplier(month: number): number {
  // Higher in Jan (insurance renewal), lower in summer
  const multipliers = [1.5, 1.2, 1.1, 1.0, 0.9, 0.7, 0.7, 0.8, 1.0, 1.1, 1.2, 1.3];
  return multipliers[month];
}

function getDayOfWeekMultiplier(dayOfWeek: number): number {
  // 0 = Sunday, 6 = Saturday
  const multipliers = [0.5, 0.8, 1.0, 1.0, 1.2, 1.5, 1.3];
  return multipliers[dayOfWeek];
}

function calculateInsuranceDiscount(price: number, carrier: string | null): number {
  if (!carrier) return 0;
  
  const discountRates: Record<string, number> = {
    'VSP': 0.45,
    'Eyemed': 0.40,
    'Spectera': 0.35,
  };
  
  return price * (discountRates[carrier] || 0);
}

function buildRealisticCart(customerProfile: 'high' | 'medium' | 'low') {
  const cart: typeof PRODUCTS.frames[0][] = [];
  
  // Determine purchase type
  const purchaseType = randomChoice(['complete', 'frames_only', 'lenses_only', 'exam_only', 'service_only']);
  
  if (purchaseType === 'complete') {
    // Full purchase: exam + frames + lenses
    cart.push(randomChoice(PRODUCTS.exams));
    cart.push(randomChoice(PRODUCTS.frames));
    cart.push(randomChoice(PRODUCTS.lenses.slice(0, 5))); // Base lens
    
    // Add coatings/addons
    if (customerProfile !== 'low' && Math.random() > 0.3) {
      cart.push(randomChoice(PRODUCTS.lenses.slice(5))); // Coatings
    }
    if (customerProfile === 'high' && Math.random() > 0.5) {
      cart.push(randomChoice(PRODUCTS.lenses.slice(5))); // Another coating
    }
  } else if (purchaseType === 'frames_only') {
    cart.push(randomChoice(PRODUCTS.frames));
  } else if (purchaseType === 'lenses_only') {
    cart.push(randomChoice(PRODUCTS.lenses.slice(0, 5)));
    if (Math.random() > 0.5) {
      cart.push(randomChoice(PRODUCTS.lenses.slice(5)));
    }
  } else if (purchaseType === 'exam_only') {
    cart.push(randomChoice(PRODUCTS.exams));
    if (Math.random() > 0.6) {
      cart.push(PRODUCTS.exams[2]); // Retinal imaging
    }
  } else {
    cart.push(randomChoice(PRODUCTS.services));
  }
  
  return cart;
}

async function seedProductsAndCategories() {
  console.log('📦 Creating product categories...');
  
  const categories = [
    { name: 'Frames', code: 'FRAMES', description: 'Eyeglass frames' },
    { name: 'Lenses', code: 'LENSES', description: 'Prescription and non-prescription lenses' },
    { name: 'Exams', code: 'EXAMS', description: 'Eye examinations' },
    { name: 'Services', code: 'SERVICES', description: 'Adjustments and repairs' },
  ];
  
  const categoryMap: Record<string, string> = {};
  
  for (const cat of categories) {
    const existing = await prisma.productCategory.findFirst({ where: { code: cat.code } });
    if (existing) {
      categoryMap[cat.code] = existing.id;
      console.log(`  ✓ Category exists: ${cat.name}`);
    } else {
      const created = await prisma.productCategory.create({ data: { id: randomUUID(), ...cat } });
      categoryMap[cat.code] = created.id;
      console.log(`  ✅ Created category: ${cat.name}`);
    }
  }
  
  console.log('\n📦 Creating products...');
  const productMap: Record<string, string> = {};
  
  for (const [category, products] of Object.entries(PRODUCTS)) {
    const categoryCode = category.toUpperCase();
    const categoryId = categoryMap[categoryCode];
    
    for (const product of products) {
      const existing = await prisma.product.findFirst({ where: { name: product.name } });
      if (existing) {
        productMap[product.name] = existing.id;
        console.log(`  ✓ Product exists: ${product.name}`);
      } else {
        const created = await prisma.product.create({
          data: {
            id: randomUUID(),
            name: product.name,
            sku: `${categoryCode.substring(0, 3)}-${randomInt(1000, 9999)}`,
            categoryId,
            basePrice: product.price,
            tierVsp: product.tierVsp,
            tierEyemed: product.tierEyemed,
            tierSpectera: product.tierSpectera,
          },
        });
        productMap[product.name] = created.id;
        console.log(`  ✅ Created product: ${product.name} - $${product.price}`);
      }
    }
  }
  
  return productMap;
}

async function generateTransactions(productMap: Record<string, string>) {
  console.log('\n💰 Generating 365 days of transactions...\n');
  
  const startDate = new Date('2024-11-22');
  const endDate = new Date('2025-11-22');
  const allCustomers = [...CUSTOMER_PROFILES.high, ...CUSTOMER_PROFILES.medium, ...CUSTOMER_PROFILES.low];
  
  const transactionsToCreate: any[] = [];
  const itemsToCreate: any[] = [];
  
  let totalTransactions = 0;
  
  // Generate transactions for each day
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const currentDate = new Date(d);
    const month = currentDate.getMonth();
    const dayOfWeek = currentDate.getDay();
    
    // Calculate daily probability
    const baseTransactionsPerDay = 1.5;
    const seasonalMult = getSeasonalMultiplier(month);
    const dayMult = getDayOfWeekMultiplier(dayOfWeek);
    const expectedTransactions = baseTransactionsPerDay * seasonalMult * dayMult;
    
    // Generate transactions for this day
    const numTransactions = Math.round(expectedTransactions + (Math.random() - 0.5));
    
    for (let i = 0; i < numTransactions; i++) {
      // Select customer based on profile distribution
      let customerId: string;
      const roll = Math.random();
      if (roll < 0.15) {
        customerId = randomChoice(CUSTOMER_PROFILES.high);
      } else if (roll < 0.40) {
        customerId = randomChoice(CUSTOMER_PROFILES.medium);
      } else {
        customerId = randomChoice(CUSTOMER_PROFILES.low);
      }
      
      const customerProfile = CUSTOMER_PROFILES.high.includes(customerId) ? 'high' :
                             CUSTOMER_PROFILES.medium.includes(customerId) ? 'medium' : 'low';
      
      // Build cart
      const cart = buildRealisticCart(customerProfile);
      
      // Calculate totals
      let subtotal = cart.reduce((sum, item) => sum + item.price, 0);
      
      // Determine insurance carrier
      const insuranceCarrier = Math.random() > 0.25 ? randomChoice(['VSP', 'Eyemed', 'Spectera']) : null;
      const insuranceDiscount = calculateInsuranceDiscount(subtotal, insuranceCarrier);
      const afterInsurance = subtotal - insuranceDiscount;
      
      const taxRate = 0.08;
      const tax = afterInsurance * taxRate;
      const total = afterInsurance + tax;
      
      // Determine status (5% refunded)
      const status = Math.random() < 0.05 ? 'REFUNDED' : 'COMPLETED';
      
      const transactionId = randomUUID();
      const transactionDate = new Date(currentDate.setHours(randomInt(9, 19), randomInt(0, 59)));
      
      transactionsToCreate.push({
        id: transactionId,
        customerId,
        userId: USER_ID,
        locationId: LOCATION_ID,
        subtotal,
        tax,
        discount: 0,
        total,
        insuranceCarrier,
        insuranceDiscount,
        patientPortion: total,
        status,
        paymentMethod: randomChoice(['Credit Card', 'Debit Card', 'Cash', 'Insurance Direct']),
        createdAt: transactionDate,
        updatedAt: transactionDate,
      });
      
      // Create items
      for (const item of cart) {
        const productId = productMap[item.name];
        if (productId) {
          const itemDiscount = calculateInsuranceDiscount(item.price, insuranceCarrier);
          itemsToCreate.push({
            id: randomUUID(),
            transactionId,
            productId,
            quantity: 1,
            unitPrice: item.price,
            discount: 0,
            total: item.price,
            insuranceTier: insuranceCarrier ? (item.tierVsp || 'STANDARD') : null,
            insuranceDiscount: itemDiscount,
            createdAt: transactionDate,
            updatedAt: transactionDate,
          });
        }
      }
      
      totalTransactions++;
    }
  }
  
  console.log(`📊 Generated ${totalTransactions} transactions with ${itemsToCreate.length} items`);
  console.log('💾 Inserting into database...\n');
  
  // Bulk insert transactions
  const batchSize = 100;
  for (let i = 0; i < transactionsToCreate.length; i += batchSize) {
    const batch = transactionsToCreate.slice(i, i + batchSize);
    await prisma.transaction.createMany({ data: batch });
    console.log(`  ✅ Inserted transactions ${i + 1} to ${Math.min(i + batchSize, transactionsToCreate.length)}`);
  }
  
  // Bulk insert items
  for (let i = 0; i < itemsToCreate.length; i += batchSize) {
    const batch = itemsToCreate.slice(i, i + batchSize);
    await prisma.transactionItem.createMany({ data: batch });
    console.log(`  ✅ Inserted items ${i + 1} to ${Math.min(i + batchSize, itemsToCreate.length)}`);
  }
  
  return { transactions: transactionsToCreate.length, items: itemsToCreate.length };
}

async function main() {
  console.log('🎯 Starting Year-Long Sales Data Generation\n');
  console.log('📅 Date Range: Nov 22, 2024 - Nov 22, 2025\n');
  
  try {
    const productMap = await seedProductsAndCategories();
    const stats = await generateTransactions(productMap);
    
    console.log('\n✨ Generation Complete!\n');
    console.log('📈 Summary:');
    console.log(`  • Products: ${Object.keys(productMap).length}`);
    console.log(`  • Transactions: ${stats.transactions}`);
    console.log(`  • Transaction Items: ${stats.items}`);
    console.log(`  • Date Range: 365 days`);
    console.log(`  • Customers: 12 fictional characters`);
    
    // Calculate totals
    const totals = await prisma.transaction.aggregate({
      _sum: { total: true, insuranceDiscount: true },
      _count: true,
    });
    
    console.log(`\n💰 Revenue Summary:`);
    console.log(`  • Total Revenue: $${totals._sum.total?.toFixed(2) || 0}`);
    console.log(`  • Insurance Discounts: $${totals._sum.insuranceDiscount?.toFixed(2) || 0}`);
    console.log(`  • Average Transaction: $${(totals._sum.total! / totals._count).toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
