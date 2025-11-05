/**
 * Comprehensive Customer Type Definitions
 * Week 4 - Customer API Foundation
 */

// Core customer interface
export interface Customer {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  dateOfBirth?: Date
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY'
  
  // Account information
  customerNumber?: string
  accountStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  registrationDate: Date
  lastVisit?: Date
  
  // Legacy compatibility fields (for migration period)
  address?: string
  city?: string
  state?: string
  zipCode?: string
  insuranceCarrier?: string
  memberId?: string
  groupNumber?: string
  eligibilityDate?: Date
  active?: boolean
  
  // Analytics fields
  totalSpent?: number
  averageOrderValue?: number
  customerLifetimeValue?: number
  lastPurchaseDate?: Date
  isHighValueCustomer?: boolean
  isFrequentCustomer?: boolean
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH'
  
  // Address information
  addresses?: CustomerAddress[]
  primaryAddressId?: string
  
  // Insurance information
  insuranceInfo?: CustomerInsurance[]
  primaryInsuranceId?: string
  
  // Preferences and settings
  preferences?: CustomerPreferences
  
  // Family/relationship connections
  relationships?: CustomerRelationship[]
  
  // Purchase and visit history
  purchaseHistory?: CustomerPurchaseHistory[]
  visitHistory?: CustomerVisit[]
  
  // Eye care specific
  prescriptions?: EyePrescription[]
  eyewearPreferences?: EyewearPreferences
  
  // Marketing and communication
  communicationPreferences?: CommunicationPreferences
  marketingConsent?: boolean
  
  // System fields
  notes?: string
  tags?: CustomerTag[]
  createdAt: Date
  updatedAt: Date
  createdBy?: string
  updatedBy?: string
  
  // Computed fields
  _count?: {
    transactions: number
    visits: number
    prescriptions: number
    quotes: number
  }
}

// Address information
export interface CustomerAddress {
  id: string
  customerId: string
  type: 'HOME' | 'WORK' | 'BILLING' | 'SHIPPING' | 'OTHER'
  street: string
  street2?: string
  city: string
  state: string
  zipCode: string
  country: string
  isPrimary: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Insurance information
export interface CustomerInsurance {
  id: string
  customerId: string
  carrier: string
  planName?: string
  planType: 'VISION' | 'MEDICAL' | 'BOTH'
  memberId: string
  groupNumber?: string
  effectiveDate: Date
  expirationDate?: Date
  copayAmount?: number
  deductible?: number
  coverageDetails: InsuranceCoverage
  isPrimary: boolean
  isActive: boolean
  
  // Dependent information for family plans
  subscriberName?: string
  relationshipToSubscriber?: 'SELF' | 'SPOUSE' | 'CHILD' | 'DEPENDENT' | 'OTHER'
  
  createdAt: Date
  updatedAt: Date
}

// Insurance coverage details
export interface InsuranceCoverage {
  examCoverage: boolean
  examCopay?: number
  examFrequency?: number // months between covered exams
  frameAllowance?: number
  frameCoverageFrequency?: number // months between covered frames
  lensAllowance?: number
  lensCoverageFrequency?: number
  contactAllowance?: number
  contactCoverageFrequency?: number
  specialtyCoverage: {
    progressiveLenses: boolean
    antiReflectiveCoating: boolean
    transitions: boolean
    contactLenses: boolean
    safetyGlasses: boolean
  }
}

// Customer preferences
export interface CustomerPreferences {
  preferredContactMethod: 'EMAIL' | 'PHONE' | 'SMS' | 'MAIL'
  appointmentReminders: boolean
  promotionalEmails: boolean
  language: string
  timezone: string
  
  // Shopping preferences
  preferredBrands: string[]
  budgetRange: {
    min?: number
    max?: number
  }
  
  // Accessibility needs
  largeFont: boolean
  audioAssistance: boolean
  wheelchairAccessible: boolean
  
  // Visit preferences
  preferredProviders: string[]
  preferredAppointmentTimes: string[]
  specialInstructions?: string
}

// Customer relationships (family connections)
export interface CustomerRelationship {
  id: string
  primaryCustomerId: string
  relatedCustomerId: string
  relationshipType: 'SPOUSE' | 'CHILD' | 'PARENT' | 'SIBLING' | 'GUARDIAN' | 'DEPENDENT' | 'OTHER'
  isActive: boolean
  notes?: string
  createdAt: Date
  
  // Related customer info for easy access
  relatedCustomer?: Pick<Customer, 'id' | 'firstName' | 'lastName' | 'email' | 'phone'>
}

// Purchase history
export interface CustomerPurchaseHistory {
  id: string
  customerId: string
  transactionId: string
  orderDate: Date
  totalAmount: number
  items: PurchaseItem[]
  paymentMethod: string
  
  // Eye care specific
  prescriptionUsed?: string
  providerId?: string
  
