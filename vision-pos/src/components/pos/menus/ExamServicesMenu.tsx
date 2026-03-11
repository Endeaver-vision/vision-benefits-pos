'use client'

import { usePOSStore } from '@/stores/pos-store'
import { Stethoscope, Eye, Activity } from 'lucide-react'
import ProductTile from '../ProductTile'

// Eye Exams
const EYE_EXAMS = [
  { id: 'routine-exam', name: 'Routine Vision Exam', retail: 100 },
  { id: 'medical-exam', name: 'Medical Exam', retail: 100 },
]

// Contact Lens Fittings
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
  const { quote, addLineItem, removeLineItem } = usePOSStore()

  // Get selected services for current pair
  const selectedIds = (quote.lineItems ?? [])
    .filter((item) => item.pairId === quote.activePairId && item.category === 'exam')
    .map((item) => item.productId)

  const handleSelect = (service: ExamService) => {
    const isSelected = selectedIds.includes(service.id)

    if (isSelected) {
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
      addLineItem({
        productId: service.id,
        name: service.name,
        category: 'exam',
        quantity: 1,
        retailPrice: service.retail,
        patientPays: service.retail,
        insurancePays: 0,
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
              isSelected={selectedIds.includes(service.id)}
              onClick={() => handleSelect(service)}
            />
          ))}
        </div>
      </div>

      {/* Contact Lens Fittings */}
      <div>
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
              isSelected={selectedIds.includes(service.id)}
              onClick={() => handleSelect(service)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
