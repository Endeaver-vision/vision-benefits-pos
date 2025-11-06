import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

export interface ExamService {
  id: string
  name: string
  subtitle?: string
  price: number
  duration: number
  category: 'PATIENT_TYPE' | 'EXAM_TYPE' | 'SCREENERS' | 'DIAGNOSTICS' | 'ADVANCED' | 'CONTACT_FITTING'
  insuranceCovered: boolean
  copay?: number
  active: boolean
  locationId?: string
  createdAt: string
  updatedAt: string
}

export interface UseExamServicesOptions {
  locationId?: string
  category?: string
  active?: boolean
}

export interface UseExamServicesReturn {
  examServices: ExamService[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useExamServices(options: UseExamServicesOptions = {}): UseExamServicesReturn {
  const { data: session } = useSession()
  const [examServices, setExamServices] = useState<ExamService[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchExamServices = useCallback(async () => {
    if (!session) {
      setError('No authentication session')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Build query parameters
      const params = new URLSearchParams()
      if (options.locationId) params.append('locationId', options.locationId)
      if (options.category) params.append('category', options.category)
      if (options.active !== undefined) params.append('active', options.active.toString())

      const response = await fetch(`/api/exam-services?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch exam services: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch exam services')
      }

      setExamServices(data.data || [])
    } catch (err) {
      console.error('Error fetching exam services:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }, [session, options.locationId, options.category, options.active])

  useEffect(() => {
    fetchExamServices()
  }, [fetchExamServices])

  return {
    examServices,
    loading,
    error,
    refetch: fetchExamServices
  }
}

// Helper function to get services by category
export function getServicesByCategory(services: ExamService[], category: string): ExamService[] {
  return services.filter(service => service.category === category)
}

// Helper function to map database categories to frontend display names
export function getCategoryDisplayName(category: string): string {
  const categoryMap: Record<string, string> = {
    'PATIENT_TYPE': 'Patient Type',
    'EXAM_TYPE': 'Exam Type',
    'SCREENERS': 'Screeners',
    'DIAGNOSTICS': 'Diagnostics',
    'ADVANCED': 'Advanced Testing',
    'CONTACT_FITTING': 'Contact Lens Fitting'
  }
  return categoryMap[category] || category
}

// Helper function to format frontend categories for API
export function formatCategoryForApi(category: string): string {
  const categoryMap: Record<string, string> = {
    'patient-type': 'PATIENT_TYPE',
    'exam-type': 'EXAM_TYPE',
    'screeners': 'SCREENERS', 
    'diagnostics': 'DIAGNOSTICS',
    'advanced': 'ADVANCED',
    'contact-fitting': 'CONTACT_FITTING'
  }
  return categoryMap[category] || category.toUpperCase()
}