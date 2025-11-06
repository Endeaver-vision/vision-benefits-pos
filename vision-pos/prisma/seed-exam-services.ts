import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🏥 Seeding exam services...')

  // Clear existing exam services (use any type for now since client isn't regenerated yet)
  try {
    await (prisma as any).examService.deleteMany()
    console.log('🗑️ Cleared existing exam services')
  } catch (error) {
    console.log('ℹ️ No existing exam services to clear')
  }

  const examServices = [
    // Patient Type
    {
      name: 'New Patient',
      subtitle: 'First visit',
      price: 0,
      duration: 0,
      category: 'PATIENT_TYPE',
      insuranceCovered: false,
      copay: null,
    },
    {
      name: 'Established Patient',
      subtitle: 'Return visit',
      price: 0,
      duration: 0,
      category: 'PATIENT_TYPE',
      insuranceCovered: false,
      copay: null,
    },
    
    // Exam Type
    {
      name: 'Routine Exam',
      subtitle: 'Good pricing',
      price: 150,
      duration: 60,
      category: 'EXAM_TYPE',
      insuranceCovered: true,
      copay: 25,
    },
    {
      name: 'Medical Exam',
      subtitle: 'Better',
      price: 200,
      duration: 90,
      category: 'EXAM_TYPE',
      insuranceCovered: true,
      copay: 35,
    },
    
    // Screeners
    {
      name: 'iWellness',
      subtitle: '$39',
      price: 39,
      duration: 15,
      category: 'SCREENERS',
      insuranceCovered: false,
      copay: null,
    },
    {
      name: 'OptoMap (Ultra-Wide Field Image)',
      subtitle: '',
      price: 45,
      duration: 15,
      category: 'SCREENERS',
      insuranceCovered: false,
      copay: null,
    },
    
    // Diagnostics
    {
      name: 'OCT (Retina and Optic Nerve)',
      subtitle: '',
      price: 65,
      duration: 20,
      category: 'DIAGNOSTICS',
      insuranceCovered: false,
      copay: null,
    },
    {
      name: 'Visual Field',
      subtitle: '',
      price: 85,
      duration: 30,
      category: 'DIAGNOSTICS',
      insuranceCovered: false,
      copay: null,
    },
    {
      name: 'External Photos',
      subtitle: '',
      price: 25,
      duration: 10,
      category: 'DIAGNOSTICS',
      insuranceCovered: false,
      copay: null,
    },
    {
      name: 'Corneal Thickness Measurement',
      subtitle: '',
      price: 35,
      duration: 15,
      category: 'DIAGNOSTICS',
      insuranceCovered: false,
      copay: null,
    },
    
    // Advanced Testing
    {
      name: 'Neurological Headache Screening',
      subtitle: '',
      price: 120,
      duration: 45,
      category: 'ADVANCED',
      insuranceCovered: false,
      copay: null,
    },
    {
      name: 'Atropine Myopia Management Evaluation',
      subtitle: '',
      price: 95,
      duration: 35,
      category: 'ADVANCED',
      insuranceCovered: false,
      copay: null,
    },
    {
      name: 'Amblyopia Evaluation',
      subtitle: '',
      price: 110,
      duration: 40,
      category: 'ADVANCED',
      insuranceCovered: false,
      copay: null,
    },
    
    // Contact Lens Fitting
    {
      name: 'Spherical fitting',
      subtitle: '',
      price: 75,
      duration: 30,
      category: 'CONTACT_FITTING',
      insuranceCovered: false,
      copay: null,
    },
    {
      name: 'Toric Fitting',
      subtitle: '',
      price: 95,
      duration: 35,
      category: 'CONTACT_FITTING',
      insuranceCovered: false,
      copay: null,
    },
    {
      name: 'Monovision Fitting',
      subtitle: '',
      price: 85,
      duration: 30,
      category: 'CONTACT_FITTING',
      insuranceCovered: false,
      copay: null,
    },
    {
      name: 'Multifocal Fitting',
      subtitle: '',
      price: 120,
      duration: 45,
      category: 'CONTACT_FITTING',
      insuranceCovered: false,
      copay: null,
    },
    {
      name: 'Multifocal Toric Fitting',
      subtitle: '',
      price: 150,
      duration: 60,
      category: 'CONTACT_FITTING',
      insuranceCovered: false,
      copay: null,
    },
    {
      name: 'Corneal RGP Fitting',
      subtitle: '',
      price: 200,
      duration: 60,
      category: 'CONTACT_FITTING',
      insuranceCovered: false,
      copay: null,
    },
    {
      name: 'Specialty Contact Lens Fitting',
      subtitle: '',
      price: 250,
      duration: 75,
      category: 'CONTACT_FITTING',
      insuranceCovered: false,
      copay: null,
    },
  ]

  // Create exam services using any type for now
  let serviceCount = 0
  for (const service of examServices) {
    await (prisma as any).examService.create({
      data: {
        name: service.name,
        subtitle: service.subtitle || null,
        price: service.price,
        duration: service.duration,
        category: service.category,
        insuranceCovered: service.insuranceCovered,
        copay: service.copay,
        active: true,
        locationId: null, // Available at all locations
      },
    })
    serviceCount++
  }

  console.log(`✅ Created ${serviceCount} exam services`)
  console.log('🎉 Exam services seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Exam services seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })