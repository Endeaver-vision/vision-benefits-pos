import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, Truck, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getOrders() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        items: true,
        _count: {
          select: {
            statusHistory: true,
            communications: true,
            qualityChecks: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    })
    return orders
  } catch (error) {
    console.error('Failed to fetch orders:', error)
    return []
  }
}

export default async function OrderTrackingPage() {
  const orders = await getOrders()

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-500',
      SUBMITTED: 'bg-blue-500',
      IN_PRODUCTION: 'bg-yellow-500',
      QUALITY_CHECK: 'bg-purple-500',
      READY_FOR_PICKUP: 'bg-green-500',
      SHIPPED: 'bg-blue-600',
      DELIVERED: 'bg-green-600',
      CANCELLED: 'bg-red-500',
    }
    return colors[status] || 'bg-gray-500'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'IN_PRODUCTION':
        return <Clock className="h-4 w-4" />
      case 'READY_FOR_PICKUP':
        return <Package className="h-4 w-4" />
      case 'SHIPPED':
        return <Truck className="h-4 w-4" />
      case 'DELIVERED':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Order Tracking System</h1>
          <p className="text-muted-foreground">
            Live orders from your database
          </p>
        </div>
        <Link href="/order-tracking/new">
          <Button>Create New Order</Button>
        </Link>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Orders Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first order to get started with the order tracking system.
              </p>
              <Link href="/order-tracking/new">
                <Button>Create First Order</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{order.orderNumber}</CardTitle>
                    <CardDescription>
                      {order.customer.firstName} {order.customer.lastName}
                    </CardDescription>
                  </div>
                  <Badge className={`${getStatusColor(order.status)} text-white flex items-center gap-2`}>
                    {getStatusIcon(order.status)}
                    {order.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Order Date</p>
                    <p className="font-medium">
                      {order.orderDate.toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Est. Completion</p>
                    <p className="font-medium">
                      {order.estimatedCompletion 
                        ? order.estimatedCompletion.toLocaleDateString()
                        : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Items</p>
                    <p className="font-medium">{order.items.length} items</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="font-medium">
                      ${order.totalAmount?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>
                
                {order.items.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Order Items:</p>
                    <div className="flex flex-wrap gap-2">
                      {order.items.map((item) => (
                        <Badge key={item.id} variant="outline">
                          {item.description || item.type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <Link href={`/order-tracking/${order.id}`}>
                    <Button size="sm" variant="outline">View Details</Button>
                  </Link>
                  <Button size="sm" variant="outline">Update Status</Button>
                  <Button size="sm" variant="outline">Add Note</Button>
                </div>

                {order._count && (
                  <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
                    <span>{order._count.statusHistory} status updates</span>
                    <span>{order._count.communications} communications</span>
                    <span>{order._count.qualityChecks} QC checks</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
