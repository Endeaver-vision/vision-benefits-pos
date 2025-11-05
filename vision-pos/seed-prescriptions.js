const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function seedFictionalPrescriptions() {
  console.log('👓 Creating fictional prescriptions for our characters...')
  
  // First, get our fictional customers
  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { firstName: 'Hermione', lastName: 'Granger' },
        { firstName: 'Sherlock', lastName: 'Holmes' },
        { firstName: 'Tony', lastName: 'Stark' },
        { firstName: 'Diana', lastName: 'Prince' },
        { firstName: 'Bruce', lastName: 'Wayne' },
        { firstName: 'Katniss', lastName: 'Everdeen' },
        { firstName: 'Tyrion', lastName: 'Lannister' },
        { firstName: 'Lara', lastName: 'Croft' }
      ]
    }
  })

  const prescriptions = [
    {
      customer: 'Hermione Granger',
      prescriptionDate: new Date('2024-01-15'),
      expirationDate: new Date('2025-01-15'),
      prescriptionType: 'PROGRESSIVE',
      rightEyeJson: JSON.stringify({
        sphere: -2.25,
        cylinder: -0.75,
        axis: 180,
        addition: 1.50
      }),
      leftEyeJson: JSON.stringify({
        sphere: -2.50,
        cylinder: -0.50,
        axis: 175,
        addition: 1.50
      }),
      pupillaryDistance: 62.0,
      providerId: 'dr_001',
      providerName: 'Dr. Sarah Johnson',
      notes: 'Progressive lenses for reading and distance. Anti-reflective coating recommended.',
      isActive: true
    },
    {
      customer: 'Sherlock Holmes',
      prescriptionDate: new Date('2024-02-10'),
      expirationDate: new Date('2025-02-10'),
      prescriptionType: 'DISTANCE',
      rightEyeJson: JSON.stringify({
        sphere: -1.00,
        cylinder: 0,
        axis: null,
        addition: null
      }),
      leftEyeJson: JSON.stringify({
        sphere: -1.25,
        cylinder: -0.25,
        axis: 90,
        addition: null
      }),
      pupillaryDistance: 65.0,
      providerId: 'dr_002',
      providerName: 'Dr. Michael Chen',
      notes: 'Mild myopia. Prefers classic round frames for detective work.',
      isActive: true
    },
    {
      customer: 'Tony Stark',
      prescriptionDate: new Date('2024-01-20'),
      expirationDate: new Date('2025-01-20'),
      prescriptionType: 'COMPUTER',
      rightEyeJson: JSON.stringify({
        sphere: -0.50,
        cylinder: 0,
        axis: null,
        addition: null
      }),
      leftEyeJson: JSON.stringify({
        sphere: -0.75,
        cylinder: 0,
        axis: null,
        addition: null
      }),
      pupillaryDistance: 64.0,
      providerId: 'dr_003',
      providerName: 'Dr. Amanda Rodriguez',
      notes: 'Blue light filtering lenses for extensive computer work. High-tech coating preferred.',
      isActive: true
    },
    {
      customer: 'Diana Prince',
      prescriptionDate: new Date('2024-03-01'),
      expirationDate: new Date('2025-03-01'),
      prescriptionType: 'DISTANCE',
      rightEyeJson: JSON.stringify({
        sphere: 0,
        cylinder: 0,
        axis: null,
        addition: null
      }),
      leftEyeJson: JSON.stringify({
        sphere: 0,
        cylinder: 0,
        axis: null,
        addition: null
      }),
      pupillaryDistance: 63.0,
      providerId: 'dr_001',
      providerName: 'Dr. Sarah Johnson',
      notes: 'Perfect vision. Prescription for impact-resistant safety lenses only.',
      isActive: true
    },
    {
      customer: 'Bruce Wayne',
      prescriptionDate: new Date('2024-02-25'),
      expirationDate: new Date('2025-02-25'),
      prescriptionType: 'DISTANCE',
      rightEyeJson: JSON.stringify({
        sphere: -0.25,
        cylinder: 0,
        axis: null,
        addition: null
      }),
      leftEyeJson: JSON.stringify({
        sphere: -0.25,
        cylinder: 0,
        axis: null,
        addition: null
      }),
      pupillaryDistance: 66.0,
      providerId: 'dr_002',
      providerName: 'Dr. Michael Chen',
      notes: 'Minimal prescription. Specialized tactical lenses with night vision compatibility.',
      isActive: true
    },
    {
      customer: 'Katniss Everdeen',
      prescriptionDate: new Date('2024-03-10'),
      expirationDate: new Date('2025-03-10'),
      prescriptionType: 'DISTANCE',
      rightEyeJson: JSON.stringify({
        sphere: 0,
        cylinder: 0,
        axis: null,
        addition: null
      }),
      leftEyeJson: JSON.stringify({
        sphere: 0,
        cylinder: 0,
        axis: null,
        addition: null
      }),
      pupillaryDistance: 61.0,
      providerId: 'dr_003',
      providerName: 'Dr. Amanda Rodriguez',
      notes: 'Perfect distance vision. Sports frames for archery with UV protection.',
      isActive: true
    },
    {
      customer: 'Tyrion Lannister',
      prescriptionDate: new Date('2024-01-30'),
      expirationDate: new Date('2025-01-30'),
      prescriptionType: 'READING',
      rightEyeJson: JSON.stringify({
        sphere: 0,
        cylinder: 0,
        axis: null,
        addition: 2.00
      }),
      leftEyeJson: JSON.stringify({
        sphere: 0,
        cylinder: 0,
        axis: null,
        addition: 2.00
      }),
      pupillaryDistance: 58.0,
      providerId: 'dr_001',
      providerName: 'Dr. Sarah Johnson',
      notes: 'Reading glasses for extensive studying. Prefers luxury gold frames.',
      isActive: true
    },
    {
      customer: 'Lara Croft',
      prescriptionDate: new Date('2024-02-15'),
      expirationDate: new Date('2025-02-15'),
      prescriptionType: 'DISTANCE',
      rightEyeJson: JSON.stringify({
        sphere: -0.50,
        cylinder: 0,
        axis: null,
        addition: null
      }),
      leftEyeJson: JSON.stringify({
        sphere: -0.50,
        cylinder: 0,
        axis: null,
        addition: null
      }),
      pupillaryDistance: 62.0,
      bifocalHeight: 22.0,
      providerId: 'dr_002',
      providerName: 'Dr. Michael Chen',
      notes: 'Adventure-proof prescription. Impact-resistant wraparound frames required.',
      isActive: true
    }
  ]

  for (const prescData of prescriptions) {
    try {
      // Find the customer
      const customer = customers.find(c => 
        `${c.firstName} ${c.lastName}` === prescData.customer
      )
      
      if (!customer) {
        console.log(`⚠️ Customer ${prescData.customer} not found, skipping prescription`)
        continue
      }

      const prescription = await prisma.eyePrescription.create({
        data: {
          customerId: customer.id,
          prescriptionDate: prescData.prescriptionDate,
          expirationDate: prescData.expirationDate,
          prescriptionType: prescData.prescriptionType,
          rightEyeJson: prescData.rightEyeJson,
          leftEyeJson: prescData.leftEyeJson,
          pupillaryDistance: prescData.pupillaryDistance,
          bifocalHeight: prescData.bifocalHeight || null,
          providerId: prescData.providerId,
          providerName: prescData.providerName,
          notes: prescData.notes,
          isActive: prescData.isActive
        }
      })

      console.log(`✅ Created prescription for: ${prescData.customer} (${prescription.id})`)
    } catch (error) {
      console.log(`⚠️ Skipped prescription for: ${prescData.customer} (may already exist)`)
    }
  }

  console.log('👓 Fictional prescription seeding completed!')
  await prisma.$disconnect()
}

seedFictionalPrescriptions().catch(console.error)