'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  User, 
  Glasses, 
  Eye, 
  Calculator, 
  FileText,
  Mail,
  Download,
  CreditCard,
  CheckCircle,
  Edit,
  Percent
} from 'lucide-react'

// Mock data - in real app this would come from store/props
const mockCustomer = {
  id: 'cust001',
  firstName: 'John',
  lastName: 'Smith',
  email: 'john.smith@email.com',
  phone: '(555) 123-4567',
  insuranceCarrier: 'VSP',
  memberId: 'VSP123456789',
  address: {
    street: '123 Main St',
    city: 'Anytown',
    state: 'CA',
    zipCode: '12345'
  }
}

const mockEyeglassesSelection = {
  frame: {
    brand: 'Ray-Ban',
    model: 'Aviator Classic',
    color: 'Gold',
    price: 180.00,
    style: 'Full-rim',
    material: 'Metal'
  },
  lenses: {
    type: 'Progressive',
    material: 'High-index 1.67',
    price: 250.00
  },
  enhancements: [
    { name: 'Anti-Reflective Coating', price: 75.00 },
    { name: 'Blue Light Filter', price: 50.00 },
    { name: 'Photochromic (Transitions)', price: 120.00 }
  ],
  secondPair: {
    frame: { brand: 'Oakley', model: 'Reading Glasses', price: 120.00 },
    discount: 50.00
  }
}

const mockContactLenses = {
  brand: 'ACUVUE',
  product: 'ACUVUE OASYS 1-Day',
  type: 'Daily',
  quantity: 8,
  annualSupply: true,
  basePrice: 280.00,
  rebate: 100.00,
  fittingFee: 75.00,
  parameters: {
    rightEye: { power: '-2.50', baseCurve: '8.5', diameter: '14.0' },
    leftEye: { power: '-2.75', baseCurve: '8.5', diameter: '14.0' }
  }
}

interface QuoteReviewProps {
  onEdit?: (section: 'customer' | 'exam-services' | 'eyeglasses' | 'contacts') => void
  onFinalize?: () => void
}

