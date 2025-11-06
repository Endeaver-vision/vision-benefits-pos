// Quick test to see what models are available in Prisma client
import { prisma } from '@/lib/prisma'

// Test what models are available
console.log('Available Prisma models:', Object.keys(prisma))

// Try to see if our model exists with different naming
const testClient = prisma as any
console.log('Testing model names:')
console.log('pofIncidents:', typeof testClient.pofIncidents)
console.log('PofIncidents:', typeof testClient.PofIncidents) 
console.log('pof_incidents:', typeof testClient.pof_incidents)

export { testClient }