'use client'

import { useRouter } from 'next/navigation'
import { useCurrentPatient } from '@/hooks/useCurrentPatient'
import { Button } from '@/components/ui/button'
import { User, X, ArrowRight } from 'lucide-react'

/**
 * A small banner that shows the currently active patient.
 * Use this on pages outside of POS/customer profile to provide quick navigation.
 */
export function CurrentPatientBanner() {
  const router = useRouter()
  const { patient, isLoading, clearCurrentPatient } = useCurrentPatient()

  if (isLoading || !patient) {
    return null
  }

  return (
    <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
          <User className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <span className="text-sm text-blue-800">
            Working with: <strong>{patient.firstName} {patient.lastName}</strong>
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/customers/${patient.id}`)}
          className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
        >
          Profile
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/pos?customerId=${patient.id}`)}
          className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
        >
          POS
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={clearCurrentPatient}
          className="h-6 w-6 text-blue-400 hover:text-blue-600 hover:bg-blue-100"
          title="Clear current patient"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
