import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { 
  QuoteData, 
  LayerId,
  PatientInfo,
  InsuranceInfo,
  ExamServices,
  EyeglassesSelection,
  ContactLensSelection,
  PricingBreakdown
} from '../types/quote-builder'

// Initial state for a new quote
const initialQuoteData: QuoteData = {
  status: 'building',
  patient: {
    name: '',
    phone: '',
    email: ''
  },
  insurance: {
    carrier: '',
    planName: '',
    memberId: ''
  },
  exam: {
    selectedServices: [],
    medicalDiagnosis: '',
    notes: ''
  },
  eyeglasses: {
    frame: null,
    lenses: {
      type: '',
      material: ''
    },
    enhancements: []
  },
  contacts: {
    brand: '',
    type: '',
    parameters: {}
  },
  pricing: {
    exam: {
      comprehensive: 0,
      contactFitting: 0,
      iwellness: 0,
      optomap: 0,
      total: 0
    },
    eyeglasses: {
      frame: 0,
      lenses: 0,
      enhancements: 0,
      total: 0
    },
    contacts: {
      product: 0,
      fitting: 0,
      total: 0
    },
    subtotal: 0,
    insurance: {
      examCoverage: 0,
      frameCoverage: 0,
      lensCoverage: 0,
      contactCoverage: 0,
      totalCoverage: 0
    },
    secondPairDiscount: 0,
    finalTotal: 0,
    patientResponsibility: 0
  }
}

interface QuoteBuilderState {
  // Current state
  currentLayer: LayerId
  completedLayers: Set<LayerId>
  quote: QuoteData
  autoSave: {
    enabled: boolean
    intervalMs: number
    lastSaved: Date | null
    isDirty: boolean
  }
  
  // Actions
  setCurrentLayer: (layer: LayerId) => void
  markLayerComplete: (layer: LayerId) => void
  markLayerIncomplete: (layer: LayerId) => void
  updatePatient: (patient: Partial<PatientInfo>) => void
  updateInsurance: (insurance: Partial<InsuranceInfo>) => void
  updateExam: (exam: Partial<ExamServices>) => void
  updateEyeglasses: (eyeglasses: Partial<EyeglassesSelection>) => void
  updateContacts: (contacts: Partial<ContactLensSelection>) => void
  updatePricing: (pricing: Partial<PricingBreakdown>) => void
  updateExamServices: (services: string[]) => void
  getSelectedExamServices: () => string[]
  getExamServicesTotal: () => number
  getExamServicesPricing: () => {
    subtotal: number
    insuranceApplied: number
    patientResponsibility: number
    services: Array<{
      id: string
      price: number
      coverage?: { copay?: number; covered: boolean }
    }>
  }
  getExamLayerValidation: () => {
    isValid: boolean
    errors: string[]
    warnings: string[]
    totalDuration: number
  }
  saveQuote: () => Promise<void>
  loadQuote: (id: string) => Promise<void>
  resetQuote: () => void
  setAutoSaveEnabled: (enabled: boolean) => void
}

