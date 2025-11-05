export interface CommunicationTemplate {
  id: string
  name: string
  type: 'email' | 'sms' | 'voice'
  category: 'welcome' | 'appointment' | 'reminder' | 'follow-up' | 'promotion' | 'insurance' | 'birthday' | 'seasonal'
  subject?: string // For emails
  content: string
  variables: TemplateVariable[]
  active: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
  lastUsed?: string
  usageCount: number
  tags: string[]
}

export interface TemplateVariable {
  key: string
  name: string
  description: string
  type: 'text' | 'number' | 'date' | 'boolean'
  required: boolean
  defaultValue?: string
  placeholder?: string
}

export interface CommunicationMessage {
  id: string
  customerId: string
  templateId?: string
  type: 'email' | 'sms' | 'voice'
  recipient: {
    name: string
    email?: string
    phone?: string
  }
  subject?: string
  content: string
  status: 'draft' | 'scheduled' | 'sent' | 'delivered' | 'failed' | 'opened' | 'clicked'
  scheduledAt?: string
  sentAt?: string
  deliveredAt?: string
  openedAt?: string
  clickedAt?: string
  errorMessage?: string
  campaignId?: string
  metadata?: Record<string, string | number | boolean>
  createdAt: string
  createdBy: string
}

export interface CommunicationCampaign {
  id: string
  name: string
  description: string
  type: 'one-time' | 'recurring' | 'automated'
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'
  
  // Target audience
  audienceFilters: CampaignAudienceFilter[]
  estimatedReach: number
  
  // Content
  templateId: string
  customizations?: Record<string, string | number | boolean>
  
  // Scheduling
  scheduleType: 'immediate' | 'scheduled' | 'recurring'
  scheduledAt?: string
  recurringPattern?: RecurringPattern
  timezone: string
  
  // Performance tracking
  stats: CampaignStats
  
  // Metadata
  createdAt: string
  updatedAt: string
  createdBy: string
  tags: string[]
}

export interface CampaignAudienceFilter {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'exists' | 'not_exists'
  value: string | number | boolean | string[]
  label: string
}

export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number // Every X days/weeks/months/years
  daysOfWeek?: number[] // For weekly: 0=Sunday, 1=Monday, etc.
  dayOfMonth?: number // For monthly: 1-31
  endDate?: string
  maxOccurrences?: number
}

export interface CampaignStats {
  totalSent: number
  delivered: number
  opened: number
  clicked: number
  failed: number
  unsubscribed: number
  deliveryRate: number // delivered/totalSent
  openRate: number // opened/delivered
  clickRate: number // clicked/opened
  unsubscribeRate: number // unsubscribed/delivered
  revenue?: number
  roi?: number
}

export interface AutomationTrigger {
  id: string
  name: string
  description: string
  type: 'customer_created' | 'appointment_scheduled' | 'appointment_completed' | 'purchase_made' | 'insurance_expiring' | 'birthday' | 'inactivity' | 'custom'
  active: boolean
  
  // Trigger conditions
  conditions: TriggerCondition[]
  
  // Actions to perform
  actions: TriggerAction[]
  
  // Timing
  delay?: number // Minutes to wait before executing
  timeWindow?: {
    start: string // HH:MM
    end: string // HH:MM
    timezone: string
    daysOfWeek: number[]
  }
  
