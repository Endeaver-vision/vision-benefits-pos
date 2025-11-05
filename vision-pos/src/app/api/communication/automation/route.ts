import { NextRequest, NextResponse } from 'next/server'
import { AutomationTrigger } from '@/types/communication'

// Mock automation triggers for development
const mockTriggers: AutomationTrigger[] = [
  {
    id: 'welcome-new-customer',
    name: 'Welcome New Customer',
    description: 'Send welcome email when a new customer is created',
    type: 'customer_created',
    active: true,
    conditions: [
      {
        field: 'customer.active',
        operator: 'equals',
        value: true,
        label: 'Customer is active'
      }
    ],
    actions: [
      {
        type: 'send_template',
        config: {
          templateId: 'welcome-email-001',
          delay: 0,
          channel: 'email'
        }
      },
      {
        type: 'add_tag',
        config: {
          tag: 'new-customer'
        }
      }
    ],
    delay: 5, // 5 minutes delay
    timeWindow: {
      start: '09:00',
      end: '17:00',
      timezone: 'America/New_York',
      daysOfWeek: [1, 2, 3, 4, 5] // Monday to Friday
    },
    stats: {
      totalTriggered: 1247,
      successfulExecutions: 1195,
      failedExecutions: 52,
      lastTriggered: '2024-01-15T14:30:00Z'
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    createdBy: 'system'
  },
  {
    id: 'appointment-reminder-24h',
    name: 'Appointment Reminder - 24 Hours',
    description: 'Send reminder email 24 hours before appointment',
    type: 'appointment_scheduled',
    active: true,
    conditions: [
      {
        field: 'appointment.status',
        operator: 'equals',
        value: 'scheduled',
        label: 'Appointment is scheduled'
      },
      {
        field: 'customer.communicationPreferences.emailEnabled',
        operator: 'equals',
        value: true,
        label: 'Customer accepts email'
      }
    ],
    actions: [
      {
        type: 'send_template',
        config: {
          templateId: 'appointment-reminder-email',
          delay: 1440, // 24 hours in minutes
          channel: 'email'
        }
      }
    ],
    delay: 1440, // 24 hours before appointment
    timeWindow: {
      start: '08:00',
      end: '20:00',
      timezone: 'America/New_York',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6] // All days
    },
    stats: {
      totalTriggered: 2890,
      successfulExecutions: 2756,
      failedExecutions: 134,
      lastTriggered: '2024-01-15T16:45:00Z'
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
    createdBy: 'system'
  },
  {
    id: 'insurance-expiring-warning',
    name: 'Insurance Benefits Expiring',
    description: 'Alert customers when insurance benefits are expiring soon',
    type: 'insurance_expiring',
    active: true,
    conditions: [
      {
        field: 'insurance.daysUntilExpiry',
        operator: 'less_than',
        value: 45,
        label: 'Insurance expires in less than 45 days'
      },
      {
        field: 'customer.lastExamDate',
        operator: 'greater_than',
        value: 365,
        label: 'Last exam was over a year ago'
      }
    ],
    actions: [
      {
        type: 'send_template',
        config: {
          templateId: 'insurance-expiring-sms',
          channel: 'sms'
        }
      },
      {
        type: 'create_task',
        config: {
          title: 'Follow up on insurance expiration',
          assignedTo: 'insurance-coordinator',
          priority: 'high'
        }
      }
    ],
    delay: 0,
    timeWindow: {
      start: '10:00',
      end: '16:00',
      timezone: 'America/New_York',
      daysOfWeek: [1, 2, 3, 4, 5] // Weekdays only
    },
    stats: {
      totalTriggered: 456,
      successfulExecutions: 423,
      failedExecutions: 33,
      lastTriggered: '2024-01-14T11:20:00Z'
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-12T00:00:00Z',
    createdBy: 'admin'
  },
  {
    id: 'birthday-promotion',
    name: 'Birthday Promotion Campaign',
    description: 'Send birthday promotion email to customers on their birthday',
    type: 'birthday',
    active: true,
    conditions: [
      {
        field: 'customer.dateOfBirth',
        operator: 'equals',
        value: 'today',
        label: 'Customer birthday is today'
      },
      {
        field: 'customer.communicationPreferences.promotionalMessages',
        operator: 'equals',
        value: true,
        label: 'Customer accepts promotional messages'
      }
    ],
    actions: [
      {
        type: 'send_template',
        config: {
          templateId: 'birthday-promotion-email',
          channel: 'email'
        }
      },
      {
        type: 'add_tag',
        config: {
          tag: 'birthday-2024'
        }
      }
    ],
    delay: 0,
    timeWindow: {
      start: '09:00',
      end: '11:00',
      timezone: 'America/New_York',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6] // All days
    },
    stats: {
      totalTriggered: 89,
      successfulExecutions: 85,
      failedExecutions: 4,
      lastTriggered: '2024-01-15T09:15:00Z'
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-08T00:00:00Z',
    createdBy: 'marketing'
  },
  {
    id: 'prescription-ready-notification',
    name: 'Prescription Ready for Pickup',
    description: 'Notify customer when prescription is ready for pickup',
    type: 'custom',
    active: true,
    conditions: [
      {
        field: 'order.status',
        operator: 'equals',
        value: 'ready_for_pickup',
        label: 'Order is ready for pickup'
      }
    ],
    actions: [
      {
        type: 'send_template',
        config: {
          templateId: 'prescription-ready-sms',
          channel: 'sms'
        }
      },
      {
        type: 'send_template',
        config: {
          templateId: 'prescription-ready-email',
          channel: 'email',
          delay: 60 // Also send email 1 hour later
        }
      }
    ],
    delay: 0,
    timeWindow: {
      start: '08:00',
      end: '19:00',
      timezone: 'America/New_York',
      daysOfWeek: [1, 2, 3, 4, 5, 6] // All except Sunday
    },
    stats: {
      totalTriggered: 1567,
      successfulExecutions: 1489,
      failedExecutions: 78,
      lastTriggered: '2024-01-15T15:30:00Z'
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-13T00:00:00Z',
    createdBy: 'operations'
  },
  {
    id: 'inactive-customer-reengagement',
    name: 'Re-engage Inactive Customers',
    description: 'Send re-engagement campaign to customers inactive for 6 months',
    type: 'inactivity',
    active: true,
    conditions: [
      {
        field: 'customer.daysSinceLastVisit',
        operator: 'greater_than',
        value: 180,
        label: 'No visit in 6+ months'
      },
      {
        field: 'customer.totalSpent',
        operator: 'greater_than',
        value: 200,
        label: 'Has spent over $200 historically'
      }
    ],
    actions: [
      {
        type: 'send_template',
        config: {
          templateId: 'reengagement-email',
          channel: 'email'
        }
      },
      {
        type: 'create_task',
        config: {
          title: 'Personal outreach to inactive high-value customer',
          assignedTo: 'customer-success',
          priority: 'medium'
        }
      }
    ],
    delay: 0,
    timeWindow: {
      start: '10:00',
      end: '15:00',
      timezone: 'America/New_York',
      daysOfWeek: [2, 3, 4] // Tuesday, Wednesday, Thursday
    },
    stats: {
      totalTriggered: 234,
      successfulExecutions: 198,
      failedExecutions: 36,
      lastTriggered: '2024-01-12T12:45:00Z'
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-11T00:00:00Z',
    createdBy: 'marketing'
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const active = searchParams.get('active')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let filteredTriggers = [...mockTriggers]

    // Apply filters
    if (type) {
      filteredTriggers = filteredTriggers.filter(t => t.type === type)
    }

    if (active !== null) {
      const isActive = active === 'true'
      filteredTriggers = filteredTriggers.filter(t => t.active === isActive)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      filteredTriggers = filteredTriggers.filter(t =>
        t.name.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower)
      )
    }

    // Sort by total triggered count (most active first)
    filteredTriggers.sort((a, b) => b.stats.totalTriggered - a.stats.totalTriggered)

    // Apply pagination
    const total = filteredTriggers.length
    const triggers = filteredTriggers.slice(offset, offset + limit)

    // Calculate statistics
    const stats = {
      total,
      active: filteredTriggers.filter(t => t.active).length,
      byType: {
        customer_created: filteredTriggers.filter(t => t.type === 'customer_created').length,
        appointment_scheduled: filteredTriggers.filter(t => t.type === 'appointment_scheduled').length,
        appointment_completed: filteredTriggers.filter(t => t.type === 'appointment_completed').length,
        purchase_made: filteredTriggers.filter(t => t.type === 'purchase_made').length,
        insurance_expiring: filteredTriggers.filter(t => t.type === 'insurance_expiring').length,
        birthday: filteredTriggers.filter(t => t.type === 'birthday').length,
        inactivity: filteredTriggers.filter(t => t.type === 'inactivity').length,
        custom: filteredTriggers.filter(t => t.type === 'custom').length
      },
      totalExecutions: filteredTriggers.reduce((sum, t) => sum + t.stats.totalTriggered, 0),
      successRate: filteredTriggers.length > 0 ? 
        filteredTriggers.reduce((sum, t) => sum + t.stats.successfulExecutions, 0) /
        filteredTriggers.reduce((sum, t) => sum + t.stats.totalTriggered, 0) * 100 : 0
    }

    return NextResponse.json({
      success: true,
      data: {
        triggers,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        },
        stats
      }
    })
  } catch (error) {
    console.error('Automation triggers API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch automation triggers'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      description,
      type,
      active = true,
      conditions = [],
      actions = [],
      delay = 0,
      timeWindow
    } = body

    // Validate required fields
    if (!name || !description || !type) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, description, type'
      }, { status: 400 })
    }

    // Validate type
    const validTypes = ['customer_created', 'appointment_scheduled', 'appointment_completed', 'purchase_made', 'insurance_expiring', 'birthday', 'inactivity', 'custom']
    if (!validTypes.includes(type)) {
      return NextResponse.json({
        success: false,
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}`
      }, { status: 400 })
    }

    // Validate actions
    if (actions.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'At least one action is required'
      }, { status: 400 })
    }

    // Create new trigger
    const newTrigger: AutomationTrigger = {
      id: `trigger-${Date.now()}`,
      name,
      description,
      type,
      active,
      conditions,
      actions,
      delay,
      timeWindow,
      stats: {
        totalTriggered: 0,
        successfulExecutions: 0,
        failedExecutions: 0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'current-user' // In real app, get from authentication
    }

    // In a real application, save to database
    mockTriggers.push(newTrigger)

    return NextResponse.json({
      success: true,
      data: newTrigger
    }, { status: 201 })
  } catch (error) {
    console.error('Create automation trigger error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create automation trigger'
    }, { status: 500 })
  }
}