export const useQuoteStore = create<QuoteBuilderState>()(
  devtools(
    (set, get) => ({
      // Current state
      currentLayer: 'exam',
      completedLayers: new Set<LayerId>(),
      quote: { ...initialQuoteData },
      autoSave: {
        enabled: true,
        intervalMs: 30000, // 30 seconds
        lastSaved: null,
        isDirty: false
      },

      // Layer navigation actions
      setCurrentLayer: (layer: LayerId) => {
        set({ currentLayer: layer }, false, 'setCurrentLayer')
      },

      markLayerComplete: (layer: LayerId) => {
        set((state) => ({
          completedLayers: new Set([...state.completedLayers, layer])
        }), false, 'markLayerComplete')
      },

      markLayerIncomplete: (layer: LayerId) => {
        set((state) => {
          const newCompleted = new Set(state.completedLayers)
          newCompleted.delete(layer)
          return { completedLayers: newCompleted }
        }, false, 'markLayerIncomplete')
      },

      // Quote data update actions
      updatePatient: (patient: Partial<PatientInfo>) => {
        set((state) => ({
          quote: {
            ...state.quote,
            patient: { ...state.quote.patient, ...patient },
            updatedAt: new Date()
          },
          autoSave: { ...state.autoSave, isDirty: true }
        }), false, 'updatePatient')
      },

      updateInsurance: (insurance: Partial<InsuranceInfo>) => {
        set((state) => ({
          quote: {
            ...state.quote,
            insurance: { ...state.quote.insurance, ...insurance },
            updatedAt: new Date()
          },
          autoSave: { ...state.autoSave, isDirty: true }
        }), false, 'updateInsurance')
      },

      updateExam: (exam: Partial<ExamServices>) => {
        set((state) => ({
          quote: {
            ...state.quote,
            exam: { ...state.quote.exam, ...exam },
            updatedAt: new Date()
          },
          autoSave: { ...state.autoSave, isDirty: true }
        }), false, 'updateExam')
      },

      updateEyeglasses: (eyeglasses: Partial<EyeglassesSelection>) => {
        set((state) => ({
          quote: {
            ...state.quote,
            eyeglasses: { ...state.quote.eyeglasses, ...eyeglasses },
            updatedAt: new Date()
          },
          autoSave: { ...state.autoSave, isDirty: true }
        }), false, 'updateEyeglasses')
      },

      updateContacts: (contacts: Partial<ContactLensSelection>) => {
        set((state) => ({
          quote: {
            ...state.quote,
            contacts: { ...state.quote.contacts, ...contacts },
            updatedAt: new Date()
          },
          autoSave: { ...state.autoSave, isDirty: true }
        }), false, 'updateContacts')
      },

      updatePricing: (pricing: Partial<PricingBreakdown>) => {
        set((state) => ({
          quote: {
            ...state.quote,
            pricing: { ...state.quote.pricing, ...pricing },
            updatedAt: new Date()
          }
          // Note: Don't mark pricing updates as dirty for auto-save
          // since pricing is calculated, not user input
        }), false, 'updatePricing')
      },

      // Persistence actions
      saveQuote: async () => {
        const state = get()
        try {
          // TODO: Implement API call to save quote
          console.log('Saving quote:', state.quote)
          
          // Mock API call
          await new Promise(resolve => setTimeout(resolve, 500))
          
          set((state) => ({
            autoSave: {
              ...state.autoSave,
              lastSaved: new Date(),
              isDirty: false
            }
          }), false, 'saveQuote')
          
        } catch (error) {
          console.error('Failed to save quote:', error)
          // TODO: Add error handling/notification
        }
      },

      loadQuote: async (id: string) => {
        try {
          // TODO: Implement API call to load quote
          console.log('Loading quote:', id)
          
          // Mock API call
          await new Promise(resolve => setTimeout(resolve, 500))
          
          // For now, just reset to initial state
          const newQuote = { ...initialQuoteData, id }
          
          set({
            quote: newQuote,
            autoSave: {
              enabled: true,
              intervalMs: 30000,
              lastSaved: new Date(),
              isDirty: false
            }
          }, false, 'loadQuote')
          
        } catch (error) {
          console.error('Failed to load quote:', error)
          // TODO: Add error handling/notification
        }
      },

      resetQuote: () => {
        set({
          currentLayer: 'exam',
          completedLayers: new Set<LayerId>(),
          quote: { ...initialQuoteData },
          autoSave: {
            enabled: true,
            intervalMs: 30000,
            lastSaved: null,
            isDirty: false
          }
        }, false, 'resetQuote')
      },

      setAutoSaveEnabled: (enabled: boolean) => {
        set((state) => ({
          autoSave: { ...state.autoSave, enabled }
        }), false, 'setAutoSaveEnabled')
      },

      // Exam services specific actions
      updateExamServices: (services: string[]) => {
        set((state) => ({
          quote: {
            ...state.quote,
            exam: { ...state.quote.exam, selectedServices: services },
            updatedAt: new Date()
          },
          autoSave: { ...state.autoSave, isDirty: true }
        }), false, 'updateExamServices')
      },

      getSelectedExamServices: () => {
        return get().quote.exam.selectedServices
      },

      getExamServicesTotal: () => {
        const services = get().quote.exam.selectedServices
        // Define exam service prices (this would normally come from a database)
        const servicePrices: Record<string, number> = {
          'comprehensive-exam': 275.00,
          'contact-lens-fitting': 125.00,
          'retinal-imaging': 85.00,
          'visual-field-testing': 95.00,
          'oct-scan': 145.00,
          // Add-on services
          'dilation': 35.00,
          'retinal-photos': 65.00,
          'oct-macula': 125.00,
          'oct-glaucoma': 125.00,
          'visual-field-extended': 75.00,
          'corneal-topography': 95.00
        }
        
        return services.reduce((total, serviceId) => {
          return total + (servicePrices[serviceId] || 0)
        }, 0)
      },

      getExamServicesPricing: () => {
        const services = get().quote.exam.selectedServices
        const { carrier } = get().quote.insurance
        
        const servicePrices: Record<string, number> = {
          'comprehensive-exam': 275.00,
          'contact-lens-fitting': 125.00,
          'retinal-imaging': 85.00,
          'visual-field-testing': 95.00,
          'oct-scan': 145.00,
          'dilation': 35.00,
          'retinal-photos': 65.00,
          'oct-macula': 125.00,
          'oct-glaucoma': 125.00,
          'visual-field-extended': 75.00,
          'corneal-topography': 95.00
        }

        // Mock insurance coverage - in real app would come from API
        const insuranceCoverage: Record<string, { copay?: number; covered: boolean }> = {
          'comprehensive-exam': { copay: carrier === 'VSP' ? 25 : carrier === 'EyeMed' ? 20 : 30, covered: true },
          'visual-field-testing': { copay: 15, covered: true },
          'dilation': { copay: 10, covered: true },
          'oct-glaucoma': { copay: 25, covered: true },
          'visual-field-extended': { copay: 15, covered: true }
        }

        const subtotal = services.reduce((total, serviceId) => {
          return total + (servicePrices[serviceId] || 0)
        }, 0)

        const insuranceApplied = services.reduce((total, serviceId) => {
          const coverage = insuranceCoverage[serviceId]
          if (coverage?.covered && coverage.copay) {
            const servicePrice = servicePrices[serviceId] || 0
            return total + (servicePrice - coverage.copay)
          }
          return total
        }, 0)

        const patientResponsibility = subtotal - insuranceApplied

        return {
          subtotal,
          insuranceApplied,
          patientResponsibility,
          services: services.map(serviceId => ({
            id: serviceId,
            price: servicePrices[serviceId] || 0,
            coverage: insuranceCoverage[serviceId]
          }))
        }
      }
    }),
    { name: 'quote-builder-store' }
  )
)

