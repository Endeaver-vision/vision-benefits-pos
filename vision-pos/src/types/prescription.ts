// Prescription and Order Management Types

export interface EyeMeasurement {
  sphere: number // Spherical power (e.g., -2.25, +1.50)
  cylinder?: number // Cylindrical power for astigmatism
  axis?: number // Axis for cylinder (0-180 degrees)
  addition?: number // Add power for progressive/bifocal lenses
  prism?: {
    horizontal?: number
    vertical?: number
    base?: 'in' | 'out' | 'up' | 'down'
  }
}

export interface PrescriptionDetails {
  id: string
  customerId: string
  customerName: string
  prescribingDoctor: {
    id: string
    name: string
    licenseNumber: string
    practice: string
    phone: string
    email?: string
  }
  
  // Eye measurements
  rightEye: EyeMeasurement
  leftEye: EyeMeasurement
  
  // Pupillary distance
  pd: {
    total?: number // Total PD (e.g., 62mm)
    monocular?: {
      right: number
      left: number
    }
    near?: number // Near PD for progressive lenses
  }
  
  // Additional measurements
  measurements: {
    segmentHeight?: number // For bifocal/progressive lenses
    fittingHeight?: number // Progressive lens fitting height
    pantoscopicTilt?: number
    faceCurve?: number
    vertexDistance?: number
  }
  
  // Prescription metadata
  prescriptionDate: string
  expirationDate: string
  prescriptionType: 'distance' | 'reading' | 'progressive' | 'bifocal' | 'computer'
  
  // Special instructions
  notes?: string
  specialInstructions?: string[]
  
  // Validation status
  isValid: boolean
  validatedBy?: string
  validatedAt?: string
  
  // Audit trail
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface LensType {
  id: string
  name: string
  category: 'single_vision' | 'progressive' | 'bifocal' | 'computer' | 'reading'
  material: 'plastic' | 'polycarbonate' | 'high_index' | 'glass' | 'trivex'
  coatings: {
    antiReflective?: boolean
    scratchResistant?: boolean
    uvProtection?: boolean
    blueLight?: boolean
    photochromic?: boolean
  }
  basePrice: number
  upgradePrices: {
    highIndex?: number
    antiReflective?: number
    scratchResistant?: number
    uvProtection?: number
    blueLight?: number
    photochromic?: number
  }
  availability: boolean
  leadTime: number // days
}

export interface FrameProduct {
  id: string
  brand: string
  model: string
  sku: string
  upc?: string
  category: 'prescription' | 'sunglasses' | 'safety' | 'computer'
  frameType: 'full_rim' | 'semi_rimless' | 'rimless'
  material: 'plastic' | 'metal' | 'titanium' | 'wood' | 'carbon_fiber'
  
  // Frame specifications
  dimensions: {
    eyeSize: number // Lens width
    bridge: number // Bridge width
    temple: number // Temple length
    frameWidth?: number // Total frame width
    frameHeight?: number // Total frame height
  }
  
  // Colors and variants
  colors: {
    id: string
    name: string
    colorCode: string
    availability: boolean
    stockQuantity: number
  }[]
  
  // Pricing
  pricing: {
    basePrice: number
    retailPrice: number
    wholesalePrice: number
    discountPrice?: number
    insuranceCoverage?: {
      allowance: number
      copay: number
    }
  }
  
  // Product details
  description: string
  features: string[]
  genderTarget: 'men' | 'women' | 'unisex' | 'kids'
  ageGroup: 'adult' | 'teen' | 'child'
  
  // Inventory
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued'
  totalStock: number
  reservedStock: number
  reorderLevel: number
  supplier: {
    id: string
    name: string
    contactInfo: string
  }
  
  // Media
  images: {
    primary: string
    gallery: string[]
    colorVariants: Record<string, string[]>
  }
  
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  id: string
  type: 'frame' | 'lens' | 'service' | 'accessory'
  
  // Product details
  productId: string
  productName: string
  sku: string
  description: string
  
  // Lens-specific details (if applicable)
  lensType?: string
  lensCoatings?: string[]
  prescriptionId?: string
  
  // Frame-specific details (if applicable)
  frameColor?: string
  frameSize?: string
  
  // Pricing
  unitPrice: number
  discountAmount?: number
  discountPercentage?: number
  insuranceCoverage?: number
  finalPrice: number
  
  // Quantity and measurements
  quantity: number
  isCustom: boolean
  customizations?: Record<string, string | number | boolean>
  
