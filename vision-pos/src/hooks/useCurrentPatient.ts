'use client'

import { useEffect, useState, useCallback } from 'react'

interface CurrentPatient {
  id: string
  firstName: string
  lastName: string
  accessedAt: number
}

const STORAGE_KEY = 'vision-pos-current-patient'
const MAX_AGE_MS = 8 * 60 * 60 * 1000 // 8 hours

/**
 * Hook to persist and retrieve the currently active patient across pages.
 * Patient data is stored in localStorage with an 8-hour expiration.
 *
 * Usage:
 * - Call setCurrentPatient when selecting a patient in POS or viewing profile
 * - Call getCurrentPatient to retrieve the last accessed patient
 * - Use clearCurrentPatient when explicitly changing/clearing patient
 */
export function useCurrentPatient() {
  const [patient, setPatient] = useState<CurrentPatient | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as CurrentPatient
        // Check if expired
        if (Date.now() - parsed.accessedAt < MAX_AGE_MS) {
          setPatient(parsed)
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    } catch (e) {
      console.error('Error loading current patient:', e)
    }
    setIsLoading(false)
  }, [])

  // Set current patient
  const setCurrentPatient = useCallback((data: Omit<CurrentPatient, 'accessedAt'>) => {
    const patientData: CurrentPatient = {
      ...data,
      accessedAt: Date.now(),
    }
    setPatient(patientData)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(patientData))
    } catch (e) {
      console.error('Error saving current patient:', e)
    }
  }, [])

  // Clear current patient
  const clearCurrentPatient = useCallback(() => {
    setPatient(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (e) {
      console.error('Error clearing current patient:', e)
    }
  }, [])

  // Refresh access time (call when user interacts with patient data)
  const refreshPatientAccess = useCallback(() => {
    if (patient) {
      setCurrentPatient(patient)
    }
  }, [patient, setCurrentPatient])

  return {
    patient,
    isLoading,
    setCurrentPatient,
    clearCurrentPatient,
    refreshPatientAccess,
  }
}