// Computed selectors for common use cases
export const useQuoteSelectors = () => {
  const store = useQuoteStore()
  
  return {
    // Layer navigation helpers
    canNavigateToLayer: (targetLayer: LayerId) => {
      const layers: LayerId[] = ['exam', 'eyeglasses', 'contacts']
      const currentIndex = layers.indexOf(store.currentLayer)
      const targetIndex = layers.indexOf(targetLayer)
      return targetIndex <= currentIndex + 1
    },
    
    // Pricing totals
    getTotalExamCost: () => {
      const { exam } = store.quote.pricing
      return exam.comprehensive + exam.contactFitting + exam.iwellness + exam.optomap
    },
    
    getTotalEyeglassesCost: () => {
      const { eyeglasses } = store.quote.pricing
      return eyeglasses.frame + eyeglasses.lenses + eyeglasses.enhancements
    },
    
    getTotalContactsCost: () => {
      const { contacts } = store.quote.pricing
      return contacts.product + contacts.fitting
    },
    
    getGrandTotal: () => {
      const { pricing } = store.quote
      return pricing.finalTotal
    },
    
    getPatientResponsibility: () => {
      const { pricing } = store.quote
      return pricing.patientResponsibility
    },
    
    // Validation helpers
    isExamLayerComplete: () => {
      const { exam } = store.quote
      // Must have at least one required service (comprehensive exam)
      return exam.selectedServices.includes('comprehensive-exam')
    },

    getExamLayerValidation: () => {
      const { exam } = store.quote
      const selectedServices = exam.selectedServices
      const errors: string[] = []
      const warnings: string[] = []

      // Required service validation
      if (!selectedServices.includes('comprehensive-exam')) {
        errors.push('Comprehensive eye examination is required')
      }

      // Logical service combinations
      if (selectedServices.includes('contact-lens-fitting') && !selectedServices.includes('comprehensive-exam')) {
        errors.push('Contact lens fitting requires a comprehensive eye examination')
      }

      if (selectedServices.includes('oct-glaucoma') && !selectedServices.includes('visual-field-testing')) {
        warnings.push('OCT glaucoma analysis is often paired with visual field testing for complete assessment')
      }

      // Duration warnings
      const serviceDurations: Record<string, number> = {
        'comprehensive-exam': 60,
        'contact-lens-fitting': 45,
        'retinal-imaging': 15,
        'visual-field-testing': 30,
        'oct-scan': 20,
        'dilation': 20,
        'retinal-photos': 10,
        'oct-macula': 15,
        'oct-glaucoma': 15,
        'visual-field-extended': 25,
        'corneal-topography': 10
      }

      const totalDuration = selectedServices.reduce((total, serviceId) => {
        return total + (serviceDurations[serviceId] || 0)
      }, 0)

      if (totalDuration > 120) {
        warnings.push(`Total appointment time (${totalDuration} min) may require scheduling in multiple sessions`)
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        totalDuration
      }
    },
    
    isEyeglassesLayerComplete: () => {
      const { eyeglasses } = store.quote
      return eyeglasses.frame !== null || eyeglasses.lenses.type !== ''
    },
    
    isContactsLayerComplete: () => {
      const { contacts } = store.quote
      return contacts.brand !== '' && contacts.type !== ''
    },
    
    // Auto-save status
    needsSaving: () => store.autoSave.isDirty,
    lastSavedTime: () => store.autoSave.lastSaved
  }
}