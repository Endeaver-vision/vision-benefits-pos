// OCR Services - Export all components

// TWO-PROMPT EXTRACTION SYSTEM (Recommended approach)
// Prompt 1: Raw extraction without interpretation
export {
  extractRawDocument,
  type RawExtractionResult,
  type RawBenefit,
  type RawMemberInfo,
  type RawDocumentStructure,
} from './prompt-1-raw-extraction'

// Prompt 2: Normalization using rosetta stones and business rules
export {
  normalizeBenefits,
  type NormalizedExtractionResult,
  type NormalizedBenefit,
  type MappingResult,
  type ValidationWarning,
} from './prompt-2-normalization'

// LEGACY: Haiku vision extraction (use two-prompt system instead)
export {
  readDocumentWithHaiku,
  assignToCatalog,
  extractInsuranceDocument,
  processDocumentWithHaiku,
} from './haiku-extraction'

// Carrier detection utilities
export {
  detectCarrier,
  detectDocumentType,
  countNullFields,
  countLowConfidenceFields,
  getCarrierHints,
} from './carrier-detection'