  createdAt: Date
}

export interface PurchaseItem {
  id: string
  productId: string
  productName: string
  category: 'FRAMES' | 'LENSES' | 'CONTACTS' | 'ACCESSORIES' | 'EXAM' | 'OTHER'
  quantity: number
  unitPrice: number
  totalPrice: number
  brand?: string
  model?: string
}

// Visit history
export interface CustomerVisit {
  id: string
  customerId: string
  visitDate: Date
  visitType: 'EXAM' | 'FITTING' | 'PICKUP' | 'ADJUSTMENT' | 'CONSULTATION' | 'FOLLOW_UP'
  providerId?: string
  providerName?: string
  duration?: number // minutes
  notes?: string
  outcome?: string
  nextAppointmentRecommended?: boolean
  createdAt: Date
}

// Eye prescriptions
export interface EyePrescription {
  id: string
  customerId: string
  prescriptionDate: Date
  providerId?: string
  providerName?: string
  
  // Prescription details
  rightEye: EyeMeasurement
  leftEye: EyeMeasurement
  
  // Additional measurements
  pupillaryDistance?: number
  bifocalHeight?: number
  
  // Prescription type and notes
  prescriptionType: 'DISTANCE' | 'READING' | 'BIFOCAL' | 'PROGRESSIVE' | 'COMPUTER'
  notes?: string
  
  // Validity and status
  expirationDate?: Date
  isActive: boolean
  
  createdAt: Date
  updatedAt: Date
}

export interface EyeMeasurement {
  sphere?: number
  cylinder?: number
  axis?: number
  add?: number // for bifocals/progressives
  prism?: number
  base?: 'UP' | 'DOWN' | 'IN' | 'OUT'
}

// Eyewear preferences
export interface EyewearPreferences {
  frameStyles: string[] // 'RECTANGULAR', 'ROUND', 'AVIATOR', etc.
  frameMaterials: string[] // 'METAL', 'PLASTIC', 'TITANIUM', etc.
  frameColors: string[]
  lensTypes: string[] // 'SINGLE_VISION', 'BIFOCAL', 'PROGRESSIVE', etc.
  lensCoatings: string[] // 'ANTI_REFLECTIVE', 'SCRATCH_RESISTANT', etc.
  contactLensBrands: string[]
  contactLensTypes: string[] // 'DAILY', 'WEEKLY', 'MONTHLY', etc.
  
  // Budget preferences
  framesBudget?: number
  contactsBudget?: number
  
  // Special needs
  safetyRequirements: boolean
  computerGlasses: boolean
  sportsEyewear: boolean
  fashionPriority: 'HIGH' | 'MEDIUM' | 'LOW'
  comfortPriority: 'HIGH' | 'MEDIUM' | 'LOW'
}

// Communication preferences
export interface CommunicationPreferences {
  emailNotifications: {
    appointments: boolean
    promotions: boolean
    reminders: boolean
    newsletters: boolean
  }
  smsNotifications: {
    appointments: boolean
    pickupReady: boolean
    promotions: boolean
  }
  phoneNotifications: {
    appointments: boolean
    followUp: boolean
    emergencyContact: boolean
  }
  mailingPreferences: {
    statements: boolean
    promotions: boolean
    catalogs: boolean
  }
}

// Customer tags for categorization
export interface CustomerTag {
  id: string
  name: string
  color?: string
  category?: 'PREFERENCE' | 'MEDICAL' | 'BUSINESS' | 'BEHAVIOR' | 'OTHER'
}

// API request/response types
export interface CreateCustomerRequest {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  dateOfBirth?: string
  gender?: Customer['gender']
  address?: Omit<CustomerAddress, 'id' | 'customerId' | 'createdAt' | 'updatedAt'>
  insurance?: Omit<CustomerInsurance, 'id' | 'customerId' | 'createdAt' | 'updatedAt'>
  preferences?: Partial<CustomerPreferences>
  notes?: string
}

export interface UpdateCustomerRequest {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  dateOfBirth?: string
  gender?: Customer['gender']
  accountStatus?: Customer['accountStatus']
  preferences?: Partial<CustomerPreferences>
  notes?: string
}

export interface CustomerSearchFilters {
  search?: string // Name, email, phone, member ID
  insuranceCarrier?: string
  accountStatus?: Customer['accountStatus']
  city?: string
  state?: string
  zipCode?: string
  hasVisitedSince?: string // Date string
  hasPurchasedSince?: string // Date string
  isHighValue?: boolean // High value customer filter
  hasRecentVisit?: boolean // Recent visit filter
  tags?: string[]
  ageRange?: {
    min?: number
    max?: number
  }
  genderFilter?: Customer['gender']
  sortBy?: 'name' | 'lastVisit' | 'totalSpent' | 'registrationDate'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface CustomerSearchResponse {
  customers: Customer[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

// Customer analytics interfaces
export interface CustomerAnalytics {
  totalCustomers: number
  newCustomersThisMonth: number
  activeCustomers: number
  retentionRate: number
  averageCustomerLifetimeValue: number
  topSpendingCustomers: Customer[]
  customersByInsurance: { [carrier: string]: number }
  customersByLocation: { [location: string]: number }
  customerAgeDistribution: { [ageGroup: string]: number }
}

export default Customer