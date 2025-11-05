'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MarketingCampaign } from '@/types/communication'
import { 
  Plus, 
  Search, 
  Filter, 
  Play, 
  Pause, 
  Edit, 
  Copy,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Target,
  BarChart3,
  Mail,
  MessageSquare,
  Phone,
  FileText,
  Eye,
  MousePointer,
  ShoppingCart
} from 'lucide-react'

interface CampaignStats {
  total: number
  active: number
  scheduled: number
  completed: number
  totalBudget: number
  totalSpent: number
  totalRevenue: number
  averageROI: number
}

export default function MarketingCampaigns() {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([])
  const [stats, setStats] = useState<CampaignStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedStatus !== 'all') params.append('status', selectedStatus)
      if (selectedType !== 'all') params.append('type', selectedType)
      if (searchTerm) params.append('search', searchTerm)

      const response = await fetch(`/api/communication/campaigns?${params}`)
      const data = await response.json()

      if (data.success) {
        setCampaigns(data.data.campaigns)
        setStats(data.data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch marketing campaigns:', error)
    } finally {
      setLoading(false)
    }
  }, [searchTerm, selectedStatus, selectedType])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchCampaigns()
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [fetchCampaigns])

  const getStatusBadgeColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getTypeBadgeColor = (type: string) => {
    const colors = {
      promotion: 'bg-orange-100 text-orange-800',
      product_launch: 'bg-purple-100 text-purple-800',
      educational: 'bg-blue-100 text-blue-800',
      retention: 'bg-green-100 text-green-800',
      reactivation: 'bg-yellow-100 text-yellow-800',
      seasonal: 'bg-pink-100 text-pink-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-3 w-3" />
      case 'sms':
        return <MessageSquare className="h-3 w-3" />
      case 'phone':
        return <Phone className="h-3 w-3" />
      case 'direct_mail':
        return <FileText className="h-3 w-3" />
      default:
        return null
    }
  }

  const calculateOpenRate = (campaign: MarketingCampaign) => {
    if (campaign.metrics.delivered === 0) return 0
    return ((campaign.metrics.opened / campaign.metrics.delivered) * 100).toFixed(1)
  }

  const calculateClickRate = (campaign: MarketingCampaign) => {
    if (campaign.metrics.opened === 0) return 0
    return ((campaign.metrics.clicked / campaign.metrics.opened) * 100).toFixed(1)
  }

  const calculateConversionRate = (campaign: MarketingCampaign) => {
    if (campaign.metrics.clicked === 0) return 0
    return ((campaign.metrics.converted / campaign.metrics.clicked) * 100).toFixed(1)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.active} active, {stats.scheduled} scheduled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalBudget)}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(stats.totalSpent)} spent ({((stats.totalSpent / stats.totalBudget) * 100).toFixed(1)}%)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                From campaign conversions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average ROI</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageROI.toFixed(0)}%</div>
              <p className="text-xs text-muted-foreground">
                Return on investment
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="promotion">Promotion</SelectItem>
                <SelectItem value="product_launch">Product Launch</SelectItem>
                <SelectItem value="educational">Educational</SelectItem>
                <SelectItem value="retention">Retention</SelectItem>
                <SelectItem value="reactivation">Reactivation</SelectItem>
                <SelectItem value="seasonal">Seasonal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Marketing Campaigns ({campaigns.length})</CardTitle>
              <CardDescription>
                Manage and track your marketing campaigns and performance
              </CardDescription>
            </div>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>New Campaign</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-lg">{campaign.name}</h3>
                      <Badge className={getStatusBadgeColor(campaign.status)}>
                        {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                      </Badge>
                      <Badge className={getTypeBadgeColor(campaign.type)}>
                        {formatType(campaign.type)}
                      </Badge>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{campaign.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(campaign.schedule.startDate).toLocaleDateString()} - {new Date(campaign.schedule.endDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <DollarSign className="h-3 w-3" />
                        <span>{formatCurrency(campaign.budget.allocated)} budget</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-3 w-3" />
                        <span>{campaign.metrics.sent.toLocaleString()} recipients</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {campaign.channels.map((channel, index) => (
                          <div key={index} className="flex items-center space-x-1">
                            {getChannelIcon(channel)}
                            <span className="capitalize">{channel}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {campaign.status === 'active' ? (
                      <Button variant="ghost" size="sm">
                        <Pause className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm">
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Campaign Metrics */}
                {campaign.metrics.sent > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 pt-3 border-t">
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1 text-xs text-gray-500 mb-1">
                        <Mail className="h-3 w-3" />
                        <span>Sent</span>
                      </div>
                      <div className="font-semibold">{campaign.metrics.sent.toLocaleString()}</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1 text-xs text-gray-500 mb-1">
                        <Eye className="h-3 w-3" />
                        <span>Opened</span>
                      </div>
                      <div className="font-semibold">{campaign.metrics.opened.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">{calculateOpenRate(campaign)}%</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1 text-xs text-gray-500 mb-1">
                        <MousePointer className="h-3 w-3" />
                        <span>Clicked</span>
                      </div>
                      <div className="font-semibold">{campaign.metrics.clicked.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">{calculateClickRate(campaign)}%</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1 text-xs text-gray-500 mb-1">
                        <ShoppingCart className="h-3 w-3" />
                        <span>Converted</span>
                      </div>
                      <div className="font-semibold">{campaign.metrics.converted.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">{calculateConversionRate(campaign)}%</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1 text-xs text-gray-500 mb-1">
                        <DollarSign className="h-3 w-3" />
                        <span>Revenue</span>
                      </div>
                      <div className="font-semibold">{formatCurrency(campaign.metrics.revenue)}</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1 text-xs text-gray-500 mb-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>ROI</span>
                      </div>
                      <div className="font-semibold flex items-center justify-center space-x-1">
                        <span>{campaign.metrics.roi}%</span>
                        {campaign.metrics.roi > 100 ? (
                          <TrendingUp className="h-3 w-3 text-green-600" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-600" />
                        )}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1 text-xs text-gray-500 mb-1">
                        <DollarSign className="h-3 w-3" />
                        <span>Spent</span>
                      </div>
                      <div className="font-semibold">{formatCurrency(campaign.budget.spent)}</div>
                      <div className="text-xs text-gray-500">
                        of {formatCurrency(campaign.budget.allocated)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {campaigns.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No marketing campaigns found matching the current filters.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}