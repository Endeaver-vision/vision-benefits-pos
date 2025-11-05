import { NextRequest, NextResponse } from 'next/server'
import { CommunicationTemplate } from '@/types/communication'

// Mock data for development - in production this would come from database
const mockTemplates: CommunicationTemplate[] = [
  {
    id: 'welcome-email-001',
    name: 'Welcome Email - New Customer',
    type: 'email',
    category: 'welcome',
    subject: 'Welcome to {{practice_name}}, {{customer_name}}!',
    content: `Dear {{customer_name}},

Welcome to {{practice_name}}! We're thrilled to have you as part of our vision care family.

Your customer account has been created and you're all set to:
- Schedule appointments online
- Access your prescription history
- Receive personalized care recommendations
- Take advantage of exclusive member benefits

{{#if insurance_carrier}}
We've noted that you have {{insurance_carrier}} insurance. Our team will verify your benefits and help you maximize your coverage.
{{/if}}

Next steps:
1. Schedule your comprehensive eye exam
2. Explore our latest eyewear collections
3. Learn about our premium lens options

If you have any questions, please don't hesitate to contact us at {{practice_phone}} or reply to this email.

Thank you for choosing {{practice_name}} for your vision care needs!

Best regards,
The {{practice_name}} Team

---
{{practice_address}}
{{practice_phone}} | {{practice_website}}`,
    variables: [
      { key: 'customer_name', name: 'Customer Name', description: 'Full name of the customer', type: 'text', required: true },
      { key: 'practice_name', name: 'Practice Name', description: 'Name of the vision practice', type: 'text', required: true, defaultValue: 'Vision Care Center' },
      { key: 'practice_phone', name: 'Practice Phone', description: 'Main phone number', type: 'text', required: true },
      { key: 'practice_address', name: 'Practice Address', description: 'Full practice address', type: 'text', required: true },
      { key: 'practice_website', name: 'Practice Website', description: 'Practice website URL', type: 'text', required: false },
      { key: 'insurance_carrier', name: 'Insurance Carrier', description: 'Customer insurance provider', type: 'text', required: false }
    ],
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'system',
    usageCount: 245,
    tags: ['welcome', 'onboarding', 'customer-journey']
  },
  {
    id: 'appointment-reminder-email',
    name: 'Appointment Reminder Email',
    type: 'email',
    category: 'reminder',
    subject: 'Reminder: Your eye exam appointment on {{appointment_date}}',
    content: `Dear {{customer_name}},

This is a friendly reminder about your upcoming appointment:

📅 Date: {{appointment_date}}
⏰ Time: {{appointment_time}}
👨‍⚕️ Provider: {{provider_name}}
📍 Location: {{practice_address}}

What to bring:
✓ Photo ID
✓ Insurance card
✓ Current glasses/contacts
✓ List of current medications

{{#if insurance_verification_needed}}
⚠️ Please note: We're still verifying your insurance benefits. Please bring your insurance card to ensure smooth processing.
{{/if}}

If you need to reschedule or cancel, please call us at {{practice_phone}} or use our online portal at least 24 hours in advance.

We look forward to seeing you!

Best regards,
{{practice_name}}

---
Need directions? {{practice_address}}
Questions? Call {{practice_phone}}`,
    variables: [
      { key: 'customer_name', name: 'Customer Name', description: 'Full name of the customer', type: 'text', required: true },
      { key: 'appointment_date', name: 'Appointment Date', description: 'Date of the appointment', type: 'date', required: true },
      { key: 'appointment_time', name: 'Appointment Time', description: 'Time of the appointment', type: 'text', required: true },
      { key: 'provider_name', name: 'Provider Name', description: 'Name of the eye care provider', type: 'text', required: true },
      { key: 'practice_name', name: 'Practice Name', description: 'Name of the vision practice', type: 'text', required: true },
      { key: 'practice_phone', name: 'Practice Phone', description: 'Main phone number', type: 'text', required: true },
      { key: 'practice_address', name: 'Practice Address', description: 'Full practice address', type: 'text', required: true },
      { key: 'insurance_verification_needed', name: 'Insurance Verification Needed', description: 'Whether insurance verification is pending', type: 'boolean', required: false }
    ],
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'system',
    usageCount: 1420,
    tags: ['appointment', 'reminder', 'customer-service']
  },
  {
    id: 'insurance-expiring-sms',
    name: 'Insurance Benefits Expiring SMS',
    type: 'sms',
    category: 'insurance',
    content: `Hi {{customer_name}}! Your {{insurance_carrier}} benefits expire on {{expiry_date}}. Schedule your eye exam before you lose coverage. Call {{practice_phone}} or book online. - {{practice_name}}`,
    variables: [
      { key: 'customer_name', name: 'Customer Name', description: 'First name of the customer', type: 'text', required: true },
      { key: 'insurance_carrier', name: 'Insurance Carrier', description: 'Name of insurance provider', type: 'text', required: true },
      { key: 'expiry_date', name: 'Expiry Date', description: 'Insurance expiration date', type: 'date', required: true },
      { key: 'practice_phone', name: 'Practice Phone', description: 'Main phone number', type: 'text', required: true },
      { key: 'practice_name', name: 'Practice Name', description: 'Name of the vision practice', type: 'text', required: true }
    ],
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'system',
    usageCount: 89,
    tags: ['insurance', 'urgency', 'revenue-protection']
  },
  {
    id: 'birthday-promotion-email',
    name: 'Birthday Promotion Email',
    type: 'email',
    category: 'birthday',
    subject: '🎉 Happy Birthday {{customer_name}}! Special Gift Inside',
    content: `Happy Birthday {{customer_name}}! 🎂

Another year older, another year wiser... and another year to see the world clearly!

As our gift to you, enjoy these exclusive birthday benefits:

🎁 20% off your next frame purchase
👓 Free lens upgrades (up to $100 value)
🔍 Complimentary comprehensive eye exam
💝 Special birthday pricing on designer collections

Your birthday gift is valid through {{expiry_date}}, so don't wait too long to treat yourself!

{{#if last_exam_overdue}}
PS: It's been over a year since your last eye exam. Why not combine your birthday treat with taking care of your vision health?
{{/if}}

Ready to celebrate? Call {{practice_phone}} or book online to schedule your appointment.

Wishing you a fantastic year ahead!

The {{practice_name}} Family

---
*Offers cannot be combined with insurance benefits. Valid through {{expiry_date}}.*`,
    variables: [
      { key: 'customer_name', name: 'Customer Name', description: 'First name of the customer', type: 'text', required: true },
      { key: 'expiry_date', name: 'Offer Expiry Date', description: 'When the birthday offer expires', type: 'date', required: true },
      { key: 'practice_name', name: 'Practice Name', description: 'Name of the vision practice', type: 'text', required: true },
      { key: 'practice_phone', name: 'Practice Phone', description: 'Main phone number', type: 'text', required: true },
      { key: 'last_exam_overdue', name: 'Last Exam Overdue', description: 'Whether the customer is overdue for an exam', type: 'boolean', required: false }
    ],
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'system',
    usageCount: 156,
    tags: ['birthday', 'promotion', 'customer-retention', 'seasonal']
  },
  {
    id: 'prescription-ready-sms',
    name: 'Prescription Ready for Pickup SMS',
    type: 'sms',
    category: 'follow-up',
    content: `Great news {{customer_name}}! Your new {{item_type}} are ready for pickup at {{practice_name}}. We're open {{hours}}. Questions? Call {{practice_phone}}.`,
    variables: [
      { key: 'customer_name', name: 'Customer Name', description: 'First name of the customer', type: 'text', required: true },
      { key: 'item_type', name: 'Item Type', description: 'Type of item ready (glasses, contacts, etc.)', type: 'text', required: true },
      { key: 'practice_name', name: 'Practice Name', description: 'Name of the vision practice', type: 'text', required: true },
      { key: 'hours', name: 'Business Hours', description: 'Store hours for pickup', type: 'text', required: true },
      { key: 'practice_phone', name: 'Practice Phone', description: 'Main phone number', type: 'text', required: true }
    ],
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'system',
    usageCount: 890,
    tags: ['pickup', 'notification', 'customer-service']
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const category = searchParams.get('category')
    const active = searchParams.get('active')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let filteredTemplates = [...mockTemplates]

    // Apply filters
    if (type) {
      filteredTemplates = filteredTemplates.filter(t => t.type === type)
    }

    if (category) {
      filteredTemplates = filteredTemplates.filter(t => t.category === category)
    }

    if (active !== null) {
      const isActive = active === 'true'
      filteredTemplates = filteredTemplates.filter(t => t.active === isActive)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      filteredTemplates = filteredTemplates.filter(t =>
        t.name.toLowerCase().includes(searchLower) ||
        t.content.toLowerCase().includes(searchLower) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }

    // Sort by usage count (most used first) and then by name
    filteredTemplates.sort((a, b) => {
      if (b.usageCount !== a.usageCount) {
        return b.usageCount - a.usageCount
      }
      return a.name.localeCompare(b.name)
    })

    // Apply pagination
    const total = filteredTemplates.length
    const templates = filteredTemplates.slice(offset, offset + limit)

    // Calculate usage statistics
    const stats = {
      total,
      active: filteredTemplates.filter(t => t.active).length,
      byType: {
        email: filteredTemplates.filter(t => t.type === 'email').length,
        sms: filteredTemplates.filter(t => t.type === 'sms').length,
        voice: filteredTemplates.filter(t => t.type === 'voice').length
      },
      byCategory: {
        welcome: filteredTemplates.filter(t => t.category === 'welcome').length,
        appointment: filteredTemplates.filter(t => t.category === 'appointment').length,
        reminder: filteredTemplates.filter(t => t.category === 'reminder').length,
        'follow-up': filteredTemplates.filter(t => t.category === 'follow-up').length,
        promotion: filteredTemplates.filter(t => t.category === 'promotion').length,
        insurance: filteredTemplates.filter(t => t.category === 'insurance').length,
        birthday: filteredTemplates.filter(t => t.category === 'birthday').length,
        seasonal: filteredTemplates.filter(t => t.category === 'seasonal').length
      },
      totalUsage: filteredTemplates.reduce((sum, t) => sum + t.usageCount, 0)
    }

    return NextResponse.json({
      success: true,
      data: {
        templates,
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
    console.error('Templates API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch templates'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      type,
      category,
      subject,
      content,
      variables = [],
      active = true,
      tags = []
    } = body

    // Validate required fields
    if (!name || !type || !category || !content) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, type, category, content'
      }, { status: 400 })
    }

    // Validate type and category
    const validTypes = ['email', 'sms', 'voice']
    const validCategories = ['welcome', 'appointment', 'reminder', 'follow-up', 'promotion', 'insurance', 'birthday', 'seasonal']

    if (!validTypes.includes(type)) {
      return NextResponse.json({
        success: false,
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}`
      }, { status: 400 })
    }

    if (!validCategories.includes(category)) {
      return NextResponse.json({
        success: false,
        error: `Invalid category. Must be one of: ${validCategories.join(', ')}`
      }, { status: 400 })
    }

    // Email templates require a subject
    if (type === 'email' && !subject) {
      return NextResponse.json({
        success: false,
        error: 'Email templates require a subject'
      }, { status: 400 })
    }

    // Create new template
    const newTemplate: CommunicationTemplate = {
      id: `template-${Date.now()}`,
      name,
      type,
      category,
      subject,
      content,
      variables,
      active,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'current-user', // In real app, get from authentication
      usageCount: 0,
      tags
    }

    // In a real application, save to database
    mockTemplates.push(newTemplate)

    return NextResponse.json({
      success: true,
      data: newTemplate
    }, { status: 201 })
  } catch (error) {
    console.error('Create template error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create template'
    }, { status: 500 })
  }
}