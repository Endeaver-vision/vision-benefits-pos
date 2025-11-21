'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save, User } from 'lucide-react'

export default function NewCustomerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    insuranceCarrier: '',
    memberId: '',
    groupNumber: '',
    eligibilityDate: '',
    notes: ''
  })

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('') // Clear error on input
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!formData.firstName || !formData.lastName) {
      setError('First name and last name are required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (result.success) {
        // Redirect to customer detail page or back to customer list
        router.push(`/customers`)
      } else {
        setError(result.error || 'Failed to create customer')
      }
    } catch (err) {
      setError('An error occurred while creating the customer')
      console.error('Create customer error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Back Button */}
      <Link href="/customers">
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Customers
        </Button>
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <User className="h-8 w-8 text-blue-600" />
          New Customer
        </h1>
        <p className="text-muted-foreground mt-2">
          Create a new customer profile
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={formData.gender} onValueChange={(value) => handleChange('gender', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                      <SelectItem value="PREFER_NOT_TO_SAY">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle>Address Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    maxLength={2}
                    placeholder="CA"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => handleChange('zipCode', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Insurance Information */}
          <Card>
            <CardHeader>
              <CardTitle>Insurance Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="insuranceCarrier">Insurance Carrier</Label>
                <Select value={formData.insuranceCarrier} onValueChange={(value) => handleChange('insuranceCarrier', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select insurance carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VSP">VSP</SelectItem>
                    <SelectItem value="EyeMed">EyeMed</SelectItem>
                    <SelectItem value="Spectera">Spectera</SelectItem>
                    <SelectItem value="Davis Vision">Davis Vision</SelectItem>
                    <SelectItem value="Medicare">Medicare</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                    <SelectItem value="None">None / Self Pay</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="memberId">Member ID</Label>
                  <Input
                    id="memberId"
                    value={formData.memberId}
                    onChange={(e) => handleChange('memberId', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="groupNumber">Group Number</Label>
                  <Input
                    id="groupNumber"
                    value={formData.groupNumber}
                    onChange={(e) => handleChange('groupNumber', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="eligibilityDate">Eligibility Date</Label>
                <Input
                  id="eligibilityDate"
                  type="date"
                  value={formData.eligibilityDate}
                  onChange={(e) => handleChange('eligibilityDate', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={4}
                placeholder="Any additional notes about the customer..."
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to exit without saving? All changes will be lost.')) {
                      router.push('/customers')
                    }
                  }}
                  disabled={loading}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Exit Without Saving
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="h-5 w-5 mr-2" />
                  {loading ? 'Saving Customer...' : 'Save Customer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
