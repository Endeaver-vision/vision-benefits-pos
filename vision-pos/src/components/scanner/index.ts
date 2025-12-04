// Legacy exports (may be deprecated)
export { DocumentUploader } from './DocumentUploader';
export type { DocumentType } from './DocumentUploader';

export { CardPreview, CardPreviewCompact } from './CardPreview';

export { ExtractionReview } from './ExtractionReview';
export type { ExtractedInsuranceData } from './ExtractionReview';

export { InsuranceScannerModal } from './InsuranceScannerModal';

// New scanner components (Phase 3)
export { DocumentUpload } from './document-upload';
export { ProcessingStatus } from './processing-status';
export { ExtractedDataView } from './extracted-data-view';
export { CustomerSelector } from './customer-selector';

// Inline scanner for embedding (Phase 4)
export { InlineScanner } from './inline-scanner';

// Multi-document upload (Phase 5 - VSP auth + lens enhancement)
export { MultiDocumentUpload } from './multi-document-upload';
export type { DocumentSlot } from './multi-document-upload';
