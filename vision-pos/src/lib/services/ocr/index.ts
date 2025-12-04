// OCR Services - Export all components
// Uses Google Cloud Vision for OCR (cheap) + GPT for text parsing

// Core OCR processing (Google Vision OCR + GPT parsing)
export {
  processDocument,
  processDocumentFromBase64,
  processDocumentWithVision
} from './ocr-service'

// GPT text extraction utilities
export {
  parseInsuranceDocument,
  calculateOverallConfidence,
  getConfidenceLevel,
} from './gpt-extraction'

// Carrier detection utilities
export {
  detectCarrier,
  detectDocumentType,
  countNullFields,
  countLowConfidenceFields,
  getCarrierHints,
} from './carrier-detection'

// Main orchestrator
export {
  processInsuranceDocument,
  verifyInsuranceDocument,
  getCustomerDocuments,
  getPendingDocuments,
} from './insurance-parser'
