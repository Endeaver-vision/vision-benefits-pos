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
  // Schema version for backwards compatibility
  schemaVersion?: string

  // VSP two-document pairing metadata
  // vsp-auth: Patient Record Report (contains patient info, copays, frame allowances)
  // vsp-lens: Lens Enhancement Charges (contains two-letter code table with copays)
  // vsp-combined: Both documents merged into one (rare)
  vspDocumentType?: 'vsp-auth' | 'vsp-lens' | 'vsp-combined' | null

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
    // New fields from schema
    gender?: FieldWithConfidence<string | null>
    memberAddress?: FieldWithConfidence<string | null>
    responsibleMember?: FieldWithConfidence<string | null>
  }

  // Provider information (new section)
  provider?: {
    providerName: FieldWithConfidence<string | null>
    providerNpi: FieldWithConfidence<string | null>
    locationAddress: FieldWithConfidence<string | null>
    dateOfService: FieldWithConfidence<string | null>
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
    clFit?: FieldWithConfidence<string | null>
    // Eligibility dates (new)
    examEligibleDate?: FieldWithConfidence<string | null>
    lensEligibleDate?: FieldWithConfidence<string | null>
    frameEligibleDate?: FieldWithConfidence<string | null>
    contactsEligibleDate?: FieldWithConfidence<string | null>
    clFitEligibleDate?: FieldWithConfidence<string | null>
    frequency: {
      examFrequency: FieldWithConfidence<string | null>
      lensFrequency: FieldWithConfidence<string | null>
      frameFrequency: FieldWithConfidence<string | null>
      contactsFrequency: FieldWithConfidence<string | null>
      clFitFrequency?: FieldWithConfidence<string | null>
    }
    // Restrictions
    restrictions?: {
      contactsOrGlasses?: FieldWithConfidence<boolean | null>  // Plan allows EITHER contacts OR glasses
      additionalGlassesAllowance?: FieldWithConfidence<boolean | null>
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
      // VSP frame allowances
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
      // VSP EasyOptions upgraded allowances
      marchonUpgradedAllowance?: FieldWithConfidence<number | null>
      standardUpgradedAllowance?: FieldWithConfidence<number | null>
      // Generic frame allowance for EyeMed/Spectera
      frameAllowance?: FieldWithConfidence<number | null>
      frameOveragePercent?: FieldWithConfidence<number | null>
      // EyeMed wholesale/retail range
      wholesaleAllowance?: FieldWithConfidence<number | null>
      retailMinAllowance?: FieldWithConfidence<number | null>
      retailMaxAllowance?: FieldWithConfidence<number | null>
    }
  }

  // VSP EasyOptions (new section)
  easyOptions?: {
    enabled: FieldWithConfidence<boolean | null>
    clUpgrade: FieldWithConfidence<number | null>
    frameUpgrade: FieldWithConfidence<number | null>
    arCovered: FieldWithConfidence<boolean | null>
    photoCovered: FieldWithConfidence<boolean | null>
    progCovered: FieldWithConfidence<boolean | null>
  }

  // EyeMed declining balance (new section)
  // This can be EITHER contact-lens-only OR unified (all materials)
  decliningBalance?: {
    // Contact lens specific (legacy)
    clStarting: FieldWithConfidence<number | null>
    clRemaining: FieldWithConfidence<number | null>
    // Unified declining balance (covers frames, lenses, lens options, AND contacts)
    isUnified?: FieldWithConfidence<boolean | null>
    totalAllowance?: FieldWithConfidence<number | null>
    appliesTo?: FieldWithConfidence<string[] | null>  // ['frame', 'lens', 'lensOptions', 'contacts']
    overageDiscounts?: {
      frameLensPackage?: FieldWithConfidence<number | null>  // e.g., 20 for 20% off
      contactsConventional?: FieldWithConfidence<number | null>  // e.g., 15 for 15% off
      contactsDisposable?: FieldWithConfidence<number | null>  // e.g., 0 for no discount
    }
    eitherOrRestriction?: FieldWithConfidence<boolean | null>  // contacts OR glasses, not both
  }
  contacts: {
    clExamDiscount: FieldWithConfidence<string | null>
    clExamAndMaterialsAllowance: FieldWithConfidence<number | null>
    clExamOnlyPatientPaysOver: FieldWithConfidence<number | null>
    contactsInsteadOfGlasses: FieldWithConfidence<boolean | null>
    nextFrameAvailableDate: FieldWithConfidence<string | null>
    // VSP-specific
    clExamCopay?: FieldWithConfidence<number | string | null>
    clAllowanceUpgraded?: FieldWithConfidence<number | null>
    // Spectera-specific contact lens fields
    selectionContactLensesFit?: FieldWithConfidence<string | null>
    nonSelectionContactLensesFit?: FieldWithConfidence<string | null>
    selectionDailyBiweekly?: FieldWithConfidence<string | null>
    selectionMonthly?: FieldWithConfidence<string | null>
    // EyeMed contact lens cost structure
    conventionalCost?: FieldWithConfidence<string | null>
    disposableCost?: FieldWithConfidence<string | null>
    clOveragePercentage?: FieldWithConfidence<number | null>
    necessaryCl: {
      necessaryClCopay: FieldWithConfidence<number | null>
    }
  }

  // Contact lens fitting (new section)
  clFit?: {
    standardCost: FieldWithConfidence<string | number | null>
    premiumCost: FieldWithConfidence<string | number | null>
  }
  valueAdded: {
    additionalPairDiscount: FieldWithConfidence<number | null>
    additionalPairTimeframe?: FieldWithConfidence<string | null>
    clExam12MonthsDiscount: FieldWithConfidence<number | null>
    clReorderDiscount?: FieldWithConfidence<number | null>
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

  // Family members on same plan (new section)
  familyMembers?: Array<{
    name: string
    memberId: string
    dateOfBirth: string | null
    relationship?: string
    groupId?: string
  }>

  // VSP detailed lens enhancement charges (new - more granular than vspLensEnhancements)
  vspLensCharges?: {
    // Aspheric lenses
    aspheric?: {
      plasticSv: FieldWithConfidence<number | null>
      plasticMulti: FieldWithConfidence<number | null>
      digitalSv: FieldWithConfidence<number | null>
      digitalMulti: FieldWithConfidence<number | null>
    }
    // Oversize
    oversize?: {
      plasticSv: FieldWithConfidence<number | null>
      plasticMulti: FieldWithConfidence<number | null>
      glassSv: FieldWithConfidence<number | null>
      glassMulti: FieldWithConfidence<number | null>
    }
    // Progressives by code
    progressives?: {
      standardK?: { plastic: number | null; glass: number | null }
      premiumF?: { plastic: number | null; glass: number | null }
      premiumJ?: { plastic: number | null; glass: number | null }
      customN?: number | null
      customO?: number | null
      customMeasurementAddon?: number | null
    }
    // Polycarbonate
    polycarbonate?: {
      baseSv: FieldWithConfidence<number | null>
      baseMulti: FieldWithConfidence<number | null>
      digitalAddon: FieldWithConfidence<number | null>
      polarizedAddon: FieldWithConfidence<number | null>
      progressiveAddon: FieldWithConfidence<number | null>
    }
    // High index
    highIndex?: {
      trivex160Sv: FieldWithConfidence<number | null>
      trivex160Multi: FieldWithConfidence<number | null>
      hi166Sv: FieldWithConfidence<number | null>
      hi166Multi: FieldWithConfidence<number | null>
      hi170Sv: FieldWithConfidence<number | null>
      hi170Multi: FieldWithConfidence<number | null>
    }
    // Photochromic
    photochromic?: {
      glassSv: FieldWithConfidence<number | null>
      glassMulti: FieldWithConfidence<number | null>
      plasticSv: FieldWithConfidence<number | null>
      plasticMulti: FieldWithConfidence<number | null>
    }
    // Polarized
    polarized?: {
      plasticSv: FieldWithConfidence<number | null>
      plasticMulti: FieldWithConfidence<number | null>
      glassSv: FieldWithConfidence<number | null>
      glassMulti: FieldWithConfidence<number | null>
      progressiveAddon: FieldWithConfidence<number | null>
    }
    // UV
    uv?: {
      backside: FieldWithConfidence<number | null>
      standard: FieldWithConfidence<number | null>
    }
    // Tints
    tints?: {
      plasticSolid: FieldWithConfidence<number | null>
      glassSv: FieldWithConfidence<number | null>
      glassMulti: FieldWithConfidence<number | null>
      gradient: FieldWithConfidence<number | null>
    }
    // Coatings
    coatings?: {
      scratchA: FieldWithConfidence<number | null>
      scratchB: FieldWithConfidence<number | null>
      arA: FieldWithConfidence<number | null>
      arC: FieldWithConfidence<number | null>
      arD: FieldWithConfidence<number | null>
    }
    // Misc
    misc?: {
      edgePolish: FieldWithConfidence<number | null>
      edgeCoating: FieldWithConfidence<number | null>
      facets: FieldWithConfidence<number | null>
      rimlessDrill: FieldWithConfidence<number | null>
      nearVariableFocus: FieldWithConfidence<number | null>
      lightFilter: FieldWithConfidence<number | null>
      blendedBifocal: FieldWithConfidence<number | null>
    }
    confidence: number
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
// VSP-specific document types for two-document pairing
export type VSPDocumentType = 'vsp-auth' | 'vsp-lens' | 'vsp-combined' | null

export interface CarrierDetectionResult {
  carrier: CarrierType
  confidence: number
  documentType: DocumentType
}

// VSP Document Pairing - used for tracking paired documents
export interface VSPDocumentPairing {
  authNumber: string          // The Auth# that links both documents
  vspDocumentType: VSPDocumentType
  isPendingPair: boolean      // Waiting for second document
  pairedDocumentId?: string   // ID of the paired document (once merged)
}
