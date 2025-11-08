const { PrismaClient } = require('@prisma/client')

// Simple debug to check if quote store is working
console.log('Testing exam services selection and pricing...')

// Simulate what happens when user selects exam services
const mockSelectedServices = ['comprehensive-exam', 'dilation']

const servicePrices = {
  'comprehensive-exam': 275.00,
  'contact-lens-fitting': 125.00,
  'retinal-imaging': 85.00,
  'visual-field-testing': 95.00,
  'oct-scan': 145.00,
  'dilation': 35.00,
  'retinal-photos': 65.00,
  'oct-macula': 125.00,
  'oct-glaucoma': 125.00,
  'visual-field-extended': 75.00,
  'corneal-topography': 95.00
}

const subtotal = mockSelectedServices.reduce((total, serviceId) => {
  return total + (servicePrices[serviceId] || 0)
}, 0)

console.log('Mock selected services:', mockSelectedServices)
console.log('Expected subtotal:', subtotal)
console.log('Service breakdown:')
mockSelectedServices.forEach(serviceId => {
  console.log(`  ${serviceId}: $${servicePrices[serviceId] || 0}`)
})