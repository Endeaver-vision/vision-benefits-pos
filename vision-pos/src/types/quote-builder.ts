import { LucideIcon } from 'lucide-react'

// Layer identification
export type LayerId = 'exam' | 'eyeglasses' | 'contacts'

// Layer status for navigation
export type LayerStatus = 'active' | 'completed' | 'available' | 'locked'

// Layer definition structure
export interface LayerDefinition {
  id: LayerId
  name: string
  icon: LucideIcon
  description: string
}

// Quote state interfaces
export interface PatientInfo {
  name: string
  phone: string
  email: string
  dateOfBirth?: string
  address?: {
    street: string
    city: string
    state: string
    zipCode: string
  }
}

export interface InsuranceInfo {
  carrier: 'VSP' | 'EyeMed' | 'Spectera' | ''
  planName: string
  memberId: string
  groupNumber?: string
  effectiveDate?: string
  copayExam?: number
  copayMaterials?: number
  allowanceFrame?: number
  allowanceLens?: number
  allowanceContact?: number
}

export interface ExamServices {
  selectedServices: string[] // Array of service IDs
  medicalDiagnosis?: string
  notes?: string
}

// Individual exam service definition
export interface ExamServiceDefinition {
  id: string
  name: string
  description: string
  basePrice: number
  duration: number // in minutes
  required: boolean
  category: 'primary' | 'diagnostic' | 'specialty'
  insuranceCovered: boolean
  copayAmount?: number
}

export interface FrameSelection {
  id?: string
  brand?: string
  model?: string
  color?: string
  price?: number
  category?: 'value' | 'designer' | 'premium'
  style?: 'full-rim' | 'semi-rimless' | 'rimless'
  material?: 'plastic' | 'metal' | 'titanium' | 'memory-metal'
  selectedColor?: string
  selectedSize?: string
  isPatientOwned?: boolean
  mountingFee?: number
}

export interface LensConfiguration {
  type: 'single-vision' | 'progressive' | 'bifocal' | 'computer' | ''
  material: 'plastic' | 'polycarbonate' | 'high-index' | 'trivex' | ''
  progressive?: {
    productId?: string
    tier?: number
    price?: number
  }
  arCoating?: {
    productId?: string
    tier?: number
    price?: number
  }
  enhancements?: {
    photochromic?: boolean
    polarized?: boolean
    blueLight?: boolean
    antiReflective?: boolean
    scratchResistant?: boolean
  }
  prescription?: {
    rightEye: {
      sphere?: number
      cylinder?: number
      axis?: number
      add?: number
    }
    leftEye: {
      sphere?: number
      cylinder?: number
      axis?: number
      add?: number
    }
  }
}

export interface EyeglassesSelection {
  frame: FrameSelection | null
  lenses: LensConfiguration
  enhancements: string[]
  secondPair?: {
    frame: FrameSelection | null
    lenses: LensConfiguration
    discount: number
  }
}

export interface ContactLensSelection {
  brand: string
  type: 'daily' | 'weekly' | 'monthly' | 'extended' | ''
  parameters: {
    rightEye?: {
      power?: number
      baseCurve?: number
      diameter?: number
    }
    leftEye?: {
      power?: number
      baseCurve?: number
      diameter?: number
    }
  }
  quantity?: number
  annualSupply?: boolean
  rebate?: {
    amount: number
    manufacturer: string
  }
}

export interface PricingBreakdown {
  exam: {
    comprehensive: number
    contactFitting: number
    iwellness: number
    optomap: number
    total: number
  }
  eyeglasses: {
    frame: number
    lenses: number
    enhancements: number
    total: number
  }
  contacts: {
    product: number
    fitting: number
    total: number
  }
  subtotal: number
  insurance: {
    examCoverage: number
    frameCoverage: number
    lensCoverage: number
    contactCoverage: number
    totalCoverage: number
  }
  secondPairDiscount: number
  finalTotal: number
  patientResponsibility: number
}

export interface QuoteData {
  id?: string
  status: 'building' | 'draft' | 'presented' | 'signed' | 'completed' | 'cancelled' | 'expired'
  createdAt?: Date
  updatedAt?: Date
  expiresAt?: Date
  patient: PatientInfo
  insurance: InsuranceInfo
  exam: ExamServices
  eyeglasses: EyeglassesSelection
  contacts: ContactLensSelection
  pricing: PricingBreakdown
  notes?: string
  location?: string
  staffMember?: string
}

// Auto-save configuration
export interface AutoSaveConfig {
  enabled: boolean
  intervalMs: number
  lastSaved: Date | null
  isDirty: boolean
}

// Quote builder store interface
export interface QuoteBuilderStore {
  // Current state
  currentLayer: LayerId
  completedLayers: Set<LayerId>
  quote: QuoteData
  autoSave: AutoSaveConfig
  
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
  saveQuote: () => Promise<void>
  loadQuote: (id: string) => Promise<void>
  resetQuote: () => void
  setAutoSaveEnabled: (enabled: boolean) => void
}