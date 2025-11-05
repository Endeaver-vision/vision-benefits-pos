'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { CommunicationTemplate } from '@/types/communication'
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Copy, 
  Trash2, 
  Mail, 
  MessageSquare, 
  Phone,
  Users,
  TrendingUp,
  Calendar,
  Gift,
  AlertTriangle
} from 'lucide-react'

interface TemplateStats {
  total: number
  active: number
  byType: {
    email: number
    sms: number
    voice: number
  }
  byCategory: {
    welcome: number
    appointment: number
    reminder: number
    'follow-up': number
    promotion: number
    insurance: number
    birthday: number
    seasonal: number
  }
  totalUsage: number
}

export default function TemplateManagement() {
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([])
  const [stats, setStats] = useState<TemplateStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplate | null>(null)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedType !== 'all') params.append('type', selectedType)
      if (selectedCategory !== 'all') params.append('category', selectedCategory)
      if (searchTerm) params.append('search', searchTerm)

      const response = await fetch(`/api/communication/templates?${params}`)
      const data = await response.json()

      if (data.success) {
        setTemplates(data.data.templates)
        setStats(data.data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    } finally {
      setLoading(false)
    }
  }, [searchTerm, selectedType, selectedCategory])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchTemplates()
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [fetchTemplates])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'sms':
        return <MessageSquare className="h-4 w-4" />
      case 'voice':
        return <Phone className="h-4 w-4" />
      default:
        return <Mail className="h-4 w-4" />
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'welcome':
        return <Users className="h-4 w-4 text-green-600" />
      case 'appointment':
      case 'reminder':
        return <Calendar className="h-4 w-4 text-blue-600" />
      case 'promotion':
      case 'birthday':
        return <Gift className="h-4 w-4 text-purple-600" />
      case 'insurance':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      default:
        return <TrendingUp className="h-4 w-4 text-gray-600" />
    }
  }

  const getCategoryBadgeColor = (category: string) => {
    const colors = {
      welcome: 'bg-green-100 text-green-800',
      appointment: 'bg-blue-100 text-blue-800',
      reminder: 'bg-blue-100 text-blue-800',
      'follow-up': 'bg-indigo-100 text-indigo-800',
      promotion: 'bg-purple-100 text-purple-800',
      insurance: 'bg-orange-100 text-orange-800',
      birthday: 'bg-pink-100 text-pink-800',
      seasonal: 'bg-amber-100 text-amber-800'
    }
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const handlePreview = (template: CommunicationTemplate) => {
    setSelectedTemplate(template)
    setIsPreviewModalOpen(true)
  }

  const handleEdit = (template: CommunicationTemplate) => {
    setSelectedTemplate(template)
    // In a real app, this would open an edit modal
    console.log('Edit template:', template.name)
  }

  const handleDuplicate = async (template: CommunicationTemplate) => {
    try {
      const duplicatedTemplate = {
        ...template,
        name: `${template.name} (Copy)`,
        id: undefined // Let the API generate a new ID
      }

      const response = await fetch('/api/communication/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicatedTemplate)
      })

      if (response.ok) {
        fetchTemplates()
      }
    } catch (error) {
      console.error('Failed to duplicate template:', error)
    }
  }

  const handleToggleActive = async (template: CommunicationTemplate) => {
    try {
      const updatedTemplate = { ...template, active: !template.active }
      
      const response = await fetch(`/api/communication/templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: updatedTemplate.active })
      })

      if (response.ok) {
        fetchTemplates()
      }
    } catch (error) {
      console.error('Failed to update template:', error)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Communication Templates</h1>
          <p className="text-gray-600">Manage email, SMS, and voice message templates</p>
        </div>
        <Button 
          onClick={() => {
            setSelectedTemplate(null)
            // In a real app, this would open a create modal
            console.log('Create new template')
          }}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Template</span>
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
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
              <CardTitle className="text-sm font-medium">Email Templates</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byType.email}</div>
              <p className="text-xs text-muted-foreground">
                Most popular type
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">SMS Templates</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byType.sms}</div>
              <p className="text-xs text-muted-foreground">
                Quick notifications
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsage.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Messages sent
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
                placeholder="Search templates..."
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
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="voice">Voice</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="welcome">Welcome</SelectItem>
                <SelectItem value="appointment">Appointment</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
                <SelectItem value="follow-up">Follow-up</SelectItem>
                <SelectItem value="promotion">Promotion</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
                <SelectItem value="birthday">Birthday</SelectItem>
                <SelectItem value="seasonal">Seasonal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates List */}
      <Card>
        <CardHeader>
          <CardTitle>Templates ({templates.length})</CardTitle>
          <CardDescription>
            Manage your communication templates and track their usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {templates.map((template) => (
              <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(template.type)}
                    {getCategoryIcon(template.category)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{template.name}</span>
                      <Badge className={getCategoryBadgeColor(template.category)}>
                        {template.category}
                      </Badge>
                      {!template.active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {template.type === 'email' && template.subject && (
                        <span>Subject: {template.subject.substring(0, 60)}...</span>
                      )}
                      {template.type !== 'email' && (
                        <span>{template.content.substring(0, 80)}...</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      Used {template.usageCount} times • Created {new Date(template.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={template.active}
                    onCheckedChange={() => handleToggleActive(template)}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handlePreview(template)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(template)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}

            {templates.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No templates found matching the current filters.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {selectedTemplate && getTypeIcon(selectedTemplate.type)}
              <span>{selectedTemplate?.name}</span>
            </DialogTitle>
            <DialogDescription>
              Template preview with variables highlighted
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              {selectedTemplate.subject && (
                <div>
                  <Label className="text-sm font-medium">Subject</Label>
                  <div className="p-3 bg-gray-50 rounded border text-sm">
                    {selectedTemplate.subject}
                  </div>
                </div>
              )}
              <div>
                <Label className="text-sm font-medium">Content</Label>
                <div className="p-3 bg-gray-50 rounded border text-sm whitespace-pre-wrap">
                  {selectedTemplate.content}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Variables ({selectedTemplate.variables.length})</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  {selectedTemplate.variables.map((variable) => (
                    <div key={variable.key} className="p-2 bg-blue-50 rounded border text-xs">
                      <div className="font-medium">{`{{${variable.key}}}`}</div>
                      <div className="text-gray-600">{variable.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}