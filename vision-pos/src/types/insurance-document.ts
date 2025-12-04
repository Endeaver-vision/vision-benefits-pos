export interface InsuranceDocument {
  id: string
  customerId: string
  caseId?: string
  fileName: string
  fileType: string
  filePath: string
  fileSize: number
  uploadedBy: string

  rawOcrText?: string
  ocrProcessedAt?: Date
  ocrStatus: 'pending' | 'processing' | 'completed' | 'failed'
  ocrError?: string

  gptProcessedAt?: Date
  gptStatus: 'pending' | 'processing' | 'completed' | 'failed'
  gptError?: string
  confidenceScore?: number
  extractedData?: ExtractedInsuranceData
  case?: {
    id: string
    mergedData?: ExtractedInsuranceData
    mergedAt?: Date
    documents?: {
      id: string
      fileName: string
    }[]
  }

  verifiedBy?: string
  verifiedAt?: Date
  isVerified: boolean
  verificationNotes?: string
  verifier?: {
    id: string
    email: string
    firstName?: string
    lastName?: string
    name?: string
  } | null

  customer?: Customer | null

  createdAt: Date
  updatedAt: Date
}

export interface ExtractedInsuranceData {
  patient: {
    patientName: FieldWithConfidence<string>
    memberName: FieldWithConfidence<string>
    memberId?: FieldWithConfidence<string>
    authNumber: FieldWithConfidence<string>
    subscriberId?: FieldWithConfidence<string>
    relationship: FieldWithConfidence<string>
    patientBirthDate: FieldWithConfidence<string | null>
    authEffectiveDate: FieldWithConfidence<string | null>
    authExpirationDate: FieldWithConfidence<string | null>
  }
  conditions: {
    systemic: {
      highRiskForPrediabetes: FieldWithConfidence<boolean | null>
      diabetes: FieldWithConfidence<boolean | null>
      hypertension: FieldWithConfidence<boolean | null>
      highCholesterol: FieldWithConfidence<boolean | null>
    }
    ocular: {
      diabeticRetinopathy: FieldWithConfidence<boolean | null>
      glaucoma: FieldWithConfidence<boolean | null>
      amd: FieldWithConfidence<boolean | null>
      noneOfThese: FieldWithConfidence<boolean | null>
    }
    clinicalActions: {
      dilationPerformed: FieldWithConfidence<boolean | null>
      pcpCommunicationCompletedPlanned: FieldWithConfidence<boolean | null>
    }
    patientHistory: {
      lastWellvisionExamDate: FieldWithConfidence<string | null>
      dilationIndicated: FieldWithConfidence<string | null>
      pcpCommunicationIndicated: FieldWithConfidence<string | null>
      reportedConditions: FieldWithConfidence<string | null>
      diagnosisCodes: FieldWithConfidence<string[] | null>
    }
  }
  eligibility: {
    examProfServices: FieldWithConfidence<string | null>
    lens: FieldWithConfidence<string | null>
    frame: FieldWithConfidence<string | null>
    contacts: FieldWithConfidence<string | null>
    frequency: {
      examFrequency: FieldWithConfidence<string | null>
      lensFrequency: FieldWithConfidence<string | null>
      frameFrequency: FieldWithConfidence<string | null>
      contactsFrequency: FieldWithConfidence<string | null>
    }
  }
  plan: {
    carrier: FieldWithConfidence<string | null>
    benefitPlanName: FieldWithConfidence<string | null>
    groupName?: FieldWithConfidence<string | null>
    groupNumber?: FieldWithConfidence<string | null>
    network?: FieldWithConfidence<string | null>
    benefitLevel?: FieldWithConfidence<string | null>
    clientName: FieldWithConfidence<string | null>
    networkLabRequirement: FieldWithConfidence<string | null>
    essentialMedicalEyeCareExamCopay: FieldWithConfidence<number | null>
  }
  copays: {
    examCopay: FieldWithConfidence<number | null>
    materialsCopay: FieldWithConfidence<number | null>
    routineRetinalScreening: FieldWithConfidence<string | null>

    // Single Vision lens copay
    singleVisionCopay: FieldWithConfidence<number | null>
    bifocalCopay?: FieldWithConfidence<number | null>
    trifocalCopay?: FieldWithConfidence<number | null>

    // Progressive lens copays by tier
    // EyeMed uses tier_1 through tier_5
    // Spectera uses I through V
    // VSP uses code-based (handled separately)
    progressiveCopays: {
      standard: FieldWithConfidence<number | null>      // Basic/standard progressive
      tier1: FieldWithConfidence<number | null>         // Premium tier 1
      tier2: FieldWithConfidence<number | null>         // Premium tier 2
      tier3: FieldWithConfidence<number | null>         // Premium tier 3
      tier4: FieldWithConfidence<number | null>         // Premium tier 4
      tier5: FieldWithConfidence<number | null>         // Premium tier 5
    }

    // AR coating copays by tier
    arCopays: {
      standard: FieldWithConfidence<number | null>      // Basic AR
      tier1: FieldWithConfidence<number | null>         // Premium tier 1
      tier2: FieldWithConfidence<number | null>         // Premium tier 2
      tier3: FieldWithConfidence<number | null>         // Premium tier 3
      tier4?: FieldWithConfidence<number | null>        // Premium tier 4 (Spectera)
    }

    // Material copays
    materialCopays: {
      polycarbonate: FieldWithConfidence<number | 'covered' | null>
      polycarbonateChild: FieldWithConfidence<number | 'covered' | null>
      trivex: FieldWithConfidence<number | null>
      midIndex?: FieldWithConfidence<number | null>
      highIndex166?: FieldWithConfidence<number | null>
      highIndex167: FieldWithConfidence<number | null>
      highIndex174: FieldWithConfidence<number | null>
    }

    // Enhancement copays
    enhancementCopays: {
      photochromic: FieldWithConfidence<number | null>
      polarized: FieldWithConfidence<number | null>
      blueLightFilter: FieldWithConfidence<number | null>
      tint: FieldWithConfidence<number | null>
      uvCoating: FieldWithConfidence<number | null>
      scratchCoating: FieldWithConfidence<number | 'covered' | null>
      edgePolish?: FieldWithConfidence<number | null>
    }
  }
  // VSP-specific lens enhancement codes extracted from Lens Enhancement Charges document
  vspLensEnhancements?: {
    codes: Array<{
      code: string          // Two-letter code (KA, FA, QT, AD, etc.)
      description: string   // Description text
      copaySingleVision: number | null
      copayMultifocal: number | null
    }>
    confidence: number
  }
  frame: {
    promotions: {
      extraFramePromotion: FieldWithConfidence<number | null>
    }
    allowances: {
      altairMarchonFrameAllowance: {
        allowance: number | null
        overageDiscount: number | null
        confidence: number
      }
      nonAltairMarchonFrameAllowance: {
        allowance: number | null
        overageDiscount: number | null
        confidence: number
      }
      // Generic frame allowance for EyeMed/Spectera
      frameAllowance?: FieldWithConfidence<number | null>
      frameOveragePercent?: FieldWithConfidence<number | null>
    }
  }
  contacts: {
    clExamDiscount: FieldWithConfidence<string | null>
    clExamAndMaterialsAllowance: FieldWithConfidence<number | null>
    clExamOnlyPatientPaysOver: FieldWithConfidence<number | null>
    contactsInsteadOfGlasses: FieldWithConfidence<boolean | null>
    nextFrameAvailableDate: FieldWithConfidence<string | null>
    // Spectera-specific contact lens fields
    selectionContactLensesFit?: FieldWithConfidence<string | null>
    nonSelectionContactLensesFit?: FieldWithConfidence<string | null>
    selectionDailyBiweekly?: FieldWithConfidence<string | null>
    selectionMonthly?: FieldWithConfidence<string | null>
    necessaryCl: {
      necessaryClCopay: FieldWithConfidence<number | null>
    }
  }
  valueAdded: {
    additionalPairDiscount: FieldWithConfidence<number | null>
    clExam12MonthsDiscount: FieldWithConfidence<number | null>
  }
  enhancements: {
    covered: FieldWithConfidence<string[] | null>
    coveredWithAdditionalCopay: FieldWithConfidence<string[] | null>
    coveredWithAdditionalCopayOr80Uc: FieldWithConfidence<string[] | null>
  }
  disclaimers: {
    phiConfidentialDisclaimer: FieldWithConfidence<string | null>
    coverageDisclaimer: FieldWithConfidence<string | null>
  }
  overallConfidence: number
  notes: string
}

