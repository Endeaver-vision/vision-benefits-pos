'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PrescriptionDetails } from '@/types/prescription'
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Calendar, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Edit,
  Trash2,
  Copy,
  Glasses,
  StethoscopeIcon as Doctor
} from 'lucide-react'

interface PrescriptionStats {
  total: number
  valid: number
  expired: number
  expiringSoon: number
  byType: Record<string, number>
  byDoctor: Record<string, number>
}

export default function PrescriptionManagement() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionDetails[]>([])
  const [stats, setStats] = useState<PrescriptionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      })

      if (searchTerm) params.append('search', searchTerm)
      if (selectedType !== 'all') params.append('prescriptionType', selectedType)
      if (selectedStatus !== 'all') params.append('validityStatus', selectedStatus)
      if (selectedDoctor !== 'all') params.append('doctorId', selectedDoctor)

      const response = await fetch(`/api/prescriptions?${params}`)
      const data = await response.json()

      if (data.success) {
        setPrescriptions(data.data || [])
        setPagination(data.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0
        })
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch prescriptions:', error)
    } finally {
      setLoading(false)
    }
  }, [searchTerm, selectedType, selectedStatus, selectedDoctor, pagination.page, pagination.limit])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchPrescriptions()
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [fetchPrescriptions])

  const getStatusBadgeColor = (prescription: PrescriptionDetails & { isExpired?: boolean; isExpiringSoon?: boolean; isValid?: boolean }) => {
    if (prescription.isExpired) {
      return 'bg-red-100 text-red-800'
    } else if (prescription.isExpiringSoon) {
      return 'bg-yellow-100 text-yellow-800'
    } else if (prescription.isValid) {
      return 'bg-green-100 text-green-800'
    }
    return 'bg-gray-100 text-gray-800'
  }

  const getStatusIcon = (prescription: PrescriptionDetails & { isExpired?: boolean; isExpiringSoon?: boolean; isValid?: boolean }) => {
    if (prescription.isExpired) {
      return <AlertTriangle className="h-4 w-4 text-red-600" />
    } else if (prescription.isExpiringSoon) {
      return <Clock className="h-4 w-4 text-yellow-600" />
    } else if (prescription.isValid) {
      return <CheckCircle className="h-4 w-4 text-green-600" />
    }
    return <FileText className="h-4 w-4 text-gray-600" />
  }

  const getTypeBadgeColor = (type: string) => {
    const colors = {
      distance: 'bg-blue-100 text-blue-800',
      reading: 'bg-purple-100 text-purple-800',
      progressive: 'bg-indigo-100 text-indigo-800',
      bifocal: 'bg-teal-100 text-teal-800',
      computer: 'bg-orange-100 text-orange-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatPrescriptionType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  const formatEyeMeasurement = (eye: { sphere?: number; cylinder?: number; axis?: number; addition?: number }) => {
    const parts = []
    if (eye.sphere !== undefined) parts.push(`SPH: ${eye.sphere > 0 ? '+' : ''}${eye.sphere}`)
    if (eye.cylinder) parts.push(`CYL: ${eye.cylinder > 0 ? '+' : ''}${eye.cylinder}`)
    if (eye.axis) parts.push(`AXIS: ${eye.axis}°`)
    if (eye.addition) parts.push(`ADD: +${eye.addition}`)
    return parts.join(' | ')
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prescription Management</h1>
          <p className="text-muted-foreground">
            Manage customer prescriptions, track validity, and create orders
          </p>
        </div>
        <Button className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>New Prescription</span>
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Prescriptions</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                Active prescriptions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valid</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.valid}</div>
              <p className="text-xs text-muted-foreground">
                Currently valid
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.expiringSoon}</div>
              <p className="text-xs text-muted-foreground">
                Within 90 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
              <p className="text-xs text-muted-foreground">
                Need renewal
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search prescriptions..."
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
                <SelectItem value="distance">Distance</SelectItem>
                <SelectItem value="reading">Reading</SelectItem>
                <SelectItem value="progressive">Progressive</SelectItem>
                <SelectItem value="bifocal">Bifocal</SelectItem>
                <SelectItem value="computer">Computer</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="valid">Valid</SelectItem>
                <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
              <SelectTrigger>
                <SelectValue placeholder="All doctors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Doctors</SelectItem>
                <SelectItem value="dr_001">Dr. Sarah Johnson</SelectItem>
                <SelectItem value="dr_002">Dr. Michael Chen</SelectItem>
                <SelectItem value="dr_003">Dr. Amanda Rodriguez</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Prescriptions List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Prescriptions ({pagination?.total || 0} total)</CardTitle>
              <CardDescription>
                View and manage customer prescriptions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {prescriptions.map((prescription: PrescriptionDetails & { 
              isExpired?: boolean; 
              isExpiringSoon?: boolean; 
              isValid?: boolean;
              customerName?: string;
            }) => (
              <div key={prescription.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(prescription)}
                        <h3 className="font-semibold text-lg">{prescription.customerName}</h3>
                      </div>
                      <Badge className={getStatusBadgeColor(prescription)}>
                        {prescription.isExpired ? 'Expired' : 
                         prescription.isExpiringSoon ? 'Expiring Soon' : 'Valid'}
                      </Badge>
                      <Badge className={getTypeBadgeColor(prescription.prescriptionType)}>
                        {formatPrescriptionType(prescription.prescriptionType)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      {/* Right Eye */}
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-sm font-medium">
                          <Eye className="h-4 w-4 text-blue-600" />
                          <span>Right Eye (OD)</span>
                        </div>
                        <div className="text-sm text-gray-600 ml-6">
                          {formatEyeMeasurement(prescription.rightEye)}
                        </div>
                      </div>

                      {/* Left Eye */}
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-sm font-medium">
                          <Eye className="h-4 w-4 text-green-600" />
                          <span>Left Eye (OS)</span>
                        </div>
                        <div className="text-sm text-gray-600 ml-6">
                          {formatEyeMeasurement(prescription.leftEye)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Doctor className="h-4 w-4" />
                        <span>{prescription.prescribingDoctor.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>Prescribed: {formatDate(prescription.prescriptionDate)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>Expires: {formatDate(prescription.expirationDate)}</span>
                      </div>
                    </div>

                    {prescription.pd && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">PD:</span> {prescription.pd.total}mm
                        {prescription.pd.near && ` (Near: ${prescription.pd.near}mm)`}
                      </div>
                    )}

                    {prescription.notes && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Notes:</span> {prescription.notes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" className="flex items-center space-x-1">
                      <Glasses className="h-4 w-4" />
                      <span>Create Order</span>
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {prescriptions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No prescriptions found matching the current filters.
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline"
                disabled={pagination.page <= 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <div className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </div>
              <Button
                variant="outline"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}