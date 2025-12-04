// Carrier & Document Type Detection
// Migrated from insurance-doc-scanner for Phase 1 integration
// Note: The full adaptive extraction system with versioned prompts can be added in Phase 2

import type { CarrierType, DocumentType } from '@/types/insurance-document'

/**
 * Detect insurance carrier from OCR text and filename
 */
export function detectCarrier(ocrText: string, fileName?: string): CarrierType {
  // Check filename first (higher priority)
  if (fileName) {
    const lower = fileName.toLowerCase()
    if (lower.includes('vsp')) return 'VSP'
    if (lower.includes('eyemed')) return 'EyeMed'
    if (lower.includes('spectera')) return 'Spectera'
  }

  // Check OCR text with word boundaries
  if (/\bVSP\b/i.test(ocrText)) return 'VSP'
  if (/\bEyeMed\b/i.test(ocrText)) return 'EyeMed'
  if (/\bSpectera\b/i.test(ocrText)) return 'Spectera'

  // Additional patterns for carrier detection
  if (/vision\s+service\s+plan/i.test(ocrText)) return 'VSP'
  if (/eyemed\s+vision\s+care/i.test(ocrText)) return 'EyeMed'
  if (/spectera\s+eyecare/i.test(ocrText)) return 'Spectera'

  return null
}

/**
 * Detect document type from OCR text and filename
 */
export function detectDocumentType(
  ocrText: string,
  fileName?: string
): DocumentType {
  // Check filename first
  if (fileName) {
    const lower = fileName.toLowerCase()
    if (lower.includes('lens') || lower.includes('enhancement')) return 'lens'
    if (lower.includes('auth')) return 'auth'
    if (lower.includes('benefit')) return 'benefits'
  }

  // Check OCR text patterns
  if (/lens\s+enhancement/i.test(ocrText)) return 'lens'
  if (/lens\s+options/i.test(ocrText)) return 'lens'
  if (/progressive.*copay/i.test(ocrText)) return 'lens'

  if (/authorization|patient\s+record/i.test(ocrText)) return 'auth'
  if (/auth\s*#|auth\s+number/i.test(ocrText)) return 'auth'
  if (/effective\s+date.*expiration/i.test(ocrText)) return 'auth'

  if (/benefit\s+summary/i.test(ocrText)) return 'benefits'
  if (/plan\s+benefits/i.test(ocrText)) return 'benefits'

  return 'unknown'
}

/**
 * Count null fields in extracted data
 */
export function countNullFields(data: unknown): number {
  let count = 0

  function traverse(obj: unknown) {
    if (!obj || typeof obj !== 'object') return

    for (const value of Object.values(obj)) {
      if (value === null) {
        count++
      } else if (
        typeof value === 'object' &&
        value !== null &&
        'value' in value
      ) {
        if ((value as { value: unknown }).value === null) count++
      } else if (typeof value === 'object') {
        traverse(value)
      }
    }
  }

  traverse(data)
  return count
}

/**
 * Count low confidence fields in extracted data
 */
export function countLowConfidenceFields(
  data: unknown,
  threshold: number = 0.7
): number {
  let count = 0

  function traverse(obj: unknown) {
    if (!obj || typeof obj !== 'object') return

    for (const value of Object.values(obj)) {
      if (
        typeof value === 'object' &&
        value !== null &&
        'confidence' in value
      ) {
        if ((value as { confidence: number }).confidence < threshold) count++
      } else if (typeof value === 'object') {
        traverse(value)
      }
    }
  }

  traverse(data)
  return count
}

/**
 * Get carrier-specific extraction hints
 */
export function getCarrierHints(carrier: CarrierType): string {
  switch (carrier) {
    case 'VSP':
      return `
VSP-specific hints:
- Auth numbers often start with letters followed by numbers
- Look for "WellVision Exam" eligibility
- Frame allowances may show Altair/Marchon vs non-Altair
- Progressive tiers use codes like K, J, F, O, N
`
    case 'EyeMed':
      return `
EyeMed-specific hints:
- Progressive tiers are labeled tier_1 through tier_5
- Look for "Materials Copay" vs "Exam Copay"
- Frame allowances may have separate in-network/out-of-network
`
    case 'Spectera':
      return `
Spectera-specific hints:
- Progressive tiers use Roman numerals I through V
- Look for "Spectera Eyecare Networks"
- May have specific lab requirements
`
    default:
      return ''
  }
}
