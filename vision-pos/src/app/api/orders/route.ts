import { NextRequest, NextResponse } from 'next/server'
import { PrescriptionOrder, OrderFilters } from '@/types/prescription'

// Mock order data
const mockOrders: PrescriptionOrder[] = [
  {
    id: '1',
    orderNumber: 'ORD-2024-001',
    customerId: '1',
    customerInfo: {
      name: 'John Smith',
      email: 'john.smith@email.com',
      phone: '(555) 123-4567',
      address: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345'
      }
    },
    prescriptionId: '1',
    prescriptionDetails: {
      id: '1',
      customerId: '1',
      customerName: 'John Smith',
      prescribingDoctor: {
        id: 'dr_001',
        name: 'Dr. Sarah Johnson',
        licenseNumber: 'MD123456',
        practice: 'Vision Care Associates',
        phone: '(555) 123-4567'
      },
      rightEye: { sphere: -2.25, cylinder: -0.75, axis: 90 },
      leftEye: { sphere: -2.50, cylinder: -0.50, axis: 85 },
      pd: { total: 62 },
      measurements: {},
      prescriptionDate: '2024-10-15',
      expirationDate: '2026-10-15',
      prescriptionType: 'progressive',
      isValid: true,
      createdAt: '2024-10-15T10:30:00Z',
      updatedAt: '2024-10-15T10:30:00Z',
      createdBy: 'dr_001'
    },
    items: [
      {
        id: 'item_1',
        type: 'frame',
        productId: 'frame_001',
        productName: 'Ray-Ban RB5154 Clubmaster',
        sku: 'RB5154-2000-49',
        description: 'Classic clubmaster style frame in black',
        frameColor: 'Black',
        frameSize: '49-21-140',
        unitPrice: 199.00,
        finalPrice: 199.00,
        quantity: 1,
        isCustom: false,
        status: 'completed',
        estimatedDelivery: '2024-11-01'
      },
      {
        id: 'item_2',
        type: 'lens',
        productId: 'lens_001',
        productName: 'Progressive High-Index Lenses',
        sku: 'PROG-HI-AR',
        description: 'High-index progressive lenses with anti-reflective coating',
        lensType: 'progressive',
        lensCoatings: ['anti-reflective', 'scratch-resistant', 'uv-protection'],
        prescriptionId: '1',
        unitPrice: 299.00,
        finalPrice: 299.00,
        quantity: 1,
        isCustom: true,
        status: 'in_production',
        estimatedDelivery: '2024-11-05'
      }
    ],
    pricing: {
      subtotal: 498.00,
      taxAmount: 39.84,
      discountAmount: 0,
      insuranceAmount: 200.00,
      shippingAmount: 0,
      totalAmount: 537.84,
      amountPaid: 337.84,
      balanceDue: 0
    },
    payment: {
      method: 'insurance',
      status: 'paid',
      transactions: [
        {
          id: 'txn_1',
          amount: 200.00,
          method: 'insurance',
          timestamp: '2024-10-20T10:00:00Z',
          referenceNumber: 'INS-REF-12345'
        },
        {
          id: 'txn_2',
          amount: 137.84,
          method: 'card',
          timestamp: '2024-10-20T10:05:00Z',
          referenceNumber: 'CARD-4567'
        }
      ],
      insuranceInfo: {
        carrierId: 'ins_001',
        carrierName: 'Vision Benefits Plus',
        policyNumber: 'VBP123456789',
        groupNumber: 'GRP001',
        copay: 25.00,
        allowance: 200.00,
        deductible: 0
      }
    },
    status: 'in_production',
    orderDate: '2024-10-20',
    estimatedCompletionDate: '2024-11-05',
    deliveryMethod: 'pickup',
    lab: {
      id: 'lab_001',
      name: 'Precision Optical Lab',
      contactInfo: 'lab@precisionoptical.com',
      orderNumber: 'POL-2024-789',
      estimatedDelivery: '2024-11-05',
      trackingNumber: 'POL789456123'
    },
    qualityCheck: {},
    notes: ['Customer prefers progressive lenses', 'Rush order for business travel'],
    internalNotes: ['Lab confirmed rush processing'],
    statusHistory: [
      {
        status: 'draft',
        timestamp: '2024-10-20T09:00:00Z',
        updatedBy: 'staff_001',
        notes: 'Order created'
      },
      {
        status: 'submitted',
        timestamp: '2024-10-20T10:00:00Z',
        updatedBy: 'staff_001',
        notes: 'Payment processed'
      },
      {
        status: 'confirmed',
        timestamp: '2024-10-20T10:30:00Z',
        updatedBy: 'system',
        notes: 'Order confirmed and sent to lab'
      },
      {
        status: 'in_production',
        timestamp: '2024-10-21T08:00:00Z',
        updatedBy: 'lab_001',
        notes: 'Production started at lab'
      }
    ],
    createdAt: '2024-10-20T09:00:00Z',
    updatedAt: '2024-10-21T08:00:00Z',
    createdBy: 'staff_001'
  },
  {
    id: '2',
    orderNumber: 'ORD-2024-002',
    customerId: '2',
    customerInfo: {
      name: 'Emily Davis',
      email: 'emily.davis@email.com',
      phone: '(555) 987-6543',
      address: {
        street: '456 Oak Ave',
        city: 'Springfield',
        state: 'IL',
        zipCode: '62701'
      }
    },
    prescriptionId: '2',
    prescriptionDetails: {
      id: '2',
      customerId: '2',
      customerName: 'Emily Davis',
      prescribingDoctor: {
        id: 'dr_002',
        name: 'Dr. Michael Chen',
        licenseNumber: 'OD789012',
        practice: 'Clear Vision Clinic',
        phone: '(555) 987-6543'
      },
      rightEye: { sphere: -1.75, cylinder: -0.25, axis: 180 },
      leftEye: { sphere: -1.50, cylinder: -0.50, axis: 175 },
      pd: { total: 58 },
      measurements: {},
      prescriptionDate: '2024-09-20',
      expirationDate: '2026-09-20',
      prescriptionType: 'distance',
      isValid: true,
      createdAt: '2024-09-20T14:15:00Z',
      updatedAt: '2024-09-20T14:15:00Z',
      createdBy: 'dr_002'
    },
    items: [
      {
        id: 'item_3',
        type: 'frame',
        productId: 'frame_002',
        productName: 'Oakley OX8156 Holbrook',
        sku: 'OX8156-0354',
        description: 'Modern rectangular frame in matte black',
        frameColor: 'Matte Black',
        frameSize: '54-18-137',
        unitPrice: 159.00,
        finalPrice: 159.00,
        quantity: 1,
        isCustom: false,
        status: 'ready_for_pickup',
        estimatedDelivery: '2024-10-25',
        actualDelivery: '2024-10-25'
      },
      {
        id: 'item_4',
        type: 'lens',
        productId: 'lens_002',
        productName: 'Single Vision Polycarbonate',
        sku: 'SV-PC-AR',
        description: 'Single vision polycarbonate lenses with anti-reflective coating',
        lensType: 'single_vision',
        lensCoatings: ['anti-reflective', 'scratch-resistant'],
        prescriptionId: '2',
        unitPrice: 149.00,
        finalPrice: 149.00,
        quantity: 1,
        isCustom: true,
        status: 'ready_for_pickup',
        estimatedDelivery: '2024-10-25',
        actualDelivery: '2024-10-25'
      }
    ],
    pricing: {
      subtotal: 308.00,
      taxAmount: 24.64,
      discountAmount: 20.00,
      insuranceAmount: 150.00,
      shippingAmount: 0,
      totalAmount: 332.64,
      amountPaid: 332.64,
      balanceDue: 0
    },
    payment: {
      method: 'insurance',
      status: 'paid',
      transactions: [
        {
          id: 'txn_3',
          amount: 150.00,
          method: 'insurance',
          timestamp: '2024-10-15T14:00:00Z',
          referenceNumber: 'INS-REF-67890'
        },
        {
          id: 'txn_4',
          amount: 182.64,
          method: 'card',
          timestamp: '2024-10-15T14:05:00Z',
          referenceNumber: 'CARD-8901'
        }
      ],
      insuranceInfo: {
        carrierId: 'ins_002',
        carrierName: 'EyeCare Insurance',
        policyNumber: 'ECI987654321',
        copay: 20.00,
        allowance: 150.00
      }
    },
    status: 'ready_for_pickup',
    orderDate: '2024-10-15',
    estimatedCompletionDate: '2024-10-25',
    actualCompletionDate: '2024-10-25',
    deliveryMethod: 'pickup',
    lab: {
      id: 'lab_002',
      name: 'Quick Vision Lab',
      contactInfo: 'orders@quickvision.com',
      orderNumber: 'QVL-2024-456',
      estimatedDelivery: '2024-10-25',
      trackingNumber: 'QVL456789012'
    },
    qualityCheck: {
      performedBy: 'qc_001',
      performedAt: '2024-10-25T09:00:00Z',
      passed: true,
      notes: 'Perfect quality, ready for customer pickup'
    },
    notes: ['Student discount applied'],
    internalNotes: ['Customer called to confirm pickup time'],
    statusHistory: [
      {
        status: 'draft',
        timestamp: '2024-10-15T13:00:00Z',
        updatedBy: 'staff_002',
        notes: 'Order created'
      },
      {
        status: 'submitted',
        timestamp: '2024-10-15T14:00:00Z',
        updatedBy: 'staff_002',
        notes: 'Payment processed'
      },
      {
        status: 'confirmed',
        timestamp: '2024-10-15T14:30:00Z',
        updatedBy: 'system',
        notes: 'Order sent to lab'
      },
      {
        status: 'in_production',
        timestamp: '2024-10-16T08:00:00Z',
        updatedBy: 'lab_002',
        notes: 'Production started'
      },
      {
        status: 'quality_check',
        timestamp: '2024-10-24T16:00:00Z',
        updatedBy: 'lab_002',
        notes: 'Completed production, quality check in progress'
      },
      {
        status: 'ready_for_pickup',
        timestamp: '2024-10-25T09:00:00Z',
        updatedBy: 'qc_001',
        notes: 'Quality check passed, ready for pickup'
      }
    ],
    createdAt: '2024-10-15T13:00:00Z',
    updatedAt: '2024-10-25T09:00:00Z',
    createdBy: 'staff_002'
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse filters
    const filters: OrderFilters = {
      status: searchParams.get('status')?.split(',') || undefined,
      customerId: searchParams.get('customerId') || undefined,
      orderNumber: searchParams.get('orderNumber') || undefined,
      prescriptionId: searchParams.get('prescriptionId') || undefined,
      labId: searchParams.get('labId') || undefined,
      paymentStatus: searchParams.get('paymentStatus')?.split(',') || undefined,
      deliveryMethod: searchParams.get('deliveryMethod')?.split(',') || undefined,
      sortBy: (searchParams.get('sortBy') as 'orderDate' | 'completionDate' | 'totalAmount' | 'customerName') || 'orderDate',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    }
    
    if (searchParams.get('startDate') && searchParams.get('endDate')) {
      filters.dateRange = {
        start: searchParams.get('startDate')!,
        end: searchParams.get('endDate')!
      }
    }
    
    let filteredOrders = [...mockOrders]
    
    // Apply filters
    if (filters.status && filters.status.length > 0) {
      filteredOrders = filteredOrders.filter(order => 
        filters.status!.includes(order.status)
      )
    }
    
    if (filters.customerId) {
      filteredOrders = filteredOrders.filter(order => order.customerId === filters.customerId)
    }
    
    if (filters.orderNumber) {
      filteredOrders = filteredOrders.filter(order => 
        order.orderNumber.toLowerCase().includes(filters.orderNumber!.toLowerCase())
      )
    }
    
    if (filters.prescriptionId) {
      filteredOrders = filteredOrders.filter(order => order.prescriptionId === filters.prescriptionId)
    }
    
    if (filters.labId) {
      filteredOrders = filteredOrders.filter(order => order.lab.id === filters.labId)
    }
    
    if (filters.paymentStatus && filters.paymentStatus.length > 0) {
      filteredOrders = filteredOrders.filter(order => 
        filters.paymentStatus!.includes(order.payment.status)
      )
    }
    
    if (filters.deliveryMethod && filters.deliveryMethod.length > 0) {
      filteredOrders = filteredOrders.filter(order => 
        filters.deliveryMethod!.includes(order.deliveryMethod)
      )
    }
    
    if (filters.dateRange) {
      const { start, end } = filters.dateRange
      filteredOrders = filteredOrders.filter(order => {
        const orderDate = new Date(order.orderDate)
        return orderDate >= new Date(start) && orderDate <= new Date(end)
      })
    }
    
    // Sort orders
    filteredOrders.sort((a, b) => {
      let comparison = 0
      
      switch (filters.sortBy) {
        case 'orderDate':
          comparison = new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime()
          break
        case 'completionDate':
          const aCompletion = a.actualCompletionDate || a.estimatedCompletionDate
          const bCompletion = b.actualCompletionDate || b.estimatedCompletionDate
          comparison = new Date(aCompletion).getTime() - new Date(bCompletion).getTime()
          break
        case 'totalAmount':
          comparison = a.pricing.totalAmount - b.pricing.totalAmount
          break
        case 'customerName':
          comparison = a.customerInfo.name.localeCompare(b.customerInfo.name)
          break
        default:
          comparison = new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime()
      }
      
      return filters.sortOrder === 'desc' ? -comparison : comparison
    })
    
    // Apply pagination
    const page = Math.max(1, filters.page || 1)
    const limit = Math.max(1, Math.min(filters.limit || 20, 100))
    const skip = (page - 1) * limit
    const paginatedOrders = filteredOrders.slice(skip, skip + limit)
    
    // Calculate stats
    const totalPages = Math.ceil(filteredOrders.length / limit)
    const stats = {
      total: filteredOrders.length,
      totalValue: filteredOrders.reduce((sum, order) => sum + order.pricing.totalAmount, 0),
      averageOrderValue: filteredOrders.length > 0 
        ? filteredOrders.reduce((sum, order) => sum + order.pricing.totalAmount, 0) / filteredOrders.length 
        : 0,
      ordersByStatus: filteredOrders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      ordersByPaymentStatus: filteredOrders.reduce((acc, order) => {
        acc[order.payment.status] = (acc[order.payment.status] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      ordersByDeliveryMethod: filteredOrders.reduce((acc, order) => {
        acc[order.deliveryMethod] = (acc[order.deliveryMethod] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }
    
    return NextResponse.json({
      success: true,
      data: paginatedOrders,
      pagination: {
        page,
        limit,
        total: filteredOrders.length,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      },
      stats
    })
  } catch (error) {
    console.error('Orders API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json()
    
    // Validate required fields
    const requiredFields = ['customerId', 'customerInfo', 'prescriptionId', 'items']
    const missingFields = requiredFields.filter(field => !orderData[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 })
    }
    
    // Generate order number
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(mockOrders.length + 1).padStart(3, '0')}`
    
    // Create new order
    const newOrder: PrescriptionOrder = {
      id: (mockOrders.length + 1).toString(),
      orderNumber,
      ...orderData,
      status: 'draft',
      orderDate: new Date().toISOString().split('T')[0],
      statusHistory: [
        {
          status: 'draft',
          timestamp: new Date().toISOString(),
          updatedBy: orderData.createdBy || 'system',
          notes: 'Order created'
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    // In a real implementation, this would save to database
    mockOrders.push(newOrder)
    
    return NextResponse.json({
      success: true,
      data: newOrder,
      message: 'Order created successfully'
    })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create order'
    }, { status: 500 })
  }
}