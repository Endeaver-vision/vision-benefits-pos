'use client'

import { usePOSStore } from '@/stores/pos-store'
import { Stethoscope, Eye, Activity, AlertTriangle, AlertCircle } from 'lucide-react'
import ProductTile from '../ProductTile'

// Eye Exams
const EYE_EXAMS = [
  { id: 'routine-exam', name: 'Routine Vision Exam', retail: 100 },
  { id: 'medical-exam', name: 'Medical Exam', retail: 100 },
]

// Contact Lens Fittings - MUTUALLY EXCLUSIVE (only one can be selected)
const CL_FITTINGS = [
  { id: 'cl-sphere', name: 'Sphere', retail: 75 },
  { id: 'cl-toric', name: 'Toric', retail: 100 },
  { id: 'cl-multifocal', name: 'Multifocal', retail: 150 },
  { id: 'cl-monovision', name: 'Monovision', retail: 120 },
  { id: 'cl-rgp', name: 'RGP', retail: 350 },
  { id: 'cl-specialty', name: 'Specialty CL', retail: 850 },
  { id: 'cl-orthok', name: 'Ortho-K', retail: 2200 },
  { id: 'cl-misight', name: 'MiSight Fitting', retail: 1250 },
]

const CL_FITTING_IDS = CL_FITTINGS.map(f => f.id)

// Screenings & Diagnostics
const DIAGNOSTICS = [
  { id: 'optomap', name: 'Optomap', retail: 39 },
  { id: 'iwellness', name: 'iWellness', retail: 19 },
  { id: 'oct-retina', name: 'OCT Retina/ON', retail: 39 },
  { id: 'visual-field', name: 'Visual Field', retail: 39 },
  { id: 'external-photos', name: 'External Photos', retail: 29 },
  { id: 'neuro-ha-screen', name: 'Neuro HA Screen', retail: 89 },
  { id: 'corneal-thickness', name: 'Corneal Thickness', retail: 29 },
  { id: 'myopia-atropine', name: 'Myopia Atropine', retail: 350 },
]

type ExamService = {
  id: string
  name: string
  retail: number
}

export default function ExamServicesMenu() {
  const { quote, priceList, addLineItem, removeLineItem, hasGlassesItems } = usePOSStore()

  const hasInsurance = quote.insurance.hasActiveAuth

  // Get selected services for current pair
  const selectedIds = (quote.lineItems ?? [])
    .filter((item) => item.pairId === quote.activePairId && item.category === 'exam')
    .map((item) => item.productId)

  // Get price for exam service based on insurance copays or price list
  const getExamPrice = (service: ExamService): number => {
    // No insurance = retail price
    if (!hasInsurance) {
      return service.retail
    }

    // First check if we have a price in the price list
    if (priceList?.prices[service.id] !== undefined) {
      const priceData = priceList.prices[service.id]
      if (typeof priceData === 'number') {
        return priceData
      }
    }

    // Map specific services to priceList copays (the single source of truth)
    switch (service.id) {
      case 'routine-exam':
        // Use exam copay from priceList
        return priceList?.examCopay ?? service.retail

      // CL Fittings - use CL exam copay from priceList (the single source of truth)
      case 'cl-sphere':
      case 'cl-toric':
      case 'cl-multifocal':
      case 'cl-monovision':
      case 'cl-rgp':
        // Standard CL fittings - read from priceList
        return priceList?.contactLens?.fittingCopay ?? service.retail

      // Specialty CL fittings - typically not covered, use retail
      case 'cl-specialty':
      case 'cl-orthok':
      case 'cl-misight':
        return service.retail

      default:
        // Diagnostics not covered by vision insurance
        return service.retail
    }
  }

  // Check if a CL fitting is selected
  const selectedClFitting = (quote.lineItems ?? []).find(
    (item) =>
      item.pairId === quote.activePairId &&
      item.category === 'exam' &&
      CL_FITTING_IDS.includes(item.productId)
  )

  const handleSelect = (service: ExamService) => {
    const isSelected = selectedIds.includes(service.id)
    const isClFitting = CL_FITTING_IDS.includes(service.id)

    if (isSelected) {
      // Deselect: remove the item
      const item = (quote.lineItems ?? []).find(
        (i) =>
          i.productId === service.id &&
          i.pairId === quote.activePairId &&
          i.category === 'exam'
      )
      if (item) {
        removeLineItem(item.id)
      }
    } else {
      // Selecting: if this is a CL fitting, first remove any existing CL fitting
      if (isClFitting && selectedClFitting) {
        removeLineItem(selectedClFitting.id)
      }

      const price = getExamPrice(service)
      const insurancePays = hasInsurance ? Math.max(0, service.retail - price) : 0

      addLineItem({
        productId: service.id,
        name: service.name,
        category: 'exam',
        quantity: 1,
        retailPrice: service.retail,
        patientPays: price,
        insurancePays,
        pairId: quote.activePairId,
      })
    }
  }

  return (
    <div className="p-[2%] space-y-[3%]">
      {/* Eye Exams */}
      <div>
        <div className="flex items-center gap-2 mb-[1.5%]">
          <Stethoscope className="h-4 w-4 text-white/60" />
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wide">Eye Exams</h3>
        </div>
        <div className="grid grid-cols-4 gap-[2%]">
          {EYE_EXAMS.map((service) => (
            <ProductTile
              key={service.id}
              icon={Stethoscope}
              name={service.name}
              price={getExamPrice(service)}
              retailPrice={service.retail}
              showPrice={hasInsurance}
              isSelected={selectedIds.includes(service.id)}
              onClick={() => handleSelect(service)}
            />
          ))}
        </div>
      </div>

      {/* Contact Lens Fittings */}
      <div>
        {/* Benefit conflict warning for CL fittings */}
        {hasGlassesItems() && hasInsurance && (
          <div className="flex items-center gap-2 p-2 mb-2 bg-amber-500/20 border border-amber-500/30 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
            <span className="text-xs text-amber-300">
              <strong>Note:</strong> Glasses items in order. CL fittings use a separate benefit.
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 mb-[1.5%]">
          <Eye className="h-4 w-4 text-white/60" />
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wide">Contact Lens Fittings</h3>
        </div>
        <div className="grid grid-cols-4 gap-[2%]">
          {CL_FITTINGS.map((service) => (
            <ProductTile
              key={service.id}
              icon={Eye}
              name={service.name}
              price={getExamPrice(service)}
              retailPrice={service.retail}
              showPrice={hasInsurance}
              isSelected={selectedIds.includes(service.id)}
              onClick={() => handleSelect(service)}
            />
          ))}
        </div>
      </div>

      {/* Screenings & Diagnostics */}
      <div>
        <div className="flex items-center gap-2 mb-[1.5%]">
          <Activity className="h-4 w-4 text-white/60" />
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wide">Screenings & Diagnostics</h3>
        </div>
        <div className="grid grid-cols-4 gap-[2%]">
          {DIAGNOSTICS.map((service) => (
            <ProductTile
              key={service.id}
              icon={Activity}
              name={service.name}
              price={getExamPrice(service)}
              retailPrice={service.retail}
              showPrice={hasInsurance}
              isSelected={selectedIds.includes(service.id)}
              onClick={() => handleSelect(service)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
