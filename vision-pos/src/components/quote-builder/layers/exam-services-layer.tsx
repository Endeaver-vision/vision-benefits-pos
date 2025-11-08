'use client'

import { useCallback, useEffect } from 'react'
import { NavigationFooter } from '@/components/quote-builder/layout/navigation-footer'
import { 
  VSPCategorySection, 
  VSPSelectionButton, 
  VSPGrid2, 
  VSPGrid3
} from '@/components/ui/vsp-components'
import { useQuoteStore } from '@/store/quote-store'

interface ExamService {
  id: string
  name: string
  subtitle?: string
  price: number
  duration: number
  required?: boolean
  category: 'patient-type' | 'exam-type' | 'screeners' | 'diagnostics' | 'advanced' | 'contact-fitting'
  insuranceCovered?: boolean
  copay?: number
}

interface ExamServicesLayerProps {
  onNext: () => void
  onBack?: () => void
}

const examServices: ExamService[] = [
  // Patient Type
  {
    id: 'new-patient',
    name: 'New Patient',
    subtitle: 'First visit',
    price: 0,
    duration: 0,
    category: 'patient-type'
  },
  {
    id: 'established-patient',
    name: 'Established Patient',
    subtitle: 'Return visit',
    price: 0,
    duration: 0,
    category: 'patient-type'
  },
  
  // Exam Type
  {
    id: 'routine-exam',
    name: 'Routine Exam',
    subtitle: 'Good pricing',
    price: 150,
    duration: 60,
    category: 'exam-type',
    insuranceCovered: true,
    copay: 25
  },
  {
    id: 'medical-exam',
    name: 'Medical Exam',
    subtitle: 'Better',
    price: 200,
    duration: 90,
    category: 'exam-type',
    insuranceCovered: true,
    copay: 35
  },
  
  // Screeners
  {
    id: 'iwellness',
    name: 'iWellness',
    subtitle: '$39',
    price: 39,
    duration: 15,
    category: 'screeners'
  },
  {
    id: 'optomap',
    name: 'OptoMap (Ultra-Wide Field Image)',
    subtitle: '',
    price: 45,
    duration: 15,
    category: 'screeners'
  },
  
  // Diagnostics
  {
    id: 'oct-scan',
    name: 'OCT (Retina and Optic Nerve)',
    subtitle: '',
    price: 65,
    duration: 20,
    category: 'diagnostics'
  },
  {
    id: 'visual-field',
    name: 'Visual Field',
    subtitle: '',
    price: 85,
    duration: 30,
    category: 'diagnostics'
  },
  {
    id: 'external-photos',
    name: 'External Photos',
    subtitle: '',
    price: 25,
    duration: 10,
    category: 'diagnostics'
  },
  {
    id: 'corneal-thickness',
    name: 'Corneal Thickness Measurement',
    subtitle: '',
    price: 35,
    duration: 15,
    category: 'diagnostics'
  },
  
  // Advanced Testing
  {
    id: 'neurological-screening',
    name: 'Neurological Headache Screening',
    subtitle: '',
    price: 120,
    duration: 45,
    category: 'advanced'
  },
  {
    id: 'atropine-evaluation',
    name: 'Atropine Myopia Management Evaluation',
    subtitle: '',
    price: 95,
    duration: 35,
    category: 'advanced'
  },
  {
    id: 'amblyopia-evaluation',
    name: 'Amblyopia Evaluation',
    subtitle: '',
    price: 110,
    duration: 40,
    category: 'advanced'
  },
  
  // Contact Lens Fitting
  {
    id: 'spherical-fitting',
    name: 'Spherical fitting',
    subtitle: '',
    price: 75,
    duration: 30,
    category: 'contact-fitting'
  },
  {
    id: 'toric-fitting',
    name: 'Toric Fitting',
    subtitle: '',
    price: 95,
    duration: 35,
    category: 'contact-fitting'
  },
  {
    id: 'monovision-fitting',
    name: 'Monovision Fitting',
    subtitle: '',
    price: 85,
    duration: 30,
    category: 'contact-fitting'
  },
  {
    id: 'multifocal-fitting',
    name: 'Multifocal Fitting',
    subtitle: '',
    price: 120,
    duration: 45,
    category: 'contact-fitting'
  },
  {
    id: 'multifocal-toric-fitting',
    name: 'Multifocal Toric Fitting',
    subtitle: '',
    price: 150,
    duration: 60,
    category: 'contact-fitting'
  },
  {
    id: 'corneal-rgp-fitting',
    name: 'Corneal RGP Fitting',
    subtitle: '',
    price: 200,
    duration: 60,
    category: 'contact-fitting'
  },
  {
    id: 'specialty-contact-fitting',
    name: 'Specialty Contact Lens Fitting',
    subtitle: '',
    price: 250,
    duration: 75,
    category: 'contact-fitting'
  },
  {
    id: 'ortho-k-fitting',
    name: 'Ortho-K Myopia Management',
    subtitle: '',
    price: 300,
    duration: 90,
    category: 'contact-fitting'
  },
  {
    id: 'mysight-fitting',
    name: 'MySight Myopia Management',
    subtitle: '',
    price: 275,
    duration: 80,
    category: 'contact-fitting'
  }
]

