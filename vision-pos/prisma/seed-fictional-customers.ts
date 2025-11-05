import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedFictionalCustomers() {
  console.log('🎭 Seeding database with fictional characters...')

  const fictionalCustomers = [
    {
      firstName: 'Hermione',
      lastName: 'Granger',
      email: 'hermione.granger@hogwarts.edu',
      phone: '(555) 426-6425',
      dateOfBirth: new Date('1979-09-19'),
      gender: 'FEMALE' as const,
      address: '123 Diagon Alley',
      city: 'London',
      state: 'England',
      zipCode: 'WC2H 0LT',
      insuranceCarrier: 'Magical Health Services',
      memberId: 'MHS123456',
      groupNumber: 'GRYF001',
      notes: 'Excellent student, prefers reading glasses for long study sessions. Interested in latest lens technology.',
      active: true
    },
    {
      firstName: 'Sherlock',
      lastName: 'Holmes',
      email: 'sherlock.holmes@221b.baker.st',
      phone: '(555) 221-2212',
      dateOfBirth: new Date('1854-01-06'),
      gender: 'MALE' as const,
      address: '221B Baker Street',
      city: 'London',
      state: 'England',
      zipCode: 'NW1 6XE',
      insuranceCarrier: 'Victorian Vision Care',
      memberId: 'VVC789012',
      groupNumber: 'DETECT01',
      notes: 'Consulting detective. Requires precision lenses for detailed observation work. Prefers classic frame styles.',
      active: true
    },
    {
      firstName: 'Tony',
      lastName: 'Stark',
      email: 'tony.stark@starkindustries.com',
      phone: '(555) 478-2759',
      dateOfBirth: new Date('1970-05-29'),
      gender: 'MALE' as const,
      address: '10880 Malibu Point',
      city: 'Malibu',
      state: 'CA',
      zipCode: '90265',
      insuranceCarrier: 'Stark Industries Health',
      memberId: 'SIH345678',
      groupNumber: 'AVENG01',
      notes: 'Tech entrepreneur. Interested in cutting-edge eyewear technology and smart glasses. Premium customer.',
      active: true
    },
    {
      firstName: 'Diana',
      lastName: 'Prince',
      email: 'diana.prince@themyscira.gov',
      phone: '(555) 996-3372',
      dateOfBirth: new Date('1918-02-14'),
      gender: 'FEMALE' as const,
      address: '1 Paradise Island',
      city: 'Themyscira',
      state: 'Aegean Sea',
      zipCode: '00001',
      insuranceCarrier: 'Amazonian Health Alliance',
      memberId: 'AHA901234',
      groupNumber: 'AMAZON01',
      notes: 'Ambassador and warrior. Requires impact-resistant frames for active lifestyle. Prefers gold accents.',
      active: true
    },
    {
      firstName: 'Bruce',
      lastName: 'Wayne',
      email: 'bruce.wayne@wayneenterprises.com',
      phone: '(555) 426-8624',
      dateOfBirth: new Date('1972-02-19'),
      gender: 'MALE' as const,
      address: '1007 Mountain Drive',
      city: 'Gotham',
      state: 'NJ',
      zipCode: '07001',
      insuranceCarrier: 'Wayne Foundation Health',
      memberId: 'WFH567890',
      groupNumber: 'WAYNE01',
      notes: 'Philanthropist and entrepreneur. Requires specialized night vision and tactical eyewear. Discretion important.',
      active: true
    },
    {
      firstName: 'Katniss',
      lastName: 'Everdeen',
      email: 'katniss.everdeen@district12.panem',
      phone: '(555) 121-2121',
      dateOfBirth: new Date('1998-05-08'),
      gender: 'FEMALE' as const,
      address: 'Victor\'s Village',
      city: 'District 12',
      state: 'Panem',
      zipCode: '12001',
      insuranceCarrier: 'Capitol Health Services',
      memberId: 'CHS234567',
      groupNumber: 'REBEL01',
      notes: 'Archery specialist. Requires precise distance vision correction and durable sports frames.',
      active: true
    },
    {
      firstName: 'Tyrion',
      lastName: 'Lannister',
      email: 'tyrion.lannister@casterly.rock',
      phone: '(555) 435-7352',
      dateOfBirth: new Date('1974-01-01'),
      gender: 'MALE' as const,
      address: 'Casterly Rock',
      city: 'Lannisport',
      state: 'Westerlands',
      zipCode: 'WL001',
      insuranceCarrier: 'Iron Throne Health',
      memberId: 'ITH345678',
      groupNumber: 'LANN01',
      notes: 'Avid reader and strategist. Requires high-quality reading glasses and progressive lenses. Prefers luxury frames.',
      active: true
    },
    {
      firstName: 'Lara',
      lastName: 'Croft',
      email: 'lara.croft@croftmanor.co.uk',
      phone: '(555) 873-2754',
      dateOfBirth: new Date('1992-02-14'),
      gender: 'FEMALE' as const,
      address: 'Croft Manor',
      city: 'Surrey',
      state: 'England',
      zipCode: 'GU25 4AA',
      insuranceCarrier: 'Adventure Sports Health',
      memberId: 'ASH456789',
      groupNumber: 'TOMB01',
      notes: 'Archaeologist and adventurer. Requires impact-resistant and wraparound frames for extreme conditions.',
      active: true
    },
    {
      firstName: 'Jean-Luc',
      lastName: 'Picard',
      email: 'jean.luc.picard@starfleet.gov',
      phone: '(555) 178-4365',
      dateOfBirth: new Date('2305-07-13'),
      gender: 'MALE' as const,
      address: 'Starfleet Headquarters',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      insuranceCarrier: 'Starfleet Medical',
      memberId: 'SFM567891',
      groupNumber: 'ENTER01',
      notes: 'Starship Captain. Requires precision optics for navigation and tactical operations. Prefers classic styles.',
      active: true
    },
    {
      firstName: 'Indiana',
      lastName: 'Jones',
      email: 'indiana.jones@university.edu',
      phone: '(555) 193-7734',
      dateOfBirth: new Date('1899-07-01'),
      gender: 'MALE' as const,
      address: 'Marshall College',
      city: 'Bedford',
      state: 'CT',
      zipCode: '06712',
      insuranceCarrier: 'University Health Plan',
      memberId: 'UHP678912',
      groupNumber: 'PROF01',
      notes: 'Archaeologist and professor. Requires durable frames for fieldwork and reading glasses for research.',
      active: true
    },
    {
      firstName: 'Elsa',
      lastName: 'Arendelle',
      email: 'elsa@arendelle.kingdom',
      phone: '(555) 373-6932',
      dateOfBirth: new Date('1995-12-22'),
      gender: 'FEMALE' as const,
      address: 'Arendelle Castle',
      city: 'Arendelle',
      state: 'Norway',
      zipCode: 'AR001',
      insuranceCarrier: 'Royal Health Services',
      memberId: 'RHS789123',
      groupNumber: 'ROYAL01',
      notes: 'Queen of Arendelle. Requires cold-resistant frames and anti-glare coatings for snowy environments.',
      active: true
    },
    {
      firstName: 'Luke',
      lastName: 'Skywalker',
      email: 'luke.skywalker@jedi.temple',
      phone: '(555) 529-9252',
      dateOfBirth: new Date('1977-05-25'),
      gender: 'MALE' as const,
      address: 'Tatooine Moisture Farm',
      city: 'Tatooine',
      state: 'Outer Rim',
      zipCode: 'OR001',
      insuranceCarrier: 'Rebel Alliance Health',
      memberId: 'RAH456789',
      groupNumber: 'JEDI01',
      notes: 'Jedi Knight. Requires impact-resistant frames and UV protection for desert environments.',
      active: true
    }
  ]

  console.log(`📝 Creating ${fictionalCustomers.length} fictional customers...`)

  for (const customerData of fictionalCustomers) {
    try {
      const customer = await prisma.customer.create({
        data: customerData
      })

      console.log(`✅ Created customer: ${customer.firstName} ${customer.lastName} (${customer.id})`)

    } catch (error) {
      console.error(`❌ Error creating customer ${customerData.firstName} ${customerData.lastName}:`, error)
    }
  }

  console.log('🎉 Fictional customer seeding completed!')
}

async function main() {
  try {
    await seedFictionalCustomers()
  } catch (error) {
    console.error('❌ Seeding failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require && require.main === module) {
  main()
}

export { seedFictionalCustomers }