export function QuoteReviewLayer({ onEdit, onFinalize }: QuoteReviewProps) {
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [selectedPaymentOption, setSelectedPaymentOption] = useState<'full' | 'insurance' | 'financing'>('insurance')

  // Calculate totals
  const eyeglassesSubtotal = 
    mockEyeglassesSelection.frame.price + 
    mockEyeglassesSelection.lenses.price + 
    mockEyeglassesSelection.enhancements.reduce((sum, enh) => sum + enh.price, 0) +
    (mockEyeglassesSelection.secondPair?.frame.price || 0)

  const eyeglassesDiscounts = mockEyeglassesSelection.secondPair?.discount || 0
  const eyeglassesInsuranceDiscount = 200.00 // Mock VSP discount
  const eyeglassesTotal = eyeglassesSubtotal - eyeglassesDiscounts - eyeglassesInsuranceDiscount

  const contactsSubtotal = mockContactLenses.basePrice + mockContactLenses.fittingFee
  const contactsRebate = mockContactLenses.rebate
  const contactsInsuranceDiscount = 50.00 // Mock VSP contact discount
  const contactsTotal = contactsSubtotal - contactsRebate - contactsInsuranceDiscount

  const orderSubtotal = eyeglassesTotal + contactsTotal
  const tax = orderSubtotal * 0.0875 // 8.75% tax
  const grandTotal = orderSubtotal + tax

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Quote Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Review your complete quote below. You can edit any section or proceed to finalize your order.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {/* Main Review Content */}
        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onEdit?.('customer')}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-lg">
                    {mockCustomer.firstName} {mockCustomer.lastName}
                  </h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div>📧 {mockCustomer.email}</div>
                    <div>📞 {mockCustomer.phone}</div>
                    <div>📍 {mockCustomer.address.street}, {mockCustomer.address.city}, {mockCustomer.address.state} {mockCustomer.address.zipCode}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Insurance Information</h4>
                  <div className="space-y-1">
                    <Badge variant="outline" className="mb-1">
                      {mockCustomer.insuranceCarrier}
                    </Badge>
                    <div className="text-sm text-gray-600">
                      Member ID: {mockCustomer.memberId}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Exam Services */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Exam Services
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onEdit?.('exam-services')}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Comprehensive Eye Exam</h4>
                  <div className="text-sm text-gray-600">
                    <div>• Routine Eye Exam (60 min)</div>
                    <div>• Vision testing & eye health evaluation</div>
                    <div>• Insurance covered with $25 copay</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500 line-through">$150.00</div>
                  <div className="font-semibold">$25.00</div>
                  <Badge variant="default" className="text-xs mt-1">Insurance</Badge>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Diagnostic Services</h4>
                  <div className="text-sm text-gray-600">
                    <div>• Optomap Retinal Imaging (15 min)</div>
                    <div>• Wide-field retinal photography</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">$45.00</div>
                  <Badge variant="secondary" className="text-xs mt-1">Self-pay</Badge>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Exam Services Total:</span>
                  <span className="font-bold text-lg">$70.00</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Appointment: March 15, 2024 at 10:30 AM with Dr. Sarah Smith
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Eyeglasses Selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Glasses className="h-5 w-5" />
                  Eyeglasses Selection
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onEdit?.('eyeglasses')}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Frame */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Frame</h4>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{mockEyeglassesSelection.frame.brand} {mockEyeglassesSelection.frame.model}</div>
                    <div className="text-sm text-gray-600">
                      {mockEyeglassesSelection.frame.color} • {mockEyeglassesSelection.frame.style} • {mockEyeglassesSelection.frame.material}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${mockEyeglassesSelection.frame.price.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Lenses */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Lenses</h4>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{mockEyeglassesSelection.lenses.type} Lenses</div>
                    <div className="text-sm text-gray-600">{mockEyeglassesSelection.lenses.material}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${mockEyeglassesSelection.lenses.price.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Enhancements */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Enhancements</h4>
                <div className="space-y-2">
                  {mockEyeglassesSelection.enhancements.map((enhancement, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">{enhancement.name}</span>
                      <span className="font-medium">${enhancement.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Second Pair */}
              {mockEyeglassesSelection.secondPair && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Second Pair Discount
                  </h4>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{mockEyeglassesSelection.secondPair.frame.brand} {mockEyeglassesSelection.secondPair.frame.model}</div>
                      <div className="text-sm text-green-700">Second pair discount applied</div>
                    </div>
                    <div className="text-right">
                      <div className="line-through text-gray-500">${mockEyeglassesSelection.secondPair.frame.price.toFixed(2)}</div>
                      <div className="text-green-600 font-medium">-${mockEyeglassesSelection.secondPair.discount.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Lenses */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Contact Lenses
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onEdit?.('contacts')}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Product */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-medium">{mockContactLenses.brand} {mockContactLenses.product}</div>
                    <div className="text-sm text-gray-600">
                      {mockContactLenses.type} • Annual Supply ({mockContactLenses.quantity} boxes)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${mockContactLenses.basePrice.toFixed(2)}</div>
                  </div>
                </div>

                {/* Parameters */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <h5 className="font-medium">Right Eye (OD)</h5>
                    <div className="text-gray-600">
                      Power: {mockContactLenses.parameters.rightEye.power}<br/>
                      BC: {mockContactLenses.parameters.rightEye.baseCurve}mm<br/>
                      DIA: {mockContactLenses.parameters.rightEye.diameter}mm
                    </div>
                  </div>
                  <div>
                    <h5 className="font-medium">Left Eye (OS)</h5>
                    <div className="text-gray-600">
                      Power: {mockContactLenses.parameters.leftEye.power}<br/>
                      BC: {mockContactLenses.parameters.leftEye.baseCurve}mm<br/>
                      DIA: {mockContactLenses.parameters.leftEye.diameter}mm
                    </div>
                  </div>
                </div>
              </div>

              {/* Fitting Fee */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">Contact Lens Fitting</div>
                    <div className="text-sm text-gray-600">Professional fitting and follow-up</div>
                  </div>
                  <div className="font-medium">${mockContactLenses.fittingFee.toFixed(2)}</div>
                </div>
              </div>

              {/* Rebate */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Manufacturer Rebate
                    </div>
                    <div className="text-sm text-green-700">Annual supply rebate from {mockContactLenses.brand}</div>
                  </div>
                  <div className="text-green-600 font-medium">-${mockContactLenses.rebate.toFixed(2)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quote Actions & Finalize */}
          <Card>
            <CardHeader>
              <CardTitle>Finalize Quote</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Save as PDF
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email to Customer
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Save Draft
                </Button>
              </div>

              <Separator />

              {/* Total Summary */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="space-y-3">
                  <div className="flex justify-between text-lg">
                    <span>Order Subtotal:</span>
                    <span className="font-semibold">${orderSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (8.75%):</span>
                    <span className="font-semibold">${tax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-2xl font-bold">
                    <span>Grand Total:</span>
                    <span>${grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Terms and Finalize Button */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="terms" className="text-sm">
                    I accept the terms and conditions
                  </label>
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={() => onEdit?.('contacts')}
                    variant="outline"
                    size="lg"
                    className="flex-1"
                  >
                    Back to Contacts
                  </Button>
                  <Button 
                    className="flex-1" 
                    size="lg"
                    disabled={!termsAccepted}
                    onClick={onFinalize}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Quote
                  </Button>
                </div>

                <div className="text-xs text-gray-500 text-center">
                  By completing, you authorize the processing of this order and any applicable insurance claims.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}