export default function ExamServicesLayer({ onNext, onBack }: ExamServicesLayerProps) {
  const { updateExamServices, saveQuote, getSelectedExamServices } = useQuoteStore()
  
  // Work directly with Zustand store - no local state duplication
  const selectedServices = getSelectedExamServices()
  
  // Initialize default services if none are selected
  useEffect(() => {
    if (selectedServices.length === 0) {
      updateExamServices(['new-patient', 'routine-exam'])
    }
  }, [selectedServices.length, updateExamServices])

  const saveExamData = useCallback(async () => {
    try {
      await saveQuote()
    } catch (error) {
      console.error('Failed to save exam data:', error)
    }
  }, [saveQuote])

  const handleServiceToggle = (serviceId: string, category: string) => {
    let newServices: string[]
    
    // Handle mutually exclusive selections
    if (category === 'patient-type' || category === 'exam-type') {
      // Remove other selections in the same category
      const filtered = selectedServices.filter(id => {
        const service = examServices.find(s => s.id === id)
        return service?.category !== category
      })
      newServices = [...filtered, serviceId]
    } else {
      // Handle multiple selections
      if (selectedServices.includes(serviceId)) {
        newServices = selectedServices.filter(id => id !== serviceId)
      } else {
        newServices = [...selectedServices, serviceId]
      }
    }
    
    // Update Zustand store directly - no local state involved
    updateExamServices(newServices)
  }

  const isServiceSelected = (serviceId: string) => {
    return selectedServices.includes(serviceId)
  }

  const getSelectedServicesData = () => {
    return examServices.filter(service => selectedServices.includes(service.id))
  }

  const calculateTotal = () => {
    const services = getSelectedServicesData()
    const subtotal = services.reduce((sum, service) => sum + service.price, 0)
    const insuranceDiscount = services.reduce((sum, service) => {
      return sum + (service.insuranceCovered ? (service.price - (service.copay || 0)) : 0)
    }, 0)
    const patientResponsibility = subtotal - insuranceDiscount
    
    return { subtotal, insuranceDiscount, patientResponsibility }
  }

  const getTotalDuration = () => {
    return getSelectedServicesData().reduce((sum, service) => sum + service.duration, 0)
  }

  // Validation functions for NavigationFooter
  const getValidationErrors = (): string[] => {
    const errors: string[] = []
    
    const hasPatientType = selectedServices.some(id => 
      examServices.find(service => service.id === id)?.category === 'patient-type'
    )
    const hasExamType = selectedServices.some(id => 
      examServices.find(service => service.id === id)?.category === 'exam-type'
    )
    
    if (!hasPatientType) {
      errors.push('Please select patient type (New or Established)')
    }
    if (!hasExamType) {
      errors.push('Please select exam type (Routine or Medical)')
    }
    
    return errors
  }

  const getValidationWarnings = (): string[] => {
    const warnings: string[] = []
    
    if (getTotalDuration() > 120) {
      warnings.push('Appointment may be lengthy - consider scheduling across multiple visits')
    }
    
    return warnings
  }

  const canProceedWithSelection = (): boolean => {
    const hasPatientType = selectedServices.some(id => 
      examServices.find(service => service.id === id)?.category === 'patient-type'
    )
    const hasExamType = selectedServices.some(id => 
      examServices.find(service => service.id === id)?.category === 'exam-type'
    )
    return hasPatientType && hasExamType
  }

  const handleNext = async () => {
    if (canProceedWithSelection()) {
      // Save data before navigation
      await saveExamData()
      console.log('Selected exam services:', {
        services: getSelectedServicesData(),
        totals: calculateTotal()
      })
      onNext()
    }
  }

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`
  }

  const getServicesByCategory = (category: string) => {
    return examServices.filter(service => service.category === category)
  }

  return (
    <div className="space-y-8 bg-vsp-light min-h-screen p-6">
      
      {/* Header */}
      <div className="text-center">
        <h2 className="text-vsp-title text-2xl mb-2">Exams</h2>
        <p className="text-vsp-subtitle">Select exam type and add any additional tests.</p>
      </div>

      {/* Patient Type */}
      <VSPCategorySection number={1} title="Select Patient Type">
        <VSPGrid2>
          {getServicesByCategory('patient-type').map(service => (
            <VSPSelectionButton
              key={service.id}
              selected={isServiceSelected(service.id)}
              onClick={() => handleServiceToggle(service.id, service.category)}
              subtitle={service.subtitle}
            >
              {service.name}
            </VSPSelectionButton>
          ))}
        </VSPGrid2>
        <p className="text-xs text-neutral-500 mt-2">Select patient type to continue</p>
      </VSPCategorySection>

      {/* Exam Type */}
      <VSPCategorySection number={2} title="Select Exam Type">
        <VSPGrid2>
          {getServicesByCategory('exam-type').map(service => (
            <VSPSelectionButton
              key={service.id}
              selected={isServiceSelected(service.id)}
              onClick={() => handleServiceToggle(service.id, service.category)}
              subtitle={service.subtitle}
              price={service.insuranceCovered ? `$${service.copay} copay` : formatPrice(service.price)}
            >
              {service.name}
            </VSPSelectionButton>
          ))}
        </VSPGrid2>
        <p className="text-xs text-neutral-500 mt-2">Cash exam fee is $100</p>
      </VSPCategorySection>

      {/* Screeners */}
      <VSPCategorySection number={3} title="Screeners">
        <VSPGrid2>
          {getServicesByCategory('screeners').map(service => (
            <VSPSelectionButton
              key={service.id}
              selected={isServiceSelected(service.id)}
              onClick={() => handleServiceToggle(service.id, service.category)}
              price={formatPrice(service.price)}
            >
              {service.name}
            </VSPSelectionButton>
          ))}
        </VSPGrid2>
      </VSPCategorySection>

      {/* Diagnostics */}
      <VSPCategorySection number={4} title="Diagnostics">
        <VSPGrid2>
          {getServicesByCategory('diagnostics').map(service => (
            <VSPSelectionButton
              key={service.id}
              selected={isServiceSelected(service.id)}
              onClick={() => handleServiceToggle(service.id, service.category)}
              price={formatPrice(service.price)}
            >
              {service.name}
            </VSPSelectionButton>
          ))}
        </VSPGrid2>
      </VSPCategorySection>

      {/* Advanced Testing */}
      <VSPCategorySection number={5} title="Advanced Testing">
        <VSPGrid3>
          {getServicesByCategory('advanced').map(service => (
            <VSPSelectionButton
              key={service.id}
              selected={isServiceSelected(service.id)}
              onClick={() => handleServiceToggle(service.id, service.category)}
              price={formatPrice(service.price)}
            >
              {service.name}
            </VSPSelectionButton>
          ))}
        </VSPGrid3>
      </VSPCategorySection>

      {/* Contact Lens Exam - One Click Panel */}
      <VSPCategorySection number={6} title="Contact Lens Exam (Optional)">
        <div className="space-y-6">
          {/* Standard Soft Lens */}
          <div className="space-y-3">
            <h5 className="text-vsp-label">Standard Soft Lens</h5>
            <VSPGrid2>
              {getServicesByCategory('contact-fitting')
                .filter(service => ['spherical-fitting', 'toric-fitting', 'monovision-fitting', 'multifocal-fitting'].includes(service.id))
                .map(service => (
                <VSPSelectionButton
                  key={service.id}
                  selected={isServiceSelected(service.id)}
                  onClick={() => handleServiceToggle(service.id, service.category)}
                  price={formatPrice(service.price)}
                >
                  {service.name}
                </VSPSelectionButton>
              ))}
            </VSPGrid2>
          </div>

          {/* Specialty Fittings */}
          <div className="space-y-3">
            <h5 className="text-vsp-label">Specialty Fittings</h5>
            <VSPGrid2>
              {getServicesByCategory('contact-fitting')
                .filter(service => ['multifocal-toric-fitting', 'corneal-rgp-fitting', 'specialty-contact-fitting'].includes(service.id))
                .map(service => (
                <VSPSelectionButton
                  key={service.id}
                  selected={isServiceSelected(service.id)}
                  onClick={() => handleServiceToggle(service.id, service.category)}
                  price={formatPrice(service.price)}
                >
                  {service.name}
                </VSPSelectionButton>
              ))}
            </VSPGrid2>
          </div>

          {/* Myopia Management */}
          <div className="space-y-3">
            <h5 className="text-vsp-label">Myopia Management</h5>
            <VSPGrid2>
              {getServicesByCategory('contact-fitting')
                .filter(service => ['ortho-k-fitting', 'mysight-fitting'].includes(service.id))
                .map(service => (
                <VSPSelectionButton
                  key={service.id}
                  selected={isServiceSelected(service.id)}
                  onClick={() => handleServiceToggle(service.id, service.category)}
                  price={formatPrice(service.price)}
                >
                  {service.name}
                </VSPSelectionButton>
              ))}
            </VSPGrid2>
          </div>
        </div>
      </VSPCategorySection>

      {/* Navigation Footer */}
      <NavigationFooter
        currentStep={1}
        totalSteps={3}
        onNext={handleNext}
        onBack={onBack}
        canProceed={canProceedWithSelection()}
        validationErrors={getValidationErrors()}
        validationWarnings={getValidationWarnings()}
        nextLabel="Continue to Glasses"
        backLabel="Back to Customer"
      />
    </div>
  )
}