export interface FieldWithConfidence<T> {
  value: T
  confidence: number
}

export interface Customer {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  dateOfBirth?: Date
  insuranceCarrier?: string
  planName?: string
  memberId?: string
  groupNumber?: string
  createdAt: Date
  updatedAt: Date
}

export interface UploadDocumentRequest {
  customerId: string
  file: File | string // File object or base64
}

export interface UploadDocumentResponse {
  success: boolean
  documentId?: string
  status?: string
  error?: string
}

export interface ProcessOCRResponse {
  success: boolean
  ocrText?: string
  status?: string
  error?: string
}

export interface ParseGPTResponse {
  success: boolean
  data?: ExtractedInsuranceData
  confidenceBreakdown?: Record<string, number>
  error?: string
}

export interface VerifyDocumentRequest {
  verifiedBy: string
  corrections?: Partial<InsuranceDocument>
  notes?: string
}

// OCR Result type for the processing pipeline
export interface OCRResult {
  success: boolean
  text: string
  method: 'google-vision' | 'pdf-parse' | 'openai-vision'
  pageCount?: number
  error?: string
}

// Carrier detection result
export type CarrierType = 'VSP' | 'EyeMed' | 'Spectera' | null
export type DocumentType = 'auth' | 'lens' | 'benefits' | 'unknown'

export interface CarrierDetectionResult {
  carrier: CarrierType
  confidence: number
  documentType: DocumentType
}
