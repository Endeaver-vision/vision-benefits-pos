'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { AutomationTrigger } from '@/types/communication'
import { 
  Plus, 
  Search, 
  Filter, 
  Play, 
  Pause, 
  Settings,
  TrendingUp,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Calendar,
  Gift,
  AlertTriangle,
  UserPlus,
  ShoppingCart,
  Timer
} from 'lucide-react'

interface AutomationStats {
  total: number
  active: number
  byType: Record<string, number>
  totalExecutions: number
  successRate: number
}

export default function AutomationWorkflows() {
  const [triggers, setTriggers] = useState<AutomationTrigger[]>([])
  const [stats, setStats] = useState<AutomationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  const fetchTriggers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedType !== 'all') params.append('type', selectedType)
      if (selectedStatus !== 'all') params.append('active', selectedStatus)
      if (searchTerm) params.append('search', searchTerm)

      const response = await fetch(`/api/communication/automation?${params}`)
      const data = await response.json()

      if (data.success) {
        setTriggers(data.data.triggers)
        setStats(data.data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch automation triggers:', error)
    } finally {
      setLoading(false)
    }
  }, [searchTerm, selectedType, selectedStatus])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchTriggers()
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [fetchTriggers])

  const getTriggerTypeIcon = (type: string) => {
    switch (type) {
      case 'customer_created':
        return <UserPlus className="h-4 w-4 text-green-600" />
      case 'appointment_scheduled':
      case 'appointment_completed':
        return <Calendar className="h-4 w-4 text-blue-600" />
      case 'purchase_made':
        return <ShoppingCart className="h-4 w-4 text-purple-600" />
      case 'insurance_expiring':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'birthday':
        return <Gift className="h-4 w-4 text-pink-600" />
      case 'inactivity':
        return <Timer className="h-4 w-4 text-red-600" />
      default:
        return <Zap className="h-4 w-4 text-gray-600" />
    }
  }

  const getTriggerTypeBadgeColor = (type: string) => {
    const colors = {
      customer_created: 'bg-green-100 text-green-800',
      appointment_scheduled: 'bg-blue-100 text-blue-800',
      appointment_completed: 'bg-blue-100 text-blue-800',
      purchase_made: 'bg-purple-100 text-purple-800',
      insurance_expiring: 'bg-orange-100 text-orange-800',
      birthday: 'bg-pink-100 text-pink-800',
      inactivity: 'bg-red-100 text-red-800',
      custom: 'bg-gray-100 text-gray-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const formatTriggerType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const handleToggleActive = async (trigger: AutomationTrigger) => {
    try {
      const updatedTrigger = { ...trigger, active: !trigger.active }
      
      const response = await fetch(`/api/communication/automation/${trigger.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: updatedTrigger.active })
      })

      if (response.ok) {
        fetchTriggers()
      }
    } catch (error) {
      console.error('Failed to update trigger:', error)
    }
  }

  const getSuccessRate = (trigger: AutomationTrigger) => {
    if (trigger.stats.totalTriggered === 0) return 0
    return (trigger.stats.successfulExecutions / trigger.stats.totalTriggered * 100).toFixed(1)
  }

  const formatTimeWindow = (timeWindow: AutomationTrigger['timeWindow']) => {
    if (!timeWindow) return 'Any time'
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dayNames = timeWindow.daysOfWeek.map(d => days[d]).join(', ')
    
    return `${timeWindow.start}-${timeWindow.end}, ${dayNames}`
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
              <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.active} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalExecutions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Automated actions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Successful executions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Active</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.entries(stats.byType).sort(([,a], [,b]) => b - a)[0]?.[1] || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatTriggerType(Object.entries(stats.byType).sort(([,a], [,b]) => b - a)[0]?.[0] || '')}
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
                placeholder="Search workflows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="customer_created">Customer Created</SelectItem>
                <SelectItem value="appointment_scheduled">Appointment Scheduled</SelectItem>
                <SelectItem value="appointment_completed">Appointment Completed</SelectItem>
                <SelectItem value="purchase_made">Purchase Made</SelectItem>
                <SelectItem value="insurance_expiring">Insurance Expiring</SelectItem>
                <SelectItem value="birthday">Birthday</SelectItem>
                <SelectItem value="inactivity">Inactivity</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Workflows List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Automation Workflows ({triggers.length})</CardTitle>
              <CardDescription>
                Manage automated communication workflows and triggers
              </CardDescription>
            </div>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>New Workflow</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {triggers.map((trigger) => (
              <div key={trigger.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getTriggerTypeIcon(trigger.type)}
                    {trigger.active ? (
                      <Play className="h-4 w-4 text-green-600" />
                    ) : (
                      <Pause className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{trigger.name}</span>
                      <Badge className={getTriggerTypeBadgeColor(trigger.type)}>
                        {formatTriggerType(trigger.type)}
                      </Badge>
                      {!trigger.active && (
                        <Badge variant="secondary">Paused</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {trigger.description}
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>{trigger.stats.totalTriggered.toLocaleString()} executions</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span>{getSuccessRate(trigger)}% success</span>
                      </div>
                      {trigger.stats.failedExecutions > 0 && (
                        <div className="flex items-center space-x-1">
                          <XCircle className="h-3 w-3 text-red-600" />
                          <span>{trigger.stats.failedExecutions} failed</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatTimeWindow(trigger.timeWindow)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={trigger.active}
                    onCheckedChange={() => handleToggleActive(trigger)}
                  />
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {triggers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No automation workflows found matching the current filters.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}