  // Stats
  stats: {
    totalTriggered: number
    successfulExecutions: number
    failedExecutions: number
    lastTriggered?: string
  }
  
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface TriggerCondition {
  field: string
  operator: string
  value: string | number | boolean | string[]
  label: string
}

export interface TriggerAction {
  type: 'send_template' | 'create_task' | 'update_customer' | 'schedule_appointment' | 'add_tag'
  config: Record<string, string | number | boolean>
}

export interface AppointmentSlot {
  id: string
  providerId: string
  providerName: string
  date: string
  startTime: string
  endTime: string
  duration: number // minutes
  type: 'exam' | 'fitting' | 'consultation' | 'follow-up' | 'pickup'
  available: boolean
  customerId?: string
  customerName?: string
  status: 'available' | 'booked' | 'blocked' | 'completed' | 'no-show' | 'cancelled'
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface AppointmentBooking {
  id: string
  customerId: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  slotId: string
  providerId: string
  providerName: string
  date: string
  startTime: string
  endTime: string
  type: 'exam' | 'fitting' | 'consultation' | 'follow-up' | 'pickup'
  status: 'scheduled' | 'confirmed' | 'completed' | 'no-show' | 'cancelled' | 'rescheduled'
  
  // Reminders
  remindersSent: AppointmentReminder[]
  
  // Notes and requirements
  notes?: string
  specialRequirements?: string[]
  insuranceVerified?: boolean
  
  // Related records
  quoteId?: string
  prescriptionId?: string
  
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface AppointmentReminder {
  type: 'email' | 'sms' | 'voice'
  scheduledAt: string
  sentAt?: string
  status: 'scheduled' | 'sent' | 'failed'
  templateId: string
}

export interface CommunicationPreference {
  customerId: string
  emailEnabled: boolean
  smsEnabled: boolean
  voiceEnabled: boolean
  
  // Frequency preferences
  appointmentReminders: boolean
  promotionalMessages: boolean
  educationalContent: boolean
  insuranceUpdates: boolean
  birthdayMessages: boolean
  
  // Timing preferences
  preferredContactTime: {
    start: string // HH:MM
    end: string // HH:MM
    timezone: string
  }
  preferredDays: number[] // 0=Sunday, 1=Monday, etc.
  
  // Opt-out tracking
  unsubscribedFrom: string[] // List of campaign types
  unsubscribedAt?: string
  
  updatedAt: string
}

export interface CommunicationAnalytics {
  period: {
    start: string
    end: string
  }
  
  // Overall metrics
  totalMessages: number
  totalCampaigns: number
  totalCustomersReached: number
  
  // By channel
  byChannel: {
    email: ChannelStats
    sms: ChannelStats
    voice: ChannelStats
  }
  
  // By category
  byCategory: Record<string, ChannelStats>
  
  // Performance trends
  trends: {
    date: string
    sent: number
    delivered: number
    opened: number
    clicked: number
  }[]
  
  // Top performing templates
  topTemplates: {
    templateId: string
    templateName: string
    sent: number
    openRate: number
    clickRate: number
  }[]
  
  // Customer engagement
  customerEngagement: {
    highlyEngaged: number
    moderatelyEngaged: number
    lowEngagement: number
    unsubscribed: number
  }
}

export interface ChannelStats {
  sent: number
  delivered: number
  opened: number
  clicked: number
  failed: number
  deliveryRate: number
  openRate: number
  clickRate: number
}

export interface MarketingCampaign {
  id: string
  name: string
  description: string
  type: 'promotion' | 'product_launch' | 'educational' | 'retention' | 'reactivation' | 'seasonal'
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled'
  
  targetAudience: {
    customerSegments: string[]
    demographics?: {
      ageRange?: [number, number]
      location?: string[]
      hasChildren?: boolean
    }
    behaviors?: {
      lastVisit?: string
      purchaseHistory?: string
      engagementLevel?: 'high' | 'medium' | 'low'
    }
  }
  
  content: {
    subject: string
    preheader?: string
    templateId: string
    personalizations?: Record<string, string>
  }
  
  schedule: {
    startDate: string
    endDate: string
    sendTime: string
    timezone: string
    frequency?: 'once' | 'daily' | 'weekly' | 'bi-weekly' | 'monthly'
  }
  
  channels: ('email' | 'sms' | 'direct_mail' | 'phone')[]
  
  budget: {
    allocated: number
    spent: number
  }
  
  metrics: {
    sent: number
    delivered: number
    opened: number
    clicked: number
    converted: number
    revenue: number
    roi: number
  }
  
  createdBy: string
  createdAt: string
  updatedAt: string
}