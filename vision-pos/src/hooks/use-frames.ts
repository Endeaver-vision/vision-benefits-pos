/**
 * Frames Hook
 *
 * Fetches frames from inventory with filtering, searching, and pagination
 */

import { useState, useEffect, useCallback } from 'react'

export interface Frame {
  id: string
  sku: string
  brand: string
  model: string
  color: string
  size: string
  price: number
  manufacturer: string
  material: string
  style: string
  category: 'value' | 'designer' | 'premium'
  inStock: boolean
  isFeaturedBrand: boolean
}

interface FramesFilters {
  search?: string
  brand?: string
  minPrice?: number
  maxPrice?: number
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

interface FramesResponse {
  frames: Frame[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
  }
  filters: {
    brands: Array<{ name: string; count: number }>
  }
}

interface UseFramesReturn {
  frames: Frame[]
  brands: Array<{ name: string; count: number }>
  isLoading: boolean
  error: string | null
  pagination: {
    page: number
    totalPages: number
    totalCount: number
  }
  fetchFrames: (filters?: FramesFilters) => Promise<void>
  setPage: (page: number) => void
  setSearch: (search: string) => void
  setBrand: (brand: string) => void
}

export function useFrames(initialFilters?: FramesFilters): UseFramesReturn {
  const [frames, setFrames] = useState<Frame[]>([])
  const [brands, setBrands] = useState<Array<{ name: string; count: number }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalCount: 0,
  })
  const [filters, setFilters] = useState<FramesFilters>(initialFilters || {})

  const fetchFrames = useCallback(async (newFilters?: FramesFilters) => {
    const currentFilters = newFilters || filters
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (currentFilters.search) params.set('search', currentFilters.search)
      if (currentFilters.brand) params.set('brand', currentFilters.brand)
      if (currentFilters.minPrice) params.set('minPrice', currentFilters.minPrice.toString())
      if (currentFilters.maxPrice) params.set('maxPrice', currentFilters.maxPrice.toString())
      if (currentFilters.page) params.set('page', currentFilters.page.toString())
      if (currentFilters.limit) params.set('limit', currentFilters.limit.toString())
      if (currentFilters.sortBy) params.set('sortBy', currentFilters.sortBy)
      if (currentFilters.sortOrder) params.set('sortOrder', currentFilters.sortOrder)

      const response = await fetch(`/api/frames?${params.toString()}`)
      const data: FramesResponse & { success: boolean; error?: string } = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch frames')
      }

      setFrames(data.frames)
      setBrands(data.filters.brands)
      setPagination({
        page: data.pagination.page,
        totalPages: data.pagination.totalPages,
        totalCount: data.pagination.totalCount,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch frames')
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  const setPage = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }))
  }, [])

  const setSearch = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search, page: 1 }))
  }, [])

  const setBrand = useCallback((brand: string) => {
    setFilters(prev => ({ ...prev, brand, page: 1 }))
  }, [])

  // Fetch frames when filters change
  useEffect(() => {
    fetchFrames(filters)
  }, [filters, fetchFrames])

  return {
    frames,
    brands,
    isLoading,
    error,
    pagination,
    fetchFrames,
    setPage,
    setSearch,
    setBrand,
  }
}
