'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, Truck, CheckCircle, Clock, AlertCircle } from 'lucide-react'

export default function OrderTrackingPreview() {
  // Mock data for demo
  const mockOrders = [
    {
      id: '1',
      orderNumber: 'ORD-202512-0001',
      customerName: 'John Smith',
      status: 'IN_PRODUCTION',
      orderDate: '2025-12-01',
      estimatedCompletion: '2025-12-10',
      items: [
        { name: 'Ray-Ban Aviator', type: 'Frame' },
        { name: 'Progressive Lenses', type: 'Lens' },
      ],
      totalAmount: 432.00
    },
    {
      id: '2',
      orderNumber: 'ORD-202512-0002',
      customerName: 'Jane Doe',
      status: 'READY_FOR_PICKUP',
      orderDate: '2025-11-28',
      estimatedCompletion: '2025-12-05',
      items: [
        { name: 'Oakley Holbrook', type: 'Frame' },
        { name: 'Polarized Lenses', type: 'Lens' },
      ],
      totalAmount: 345.60
    },
    {
      id: '3',
      orderNumber: 'ORD-202512-0003',
      customerName: 'Bob Wilson',
      status: 'SHIPPED',
      orderDate: '2025-11-25',
      estimatedCompletion: '2025-12-03',
      items: [
        { name: 'Designer Frame', type: 'Frame' },
        { name: 'Blue Light Lenses', type: 'Lens' },
      ],
      totalAmount: 289.99
    },
  ]

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-500',
      SUBMITTED: 'bg-blue-500',
      IN_PRODUCTION: 'bg-yellow-500',
      QUALITY_CHECK: 'bg-purple-500',
      READY_FOR_PICKUP: 'bg-green-500',
      SHIPPED: 'bg-blue-600',
      DELIVERED: 'bg-green-600',
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Order Tracking System</h1>
        <p className="text-muted-foreground">
          Preview of the new order tracking system (Feature Branch)
        </p>
      </div>

      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              🚧 Feature in Development
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              This is a preview of the Order Tracking System on the <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">feature/order-tracking-system</code> branch.
              The database tables and API endpoints are built but not yet migrated to production.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {mockOrders.map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{order.orderNumber}</CardTitle>
                  <CardDescription>{order.customerName}</CardDescription>
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
                  <p className="font-medium">{new Date(order.orderDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Est. Completion</p>
                  <p className="font-medium">{new Date(order.estimatedCompletion).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Items</p>
                  <p className="font-medium">{order.items.length} items</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-medium">${order.totalAmount.toFixed(2)}</p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2">Order Items:</p>
                <div className="flex flex-wrap gap-2">
                  {order.items.map((item, idx) => (
                    <Badge key={idx} variant="outline">
                      {item.name} ({item.type})
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline">View Details</Button>
                <Button size="sm" variant="outline">Update Status</Button>
                <Button size="sm" variant="outline">Add Note</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border">
        <h3 className="font-semibold mb-4">✨ What's Built So Far:</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-green-600 dark:text-green-400 mb-2">✅ Completed</h4>
            <ul className="space-y-1 text-sm">
              <li>• Database schema (5 new tables)</li>
              <li>• TypeScript types (450+ lines)</li>
              <li>• API endpoints (GET, POST, PATCH, DELETE)</li>
              <li>• Status tracking system</li>
              <li>• Order history logging</li>
              <li>• Communication tracking</li>
              <li>• Quality check workflow</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-yellow-600 dark:text-yellow-400 mb-2">🚧 To Do</h4>
            <ul className="space-y-1 text-sm">
              <li>• Run database migration</li>
              <li>• Build staff dashboard UI</li>
              <li>• Build customer portal</li>
              <li>• Add real-time notifications</li>
              <li>• Integrate with existing POS</li>
              <li>• Add authentication</li>
              <li>• Merge to master branch</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
