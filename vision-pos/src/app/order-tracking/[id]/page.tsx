import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { VisualOrderTracker } from '@/components/order-tracking/visual-order-tracker'
import { Package, User, Phone, Mail, MapPin } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getOrder(id: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          }
        },
        items: true,
        statusHistory: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 10
        },
        communications: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 5
        },
        qualityChecks: {
          orderBy: {
            performedAt: 'desc'
          },
          take: 3
        }
      }
    })
    return order
  } catch (error) {
    console.error('Failed to fetch order:', error)
    return null
  }
}

export default async function OrderDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  const order = await getOrder(id)

  if (!order) {
    notFound()
  }

  const customerName = `${order.customer.firstName} ${order.customer.lastName}`

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Back Button */}
      <div className="mb-6">
        <Link href="/order-tracking">
          <Button variant="outline" size="sm">
            ← Back to All Orders
          </Button>
        </Link>
      </div>

      {/* Visual Tracker - Domino's Style - MAIN FOCUS */}
      <div className="mb-8">
        <VisualOrderTracker
          orderNumber={order.orderNumber}
          customerName={customerName}
          currentStatus={order.status}
          estimatedTime={order.orderDate}
          enableSound={true}
        />
      </div>

      {/* Compact Order Summary Below Tracker */}
      <div className="mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-semibold">{customerName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Order Date</p>
                <p className="font-medium">{order.orderDate.toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Items</p>
                <p className="font-medium">{order.items.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="font-bold text-lg">${order.totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collapsible Details Section */}
      <details className="mb-6">
        <summary className="cursor-pointer text-lg font-semibold mb-4 hover:text-blue-600">
          📋 View Detailed Information
        </summary>
        
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        {/* Left Column - Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{customerName}</span>
              </div>
              {order.customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${order.customer.email}`} className="text-blue-600 hover:underline">
                    {order.customer.email}
                  </a>
                </div>
              )}
              {order.customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${order.customer.phone}`} className="text-blue-600 hover:underline">
                    {order.customer.phone}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items ({order.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="border-b last:border-b-0 pb-4 last:pb-0">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold">{item.description || item.type}</p>
                        <p className="text-sm text-muted-foreground">SKU: {item.sku || 'N/A'}</p>
                      </div>
                      <Badge variant={item.status === 'COMPLETED' ? 'default' : 'secondary'}>
                        {item.status}
                      </Badge>
                    </div>
                    
                    {item.lensType && (
                      <div className="text-sm mt-2">
                        <span className="text-muted-foreground">Lens Type: </span>
                        <span className="font-medium">{item.lensType}</span>
                      </div>
                    )}
                    
                    {item.lensCoatings && item.lensCoatings.length > 0 && (
                      <div className="text-sm mt-1">
                        <span className="text-muted-foreground">Coatings: </span>
                        <span className="font-medium">{item.lensCoatings.join(', ')}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-3">
                      <span className="text-sm text-muted-foreground">
                        Quantity: {item.quantity}
                      </span>
                      <span className="font-semibold">
                        ${item.finalPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Status History */}
          <Card>
            <CardHeader>
              <CardTitle>Status History</CardTitle>
              <CardDescription>Recent updates and changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.statusHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No status history yet
                  </p>
                ) : (
                  order.statusHistory.map((history) => (
                    <div key={history.id} className="flex gap-4 border-l-2 border-blue-500 pl-4 pb-4 last:pb-0">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline">{history.status}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {history.timestamp.toLocaleString()}
                          </span>
                        </div>
                        {history.notes && (
                          <p className="text-sm mt-2">{history.notes}</p>
                        )}
                        {history.updatedBy && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Updated by: {history.updatedBy}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Summary & Actions */}
        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Order Number</p>
                <p className="font-semibold">{order.orderNumber}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Order Date</p>
                <p className="font-medium">{order.orderDate.toLocaleDateString()}</p>
              </div>

              {order.estimatedCompletion && (
                <div>
                  <p className="text-sm text-muted-foreground">Est. Completion</p>
                  <p className="font-medium">{order.estimatedCompletion.toLocaleDateString()}</p>
                </div>
              )}

              {order.labOrderNumber && (
                <div>
                  <p className="text-sm text-muted-foreground">Lab Order #</p>
                  <p className="font-medium">{order.labOrderNumber}</p>
                </div>
              )}

              {order.labTrackingNumber && (
                <div>
                  <p className="text-sm text-muted-foreground">Tracking Number</p>
                  <p className="font-medium">{order.labTrackingNumber}</p>
                </div>
              )}

              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Subtotal</span>
                  <span className="font-medium">${order.subtotal.toFixed(2)}</span>
                </div>
                
                {order.taxAmount && (
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Tax</span>
                    <span className="font-medium">${order.taxAmount.toFixed(2)}</span>
                  </div>
                )}

                {order.discountAmount && order.discountAmount > 0 && (
                  <div className="flex justify-between mb-2 text-green-600">
                    <span className="text-sm">Discount</span>
                    <span className="font-medium">-${order.discountAmount.toFixed(2)}</span>
                  </div>
                )}

                {order.insuranceAmount && order.insuranceAmount > 0 && (
                  <div className="flex justify-between mb-2 text-blue-600">
                    <span className="text-sm">Insurance Coverage</span>
                    <span className="font-medium">-${order.insuranceAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                  <span>Total</span>
                  <span>${order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline">
                Update Status
              </Button>
              <Button className="w-full" variant="outline">
                Add Note
              </Button>
              <Button className="w-full" variant="outline">
                Contact Customer
              </Button>
              <Button className="w-full" variant="outline">
                Print Label
              </Button>
              <Button className="w-full" variant="outline">
                Generate Report
              </Button>
            </CardContent>
          </Card>

          {/* Delivery Info */}
          {order.deliveryMethod && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Delivery
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="outline">{order.deliveryMethod}</Badge>
                {order.deliveryInstructions && (
                  <p className="text-sm mt-2">{order.deliveryInstructions}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </details>
    </div>
  )
}
