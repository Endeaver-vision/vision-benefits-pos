'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle,
  Calendar,
  CreditCard,
  FileText,
  Mail,
  Phone,
  Clock,
  Package,
  Printer
} from 'lucide-react'

interface QuoteFinalizationProps {
  onComplete?: () => void
}

export function QuoteFinalizationLayer({ onComplete }: QuoteFinalizationProps) {
  const [orderNumber] = useState(() => `ORD-${Date.now().toString().slice(-6)}`)
  const [estimatedDelivery] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() + 7) // 7 days from now
    return date.toLocaleDateString()
  })

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-800 mb-2">Quote Finalized Successfully!</h2>
            <p className="text-green-700">
              Your comprehensive eyewear quote has been processed and is ready for fulfillment.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Order Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Order Number</label>
                  <div className="font-semibold text-lg">{orderNumber}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Date Created</label>
                  <div className="font-semibold">{new Date().toLocaleDateString()}</div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Order Summary</label>
                <div className="mt-1 space-y-1">
                  <div className="flex justify-between">
                    <span>Ray-Ban Aviator Eyeglasses</span>
                    <Badge variant="outline">Processing</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>ACUVUE OASYS 1-Day (Annual Supply)</span>
                    <Badge variant="outline">Processing</Badge>
                  </div>
                </div>
              </div>

              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertDescription>
                  <strong>Estimated Delivery:</strong> {estimatedDelivery}
                  <br />
                  You&apos;ll receive tracking information via email once your order ships.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Payment Method:</span>
                  <Badge variant="secondary">Insurance + Patient Pay</Badge>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm">
                    <div className="flex justify-between mb-1">
                      <span>Insurance Coverage (VSP):</span>
                      <span className="font-medium">$250.00</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span>Patient Responsibility:</span>
                      <span className="font-medium">$542.75</span>
                    </div>
                    <div className="border-t pt-1 mt-2">
                      <div className="flex justify-between font-semibold">
                        <span>Total Order Value:</span>
                        <span>$792.75</span>
                      </div>
                    </div>
                  </div>
                </div>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Insurance claim will be processed automatically. Patient payment due upon delivery.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Next Steps */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                  <div>
                    <div className="font-medium">Insurance Processing</div>
                    <div className="text-sm text-gray-600">VSP claim submitted automatically - typically processed within 24-48 hours</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 w-6 h-6 bg-gray-400 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                  <div>
                    <div className="font-medium">Laboratory Processing</div>
                    <div className="text-sm text-gray-600">Your prescription lenses will be manufactured to exact specifications (3-5 business days)</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 w-6 h-6 bg-gray-400 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                  <div>
                    <div className="font-medium">Quality Control & Shipping</div>
                    <div className="text-sm text-gray-600">Final inspection and expedited shipping to your address</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 w-6 h-6 bg-gray-400 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                  <div>
                    <div className="font-medium">Contact Lens Fitting</div>
                    <div className="text-sm text-gray-600">Schedule your fitting appointment - call (555) 123-4567</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Communication Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span>Email Updates</span>
                  </div>
                  <Badge variant="outline">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-blue-600" />
                    <span>SMS Notifications</span>
                  </div>
                  <Badge variant="outline">Enabled</Badge>
                </div>
              </div>
              <Alert>
                <Package className="h-4 w-4" />
                <AlertDescription>
                  You&apos;ll receive automatic updates at each step of your order process.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                <Button variant="outline" className="justify-start">
                  <Printer className="h-4 w-4 mr-2" />
                  Print Order Summary
                </Button>
                <Button variant="outline" className="justify-start">
                  <Mail className="h-4 w-4 mr-2" />
                  Email Receipt
                </Button>
                <Button variant="outline" className="justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Fitting Appointment
                </Button>
                <Button 
                  className="mt-4" 
                  onClick={onComplete}
                >
                  Return to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}