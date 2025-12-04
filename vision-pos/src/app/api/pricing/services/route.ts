/**
 * GET /api/pricing/services
 * 
 * Returns all exam and fitting services from the database
 * with carrier-specific copays applied based on customer's authorization
 */

import { NextRequest, NextResponse } from 'next/server'
import { getExamServices, getContactLensFittings, calculateExamServicePricing, calculateFittingPricing } from '@/lib/services/unified-pricing-service'
import { getActiveAuthorizationForCustomer } from '@/lib/services/authorization-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const category = searchParams.get('category') // 'exam', 'fitting', or 'all'
    
    // Get authorization if customer provided
    let authorization = null
    if (customerId) {
      const authResult = await getActiveAuthorizationForCustomer(customerId)
      authorization = authResult?.authorization || null
    }
    
    const response: Record<string, unknown> = {
      success: true,
      customerId,
      hasInsurance: !!authorization,
      carrier: authorization?.plan.carrier || null,
    }
    
    // Fetch exam services
    if (!category || category === 'exam' || category === 'all') {
      const examServices = await getExamServices()
      const pricedExams = examServices
        .filter(s => s.category === 'EXAM')
        .map(service => calculateExamServicePricing(service, authorization))
      
      response.exams = pricedExams
    }
    
    // Fetch contact lens fittings
    if (!category || category === 'fitting' || category === 'all') {
      const fittings = await getContactLensFittings()
      const pricedFittings = fittings.map(fitting => calculateFittingPricing(fitting, authorization))
      
      response.fittings = pricedFittings
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('[Pricing Services API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch services' },
      { status: 500 }
    )
  }
}
