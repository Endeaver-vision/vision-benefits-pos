import { NextRequest, NextResponse } from 'next/server'
import { MarketingCampaign } from '@/types/communication'

// Mock campaign data
const mockCampaigns: MarketingCampaign[] = [
  {
    id: '1',
    name: 'Spring Eye Exam Promotion',
    description: 'Annual spring promotion for comprehensive eye exams with 20% discount',
    type: 'promotion',
    status: 'active',
    targetAudience: {
      customerSegments: ['regular', 'inactive'],
      demographics: {
        ageRange: [25, 65],
        location: ['city', 'suburban']
      },
      behaviors: {
        lastVisit: '6-months-ago',
        purchaseHistory: 'eye-exams'
      }
    },
    content: {
      subject: 'Spring Into Better Vision - 20% Off Eye Exams!',
      preheader: 'Book your comprehensive eye exam today',
      templateId: '1'
    },
    schedule: {
      startDate: '2024-03-01',
      endDate: '2024-04-30',
      sendTime: '10:00',
      timezone: 'America/New_York',
      frequency: 'weekly'
    },
    channels: ['email', 'sms'],
    budget: {
      allocated: 5000,
      spent: 1250
    },
    metrics: {
      sent: 2500,
      delivered: 2450,
      opened: 1225,
      clicked: 245,
      converted: 49,
      revenue: 9800,
      roi: 196
    },
    createdBy: 'marketing_team',
    createdAt: '2024-02-15T10:00:00Z',
    updatedAt: '2024-03-15T14:30:00Z'
  },
  {
    id: '2',
    name: 'Back to School Glasses',
    description: 'Children\'s eyewear campaign targeting parents for school season',
    type: 'product_launch',
    status: 'scheduled',
    targetAudience: {
      customerSegments: ['parents'],
      demographics: {
        ageRange: [28, 45],
        hasChildren: true
      },
      behaviors: {
        purchaseHistory: 'children-glasses'
      }
    },
    content: {
      subject: 'Get Your Kids Ready for School - New Frames Collection',
      preheader: 'Durable and stylish frames for active kids',
      templateId: '2'
    },
    schedule: {
      startDate: '2024-07-15',
      endDate: '2024-09-15',
      sendTime: '15:00',
      timezone: 'America/New_York',
      frequency: 'bi-weekly'
    },
    channels: ['email'],
    budget: {
      allocated: 3000,
      spent: 0
    },
    metrics: {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      converted: 0,
      revenue: 0,
      roi: 0
    },
    createdBy: 'marketing_team',
    createdAt: '2024-06-01T09:00:00Z',
    updatedAt: '2024-06-01T09:00:00Z'
  },
  {
    id: '3',
    name: 'Lens Technology Update',
    description: 'Educational campaign about new progressive lens technology',
    type: 'educational',
    status: 'completed',
    targetAudience: {
      customerSegments: ['premium'],
      demographics: {
        ageRange: [40, 70]
      },
      behaviors: {
        purchaseHistory: 'progressive-lenses'
      }
    },
    content: {
      subject: 'Revolutionary Progressive Lens Technology is Here',
      preheader: 'Experience clearer vision at all distances',
      templateId: '3'
    },
    schedule: {
      startDate: '2024-01-15',
      endDate: '2024-02-29',
      sendTime: '11:00',
      timezone: 'America/New_York',
      frequency: 'monthly'
    },
    channels: ['email', 'direct_mail'],
    budget: {
      allocated: 2500,
      spent: 2400
    },
    metrics: {
      sent: 1800,
      delivered: 1760,
      opened: 880,
      clicked: 176,
      converted: 35,
      revenue: 14000,
      roi: 483
    },
    createdBy: 'marketing_team',
    createdAt: '2024-01-01T08:00:00Z',
    updatedAt: '2024-03-01T16:00:00Z'
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const search = searchParams.get('search')

    let filteredCampaigns = [...mockCampaigns]

    // Apply filters
    if (status && status !== 'all') {
      filteredCampaigns = filteredCampaigns.filter(campaign => campaign.status === status)
    }

    if (type && type !== 'all') {
      filteredCampaigns = filteredCampaigns.filter(campaign => campaign.type === type)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      filteredCampaigns = filteredCampaigns.filter(campaign =>
        campaign.name.toLowerCase().includes(searchLower) ||
        campaign.description.toLowerCase().includes(searchLower)
      )
    }

    // Calculate statistics
    const stats = {
      total: filteredCampaigns.length,
      active: filteredCampaigns.filter(c => c.status === 'active').length,
      scheduled: filteredCampaigns.filter(c => c.status === 'scheduled').length,
      completed: filteredCampaigns.filter(c => c.status === 'completed').length,
      totalBudget: filteredCampaigns.reduce((sum, c) => sum + c.budget.allocated, 0),
      totalSpent: filteredCampaigns.reduce((sum, c) => sum + c.budget.spent, 0),
      totalRevenue: filteredCampaigns.reduce((sum, c) => sum + c.metrics.revenue, 0),
      averageROI: filteredCampaigns.length > 0 
        ? filteredCampaigns.reduce((sum, c) => sum + c.metrics.roi, 0) / filteredCampaigns.length 
        : 0
    }

    return NextResponse.json({
      success: true,
      data: {
        campaigns: filteredCampaigns,
        stats
      }
    })
  } catch (error) {
    console.error('Error fetching marketing campaigns:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch marketing campaigns'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const campaignData = await request.json()

    // In a real implementation, this would save to a database
    const newCampaign: MarketingCampaign = {
      id: (mockCampaigns.length + 1).toString(),
      ...campaignData,
      status: 'draft',
      metrics: {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        converted: 0,
        revenue: 0,
        roi: 0
      },
      createdBy: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: newCampaign,
      message: 'Marketing campaign created successfully'
    })
  } catch (error) {
    console.error('Error creating marketing campaign:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create marketing campaign'
      },
      { status: 500 }
    )
  }
}