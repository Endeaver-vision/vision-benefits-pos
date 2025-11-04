import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createSampleCustomers() {
  try {
    console.log('🌱 Creating sample customers...')

    const sampleCustomers = [
      {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@email.com',
        phone: '(555) 123-4567',
        insuranceCarrier: 'VSP',
        memberId: 'VSP123456789',
        groupNumber: 'GRP001',
        address: '123 Main St',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90210'
      },
      {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@email.com',
        phone: '(555) 234-5678',
        insuranceCarrier: 'EyeMed',
        memberId: 'EM987654321',
        groupNumber: 'GRP002',
        address: '456 Oak Ave',
        city: 'Beverly Hills',
        state: 'CA',
        zipCode: '90211'
      },
      {
        firstName: 'Michael',
        lastName: 'Brown',
        email: 'michael.brown@email.com',
        phone: '(555) 345-6789',
        insuranceCarrier: 'Spectera',
        memberId: 'SP555666777',
        groupNumber: 'GRP003',
        address: '789 Pine St',
        city: 'West Hollywood',
        state: 'CA',
        zipCode: '90069'
      },
      {
        firstName: 'Emily',
        lastName: 'Davis',
        email: 'emily.davis@email.com',
        phone: '(555) 456-7890',
        insuranceCarrier: 'VSP',
        memberId: 'VSP111222333',
        groupNumber: 'GRP001',
        address: '321 Elm St',
        city: 'Santa Monica',
        state: 'CA',
        zipCode: '90401'
      },
      {
        firstName: 'Robert',
        lastName: 'Wilson',
        email: 'robert.wilson@email.com',
        phone: '(555) 567-8901',
        insuranceCarrier: 'EyeMed',
        memberId: 'EM444555666',
        address: '654 Cedar Ave',
        city: 'Culver City',
        state: 'CA',
        zipCode: '90232'
      }
    ]

    for (const customerData of sampleCustomers) {
      const customer = await prisma.customer.create({
        data: customerData
      })
      console.log(`✅ Created customer: ${customer.firstName} ${customer.lastName}`)
    }

    console.log('🎉 Sample customers created successfully!')
    console.log('📊 Total customers created:', sampleCustomers.length)
  } catch (error) {
    console.error('❌ Error creating sample customers:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSampleCustomers()