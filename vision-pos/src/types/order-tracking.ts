// Order Tracking System Types
// Comprehensive type definitions for order management

export type OrderStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'CONFIRMED'
  | 'IN_PRODUCTION'
  | 'QUALITY_CHECK'
  | 'READY_FOR_PICKUP'
  | 'READY_FOR_SHIPPING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'ON_HOLD'

export type OrderItemStatus =
  | 'PENDING'
  | 'IN_PRODUCTION'
  | 'QUALITY_CHECK'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED'

export type OrderItemType =
  | 'FRAME'
  | 'LENS'
  | 'COATING'
  | 'SERVICE'
  | 'ACCESSORY'
  | 'ADDON'

export type DeliveryMethod = 'PICKUP' | 'SHIPPING' | 'HAND_DELIVERY'

export type CommunicationType = 'EMAIL' | 'SMS' | 'NOTE' | 'CALL' | 'SYSTEM'

export type CommunicationDirection = 'INBOUND' | 'OUTBOUND' | 'INTERNAL'

// Core Order Interface
export interface Order {
  id: string
  orderNumber: string
  customerId: string
  prescriptionId?: string | null

  // Status
  status: OrderStatus
  statusUpdatedAt: Date
  statusUpdatedBy?: string | null

  // Dates
  orderDate: Date
  estimatedCompletionDate: Date
  actualCompletionDate?: Date | null

  // Lab information
  labId?: string | null
  labName?: string | null
  labOrderNumber?: string | null
  labTrackingNumber?: string | null
  labEstimatedDelivery?: Date | null

  // Delivery
  deliveryMethod: DeliveryMethod
  deliveryAddress?: DeliveryAddress | null
  deliveryInstructions?: string | null

  // Pricing
  subtotal: number
  taxAmount: number
  discountAmount?: number | null
  insuranceAmount?: number | null
  shippingAmount?: number | null
  totalAmount: number
  amountPaid: number

  // Notes
  notes?: string | null
  internalNotes?: string | null

  // Relations
  customer?: CustomerBasicInfo
  items: OrderItem[]
  statusHistory?: OrderStatusHistory[]
  communications?: OrderCommunication[]
  qualityChecks?: OrderQualityCheck[]

  // Metadata
  createdAt: Date
  updatedAt: Date
  createdBy: string
}

// Order Item Interface
export interface OrderItem {
  id: string
  orderId: string
  type: OrderItemType
  productId?: string | null

  // Product details
  productName: string
  sku: string
  description?: string | null

  // Lens specifics
  lensType?: string | null
  lensCoatings: string[]
  prescriptionId?: string | null

  // Frame specifics
  frameColor?: string | null
  frameSize?: string | null

  // Pricing
  unitPrice: number
  discountAmount?: number | null
  insuranceCoverage?: number | null
  finalPrice: number
  quantity: number

  // Status
  status: OrderItemStatus
  estimatedDelivery?: Date | null
  actualDelivery?: Date | null

  // Lab tracking
  labId?: string | null
  labOrderNumber?: string | null
  trackingNumber?: string | null

  // Customizations
  customizations?: Record<string, string | number | boolean> | null
  isCustom: boolean

  // Metadata
  createdAt: Date
  updatedAt: Date
}

// Order Status History
export interface OrderStatusHistory {
  id: string
  orderId: string
  status: OrderStatus
  previousStatus?: OrderStatus | null
  updatedBy: string
  updatedByName?: string | null
  notes?: string | null
  timestamp: Date
}

// Order Communication
export interface OrderCommunication {
  id: string
  orderId: string
  type: CommunicationType
  direction: CommunicationDirection
  subject?: string | null
  message: string
  sentBy?: string | null
  sentByName?: string | null
  sentTo?: string | null
  sentToName?: string | null
  timestamp: Date
  metadata?: Record<string, string | number | boolean> | null
}

// Order Quality Check
export interface OrderQualityCheck {
  id: string
  orderId: string
  performedBy: string
  performedByName?: string | null
  performedAt: Date
  passed: boolean
  notes?: string | null
  issues: string[]
  checklist?: QualityCheckList | null
}

// Supporting Types
export interface DeliveryAddress {
  street: string
  street2?: string
  city: string
  state: string
  zipCode: string
  country?: string
  instructions?: string
}

export interface CustomerBasicInfo {
  id: string
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
}

export interface QualityCheckList {
  prescriptionAccuracy?: boolean
  lensQuality?: boolean
  frameFit?: boolean
  coatingApplication?: boolean
  overallAppearance?: boolean
  [key: string]: boolean | undefined
}

// Request/Response Types
export interface CreateOrderRequest {
  customerId: string
  prescriptionId?: string
  items: CreateOrderItemRequest[]
  deliveryMethod: DeliveryMethod
  deliveryAddress?: DeliveryAddress
  deliveryInstructions?: string
  estimatedCompletionDate: Date | string
  notes?: string
  internalNotes?: string
}

export interface CreateOrderItemRequest {
  type: OrderItemType
  productId?: string
  productName: string
  sku: string
  description?: string
  lensType?: string
  lensCoatings?: string[]
  prescriptionId?: string
  frameColor?: string
  frameSize?: string
  unitPrice: number
  quantity?: number
  customizations?: Record<string, string | number | boolean>
  isCustom?: boolean
}

export interface UpdateOrderRequest {
  status?: OrderStatus
  estimatedCompletionDate?: Date | string
  actualCompletionDate?: Date | string
  labId?: string
  labName?: string
  labOrderNumber?: string
  labTrackingNumber?: string
  labEstimatedDelivery?: Date | string
  deliveryMethod?: DeliveryMethod
  deliveryAddress?: DeliveryAddress
  deliveryInstructions?: string
  notes?: string
  internalNotes?: string
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus
  notes?: string
  updatedBy: string
  updatedByName?: string
}

export interface CreateCommunicationRequest {
  type: CommunicationType
  direction: CommunicationDirection
  subject?: string
  message: string
  sentBy?: string
  sentByName?: string
  sentTo?: string
  sentToName?: string
  metadata?: Record<string, string | number | boolean>
}

export interface CreateQualityCheckRequest {
  performedBy: string
  performedByName?: string
  passed: boolean
  notes?: string
  issues?: string[]
  checklist?: QualityCheckList
}

// Filter and Query Types
export interface OrderFilters {
  customerId?: string
  status?: OrderStatus | OrderStatus[]
  dateFrom?: Date | string
  dateTo?: Date | string
  labId?: string
  deliveryMethod?: DeliveryMethod
  search?: string // Search by order number, customer name, etc.
}

export interface OrderListOptions {
  page?: number
  limit?: number
  sortBy?: 'orderDate' | 'estimatedCompletionDate' | 'totalAmount' | 'status'
  sortOrder?: 'asc' | 'desc'
  filters?: OrderFilters
}

// Response Types
export interface OrderListResponse {
  orders: Order[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface OrderDetailResponse {
  order: Order
  customer: CustomerBasicInfo
  items: OrderItem[]
  statusHistory: OrderStatusHistory[]
  communications: OrderCommunication[]
  qualityChecks: OrderQualityCheck[]
}

export interface OrderTrackingResponse {
  orderNumber: string
  status: OrderStatus
  statusUpdatedAt: Date
  estimatedCompletionDate: Date
  actualCompletionDate?: Date | null
  currentLocation?: string
  labTrackingNumber?: string | null
  deliveryMethod: DeliveryMethod
  statusHistory: OrderStatusHistory[]
  canCancel: boolean
  canModify: boolean
}

// Statistics and Analytics
export interface OrderStatistics {
  totalOrders: number
  ordersByStatus: Record<OrderStatus, number>
  averageOrderValue: number
  averageCompletionTime: number // in days
  onTimeDeliveryRate: number // percentage
  qualityCheckPassRate: number // percentage
}

// Status Badge Configuration
export interface OrderStatusConfig {
  status: OrderStatus
  label: string
  color: 'gray' | 'blue' | 'yellow' | 'green' | 'red' | 'purple'
  icon: string
  description: string
}

// Export status configurations
export const ORDER_STATUS_CONFIGS: Record<OrderStatus, OrderStatusConfig> = {
  DRAFT: {
    status: 'DRAFT',
    label: 'Draft',
    color: 'gray',
    icon: 'FileText',
    description: 'Order is being prepared',
  },
  SUBMITTED: {
    status: 'SUBMITTED',
    label: 'Submitted',
    color: 'blue',
    icon: 'Send',
    description: 'Order has been submitted',
  },
  CONFIRMED: {
    status: 'CONFIRMED',
    label: 'Confirmed',
    color: 'blue',
    icon: 'CheckCircle',
    description: 'Order has been confirmed',
  },
  IN_PRODUCTION: {
    status: 'IN_PRODUCTION',
    label: 'In Production',
    color: 'yellow',
    icon: 'Loader',
    description: 'Order is being manufactured',
  },
  QUALITY_CHECK: {
    status: 'QUALITY_CHECK',
    label: 'Quality Check',
    color: 'purple',
    icon: 'Search',
    description: 'Order is undergoing quality inspection',
  },
  READY_FOR_PICKUP: {
    status: 'READY_FOR_PICKUP',
    label: 'Ready for Pickup',
    color: 'green',
    icon: 'Package',
    description: 'Order is ready for customer pickup',
  },
  READY_FOR_SHIPPING: {
    status: 'READY_FOR_SHIPPING',
    label: 'Ready to Ship',
    color: 'green',
    icon: 'Truck',
    description: 'Order is ready to be shipped',
  },
  SHIPPED: {
    status: 'SHIPPED',
    label: 'Shipped',
    color: 'blue',
    icon: 'Truck',
    description: 'Order has been shipped',
  },
  DELIVERED: {
    status: 'DELIVERED',
    label: 'Delivered',
    color: 'green',
    icon: 'CheckCircle',
    description: 'Order has been delivered',
  },
  CANCELLED: {
    status: 'CANCELLED',
    label: 'Cancelled',
    color: 'red',
    icon: 'XCircle',
    description: 'Order has been cancelled',
  },
  ON_HOLD: {
    status: 'ON_HOLD',
    label: 'On Hold',
    color: 'yellow',
    icon: 'Pause',
    description: 'Order is temporarily on hold',
  },
}

// Helper functions
export function getOrderStatusConfig(status: OrderStatus): OrderStatusConfig {
  return ORDER_STATUS_CONFIGS[status]
}

export function canCancelOrder(status: OrderStatus): boolean {
  return !['DELIVERED', 'CANCELLED', 'SHIPPED'].includes(status)
}

export function canModifyOrder(status: OrderStatus): boolean {
  return ['DRAFT', 'SUBMITTED'].includes(status)
}

export function isOrderComplete(status: OrderStatus): boolean {
  return ['DELIVERED', 'CANCELLED'].includes(status)
}

export function calculateOrderProgress(status: OrderStatus): number {
  const progressMap: Record<OrderStatus, number> = {
    DRAFT: 10,
    SUBMITTED: 20,
    CONFIRMED: 30,
    IN_PRODUCTION: 50,
    QUALITY_CHECK: 70,
    READY_FOR_PICKUP: 85,
    READY_FOR_SHIPPING: 85,
    SHIPPED: 90,
    DELIVERED: 100,
    CANCELLED: 0,
    ON_HOLD: 40,
  }
  return progressMap[status] || 0
}
