'use client'

import { useRouter } from 'next/navigation'
import { usePOSStore } from '@/stores/pos-store'
import { useCurrentPatient } from '@/hooks/useCurrentPatient'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  User,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Loader2,
  X,
  ExternalLink,
} from 'lucide-react'

/**
 * Persistent patient banner that displays across the top of the POS
 * Dark glass theme - glass-morphism with light text
 * Shows: Patient info, insurance status, allowances, save status
 */
export default function PatientBanner() {
  const router = useRouter()
  const {
    quote,
    priceList,
    priceListLoading,
    isDirty,
    isSaving,
    lastSavedAt,
    clearPatient,
  } = usePOSStore()
  const { clearCurrentPatient } = useCurrentPatient()

  const { patient, insurance } = quote

  // Handle changing patient - clear state AND URL param
  const handleChangePatient = () => {
    clearPatient()
    clearCurrentPatient()
    // Navigate to POS without customerId param to prevent re-fetch
    router.replace('/pos')
  }

  // Navigate to patient profile, with param indicating we came from POS
  const handleViewProfile = () => {
    if (patient?.id) {
      router.push(`/customers/${patient.id}?from=pos`)
    }
  }

  // No patient selected
  if (!patient) {
    return (
      <div className="px-4 py-3 flex items-center justify-center text-white/50">
        <User className="h-5 w-5 mr-2" />
        <span>Select a patient to begin</span>
      </div>
    )
  }

  // Format last saved time
  const formatSavedTime = () => {
    if (!lastSavedAt) return null
    const diff = Date.now() - lastSavedAt.getTime()
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    return lastSavedAt.toLocaleTimeString()
  }

  return (
    <div className="px-4 py-3 flex items-center justify-between">
      {/* Left: Patient Info */}
      <div className="flex items-center gap-4">
        {/* Patient Avatar */}
        <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
          <span className="text-blue-400 font-semibold text-lg">
            {patient.firstName[0]}{patient.lastName[0]}
          </span>
        </div>

        {/* Patient Details */}
        <div>
          <button
            onClick={handleViewProfile}
            className="group flex items-center gap-1 hover:opacity-80 transition-opacity"
          >
            <h2 className="font-semibold text-lg text-white group-hover:underline">
              {patient.firstName} {patient.lastName}
            </h2>
            <ExternalLink className="h-3 w-3 text-white/40 group-hover:text-white/70" />
          </button>
          <div className="flex items-center gap-3 text-sm text-white/60">
            {patient.dob && <span>DOB: {patient.dob}</span>}
            {patient.phone && <span>{patient.phone}</span>}
          </div>
        </div>

        {/* Insurance Status */}
        <div className="ml-4 flex items-center gap-2">
          {insurance.carrier ? (
            <>
              <Badge
                variant="default"
                className={
                  insurance.carrier === 'VSP'
                    ? 'bg-blue-600 text-white'
                    : insurance.carrier === 'EYEMED'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-600 text-white'
                }
              >
                {insurance.carrier}
              </Badge>

              {insurance.hasActiveAuth ? (
                <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active Auth
                </Badge>
              ) : (
                <Badge variant="outline" className="text-orange-600 border-orange-600 bg-orange-50">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  No Auth
                </Badge>
              )}
            </>
          ) : (
            <Badge variant="outline" className="text-white/70 border-white/30">
              Cash Patient
            </Badge>
          )}

          {priceListLoading && (
            <Badge variant="secondary" className="bg-white/10 text-white/70">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Loading prices...
            </Badge>
          )}

          {!priceListLoading && !priceList && insurance.hasActiveAuth && (
            <Badge variant="outline" className="text-red-600 border-red-600 bg-red-50">
              No Price List
            </Badge>
          )}
        </div>
      </div>

      {/* Center: Allowances (if applicable) */}
      {insurance.hasActiveAuth && (
        <div className="flex items-center gap-6 text-sm">
          {insurance.frameAllowance !== undefined && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <span className="text-white/60">Frame:</span>
              <span className="font-semibold text-emerald-400">
                ${insurance.frameAllowance}
              </span>
            </div>
          )}
          {insurance.examCopay !== undefined && (
            <div className="flex items-center gap-1">
              <span className="text-white/60">Exam Copay:</span>
              <span className="font-semibold text-white">${insurance.examCopay}</span>
            </div>
          )}
          {insurance.materialCopay !== undefined && (
            <div className="flex items-center gap-1">
              <span className="text-white/60">Material Copay:</span>
              <span className="font-semibold text-white">${insurance.materialCopay}</span>
            </div>
          )}
          {insurance.currentTier && (
            <div className="flex items-center gap-1">
              <span className="text-white/60">Tier:</span>
              <Badge variant="secondary" className="bg-white/10 text-white/90">
                {insurance.currentTier}
              </Badge>
            </div>
          )}
        </div>
      )}

      {/* Right: Save Status + Actions */}
      <div className="flex items-center gap-4">
        {/* Save Status */}
        <div className="flex items-center gap-2 text-sm">
          {isSaving ? (
            <span className="text-white/60 flex items-center">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Saving...
            </span>
          ) : isDirty ? (
            <span className="text-orange-400 flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              Unsaved changes
            </span>
          ) : lastSavedAt ? (
            <span className="text-emerald-400 flex items-center">
              <CheckCircle className="h-3 w-3 mr-1" />
              Saved {formatSavedTime()}
            </span>
          ) : null}
        </div>

        {/* Quote ID */}
        {quote.id && (
          <Badge variant="outline" className="font-mono text-xs border-white/30 text-white/50">
            {quote.id}
          </Badge>
        )}

        {/* Change Patient */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleChangePatient}
          className="text-white/60 hover:text-white hover:bg-white/10"
        >
          <X className="h-4 w-4 mr-1" />
          Change
        </Button>
      </div>
    </div>
  )
}