  // Processing
  status: 'pending' | 'in_production' | 'quality_check' | 'ready_for_pickup' | 'completed' | 'cancelled'
  estimatedDelivery: string
  actualDelivery?: string
  
  // Lab information
  labId?: string
  labName?: string
  labOrderNumber?: string
  trackingNumber?: string
}

export interface PrescriptionOrder {
  id: string
  orderNumber: string
  customerId: string
  customerInfo: {
    name: string
    email: string
    phone: string
    address: {
      street: string
      city: string
      state: string
      zipCode: string
    }
  }
  
  prescriptionId: string
  prescriptionDetails: PrescriptionDetails
  
  // Order items
  items: OrderItem[]
  
  // Pricing breakdown
  pricing: {
    subtotal: number
    taxAmount: number
    discountAmount: number
    insuranceAmount: number
    shippingAmount: number
    totalAmount: number
    amountPaid: number
    balanceDue: number
  }
  
  // Payment information
  payment: {
    method: 'cash' | 'card' | 'insurance' | 'financing' | 'check'
    status: 'pending' | 'partial' | 'paid' | 'refunded' | 'cancelled'
    transactions: {
      id: string
      amount: number
      method: string
      timestamp: string
      referenceNumber?: string
    }[]
    insuranceInfo?: {
      carrierId: string
      carrierName: string
      policyNumber: string
      groupNumber?: string
      copay: number
      allowance: number
      deductible?: number
    }
  }
  
  // Order status and tracking
  status: 'draft' | 'submitted' | 'confirmed' | 'in_production' | 'quality_check' | 'ready_for_pickup' | 'delivered' | 'cancelled'
  orderDate: string
  estimatedCompletionDate: string
  actualCompletionDate?: string
  
  // Delivery information
  deliveryMethod: 'pickup' | 'shipping' | 'hand_delivery'
  deliveryAddress?: {
    street: string
    city: string
    state: string
    zipCode: string
    instructions?: string
  }
  
  // Processing details
  lab: {
    id: string
    name: string
    contactInfo: string
    orderNumber: string
    estimatedDelivery: string
    trackingNumber?: string
  }
  
  // Quality control
  qualityCheck: {
    performedBy?: string
    performedAt?: string
    passed?: boolean
    notes?: string
    issues?: string[]
  }
  
  // Notes and communications
  notes: string[]
  internalNotes: string[]
  
  // Audit trail
  statusHistory: {
    status: string
    timestamp: string
    updatedBy: string
    notes?: string
  }[]
  
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface OrderFilters {
  status?: string[]
  dateRange?: {
    start: string
    end: string
  }
  customerId?: string
  orderNumber?: string
  prescriptionId?: string
  labId?: string
  paymentStatus?: string[]
  deliveryMethod?: string[]
  sortBy?: 'orderDate' | 'completionDate' | 'totalAmount' | 'customerName'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface PrescriptionFilters {
  doctorId?: string
  prescriptionType?: string[]
  validityStatus?: 'valid' | 'expired' | 'expiring_soon'
  dateRange?: {
    start: string
    end: string
  }
  customerId?: string
  search?: string
  sortBy?: 'prescriptionDate' | 'expirationDate' | 'customerName'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface InventoryItem {
  id: string
  type: 'frame' | 'lens' | 'accessory' | 'service'
  productId: string
  sku: string
  name: string
  description: string
  
  // Stock information
  currentStock: number
  reservedStock: number
  availableStock: number
  reorderLevel: number
  maxStock: number
  
  // Location and organization
  location: {
    warehouse?: string
    section?: string
    shelf?: string
    bin?: string
  }
  
  // Supplier information
  supplier: {
    id: string
    name: string
    partNumber: string
    costPrice: number
    leadTime: number
    minimumOrder: number
  }
  
  // Movement tracking
  lastMovement: {
    type: 'in' | 'out' | 'adjustment' | 'transfer'
    quantity: number
    timestamp: string
    reason: string
    userId: string
  }
  
  // Expiration and lifecycle
  expirationDate?: string
  lotNumber?: string
  serialNumber?: string
  
  createdAt: string
  updatedAt: string
}

export interface OrderSummary {
  totalOrders: number
  totalValue: number
  averageOrderValue: number
  ordersByStatus: Record<string, number>
  ordersByType: Record<string, number>
  revenueByPeriod: {
    period: string
    revenue: number
    orderCount: number
  }[]
  topProducts: {
    productId: string
    productName: string
    quantity: number
    revenue: number
  }[]
  labPerformance: {
    labId: string
    labName: string
    averageDeliveryTime: number
    qualityScore: number
    orderCount: number
  }[]
}