import Fuse from 'fuse.js'
import { Customer, CustomerSearchFilters, CustomerSearchResponse } from '@/types/customer'
import { prisma } from '@/lib/prisma'

/**
 * Advanced Customer Search Service
 * Week 4 Day 3: Fuzzy Search & Analytics
 */

export class CustomerSearchService {
  private static fuseOptions: Fuse.IFuseOptions<any> = {
    keys: [
      { name: 'firstName', weight: 0.3 },
      { name: 'lastName', weight: 0.3 },
      { name: 'email', weight: 0.2 },
      { name: 'phone', weight: 0.1 },
      { name: 'customerNumber', weight: 0.05 },
      { name: 'memberId', weight: 0.05 }
    ],
    threshold: 0.4, // 0.0 = perfect match, 1.0 = anything
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 2,
    shouldSort: true,
    location: 0,
    distance: 100,
    maxPatternLength: 32,
    useExtendedSearch: true
  }

  /**
   * Perform intelligent search with fuzzy matching
   */
  static async intelligentSearch(
    searchTerm: string,
    filters: CustomerSearchFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<CustomerSearchResponse> {
    try {
      // If no search term, use regular filtered search
      if (!searchTerm || searchTerm.trim().length < 2) {
        return await this.standardSearch(filters, page, limit)
      }

      // Get a broader set of customers for fuzzy matching
      const allCustomers = await prisma.customer.findMany({
        where: this.buildWhereClause(filters),
        include: {
          _count: {
            select: {
              transactions: true
            }
          }
        },
        take: 500 // Limit for performance
      })

      // Perform fuzzy search
      const fuse = new Fuse(allCustomers, this.fuseOptions)
      const fuzzyResults = fuse.search(searchTerm)

      // Extract customers with their match scores
      const matchedCustomers = fuzzyResults.map(result => ({
        ...result.item,
        _searchScore: result.score,
        _searchMatches: result.matches
      }))

      // Apply pagination
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedResults = matchedCustomers.slice(startIndex, endIndex)

      const totalPages = Math.ceil(matchedCustomers.length / limit)

      return {
        customers: paginatedResults,
        total: matchedCustomers.length,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    } catch (error) {
      console.error('Intelligent search error:', error)
      // Fallback to standard search
      return await this.standardSearch(filters, page, limit)
    }
  }

  /**
   * Standard database search with filters
   */
  static async standardSearch(
    filters: CustomerSearchFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<CustomerSearchResponse> {
    const skip = (page - 1) * limit
    const where = this.buildWhereClause(filters)

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          _count: {
            select: {
              transactions: true
            }
          }
        },
        orderBy: this.buildOrderBy(filters.sortBy, filters.sortOrder),
        skip,
        take: limit
      }),
      prisma.customer.count({ where })
    ])

    const totalPages = Math.ceil(total / limit)

    return {
      customers,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    }
  }

  /**
   * Build Prisma where clause from filters
   */
  private static buildWhereClause(filters: CustomerSearchFilters) {
    const where: any = {}

    // Basic search across multiple fields
    if (filters.search && filters.search.trim().length >= 2) {
      const searchTerm = filters.search.trim()
      where.OR = [
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm } },
        { customerNumber: { contains: searchTerm, mode: 'insensitive' } },
        { memberId: { contains: searchTerm } }
      ]
    }

    // Account status filter
    if (filters.accountStatus) {
      where.accountStatus = filters.accountStatus
    }

    // Insurance carrier filter
    if (filters.insuranceCarrier) {
      where.insuranceCarrier = { contains: filters.insuranceCarrier, mode: 'insensitive' }
    }

    // Location filters
    if (filters.city) {
      where.city = { contains: filters.city, mode: 'insensitive' }
    }
    if (filters.state) {
      where.state = filters.state
    }
    if (filters.zipCode) {
      where.zipCode = filters.zipCode
    }

    // High value customer filter
    if (filters.isHighValue !== undefined) {
      where.isHighValueCustomer = filters.isHighValue
    }

    // Recent visit filter
    if (filters.hasRecentVisit !== undefined) {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      if (filters.hasRecentVisit) {
        where.lastVisit = { gte: thirtyDaysAgo }
      } else {
        where.OR = [
          { lastVisit: { lt: thirtyDaysAgo } },
          { lastVisit: null }
        ]
      }
    }

    // Date range filters
    if (filters.hasVisitedSince) {
      where.lastVisit = { gte: new Date(filters.hasVisitedSince) }
    }

    if (filters.hasPurchasedSince) {
      where.lastPurchaseDate = { gte: new Date(filters.hasPurchasedSince) }
    }

    // Age range filter
    if (filters.ageRange) {
      const today = new Date()
      if (filters.ageRange.min !== undefined) {
        const maxBirthDate = new Date()
        maxBirthDate.setFullYear(today.getFullYear() - filters.ageRange.min)
        where.dateOfBirth = { ...where.dateOfBirth, lte: maxBirthDate }
      }
      if (filters.ageRange.max !== undefined) {
        const minBirthDate = new Date()
        minBirthDate.setFullYear(today.getFullYear() - filters.ageRange.max - 1)
        where.dateOfBirth = { ...where.dateOfBirth, gte: minBirthDate }
      }
    }

    // Gender filter
    if (filters.genderFilter) {
      where.gender = filters.genderFilter
    }

    return where
  }

  /**
   * Build Prisma orderBy clause
   */
  private static buildOrderBy(sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc') {
    switch (sortBy) {
      case 'name':
        return [{ lastName: sortOrder }, { firstName: sortOrder }]
      case 'lastVisit':
        return { lastVisit: sortOrder }
      case 'totalSpent':
        return { totalSpent: sortOrder }
      case 'registrationDate':
        return { registrationDate: sortOrder }
      default:
        return { registrationDate: 'desc' }
    }
  }

  /**
   * Get smart search suggestions
   */
  static async getSearchSuggestions(partialTerm: string, limit: number = 5): Promise<string[]> {
    if (!partialTerm || partialTerm.length < 2) return []

    try {
      const customers = await prisma.customer.findMany({
        where: {
          OR: [
            { firstName: { startsWith: partialTerm, mode: 'insensitive' } },
            { lastName: { startsWith: partialTerm, mode: 'insensitive' } },
            { email: { startsWith: partialTerm, mode: 'insensitive' } }
          ]
        },
        select: {
          firstName: true,
          lastName: true,
          email: true
        },
        take: limit * 2 // Get more to filter unique suggestions
      })

      const suggestions = new Set<string>()
      
      customers.forEach(customer => {
        const fullName = `${customer.firstName} ${customer.lastName}`
        if (fullName.toLowerCase().includes(partialTerm.toLowerCase())) {
          suggestions.add(fullName)
        }
        if (customer.email && customer.email.toLowerCase().includes(partialTerm.toLowerCase())) {
          suggestions.add(customer.email)
        }
      })

      return Array.from(suggestions).slice(0, limit)
    } catch (error) {
      console.error('Search suggestions error:', error)
      return []
    }
  }

  /**
   * Customer segmentation analysis
   */
  static async getCustomerSegmentation() {
    try {
      const [
        totalCustomers,
        highValueCustomers,
        frequentCustomers,
        atRiskCustomers,
        newCustomers,
        recentlyActiveCustomers
      ] = await Promise.all([
        // Total active customers
        prisma.customer.count({
          where: { accountStatus: 'ACTIVE' }
        }),
        
        // High value customers
        prisma.customer.count({
          where: { 
            accountStatus: 'ACTIVE',
            isHighValueCustomer: true 
          }
        }),
        
        // Frequent customers
        prisma.customer.count({
          where: { 
            accountStatus: 'ACTIVE',
            isFrequentCustomer: true 
          }
        }),
        
        // At-risk customers (no visit in 90+ days)
        prisma.customer.count({
          where: {
            accountStatus: 'ACTIVE',
            OR: [
              { lastVisit: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
              { lastVisit: null }
            ]
          }
        }),
        
        // New customers (registered in last 30 days)
        prisma.customer.count({
          where: {
            accountStatus: 'ACTIVE',
            registrationDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        }),
        
        // Recently active customers (visited in last 30 days)
        prisma.customer.count({
          where: {
            accountStatus: 'ACTIVE',
            lastVisit: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        })
      ])

      const segmentation = {
        total: totalCustomers,
        highValue: {
          count: highValueCustomers,
          percentage: totalCustomers > 0 ? (highValueCustomers / totalCustomers * 100).toFixed(1) : '0'
        },
        frequent: {
          count: frequentCustomers,
          percentage: totalCustomers > 0 ? (frequentCustomers / totalCustomers * 100).toFixed(1) : '0'
        },
        atRisk: {
          count: atRiskCustomers,
          percentage: totalCustomers > 0 ? (atRiskCustomers / totalCustomers * 100).toFixed(1) : '0'
        },
        new: {
          count: newCustomers,
          percentage: totalCustomers > 0 ? (newCustomers / totalCustomers * 100).toFixed(1) : '0'
        },
        recentlyActive: {
          count: recentlyActiveCustomers,
          percentage: totalCustomers > 0 ? (recentlyActiveCustomers / totalCustomers * 100).toFixed(1) : '0'
        }
      }

      return segmentation
    } catch (error) {
      console.error('Customer segmentation error:', error)
      throw error
    }
  }
}