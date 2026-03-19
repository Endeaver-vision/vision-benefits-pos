'use client'

import { useState, useEffect } from 'react'
import { VisualOrderTracker } from '@/components/order-tracking/visual-order-tracker'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Package, RefreshCw } from 'lucide-react'
import { OrderStatus } from '@/types/order-tracking'

interface OrderData {
  orderNumber: string
  customerName: string
  status: OrderStatus
  orderDate: string
  items: Array<{
    description: string
    status: string
  }>
}

export function RealtimeOrderTracker({ orderId }: { orderId: string }) {
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Fetch order status
  useEffect(() => {
    const fetchOrderStatus = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch order')
        }
        const data = await response.json()
        setOrderData(data)
        setLastUpdate(new Date())
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load order')
      } finally {
        setLoading(false)
      }
    }

    // Initial load
    fetchOrderStatus()

    // Poll every 30 seconds
    const interval = setInterval(fetchOrderStatus, 30000)

    return () => clearInterval(interval)
  }, [orderId])

  if (loading) {
    return (
      <Card className="p-12">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-12 w-12 animate-spin text-blue-500" />
          <p className="text-muted-foreground">Loading order status...</p>
        </div>
      </Card>
    )
  }

  if (error || !orderData) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Order Not Found</h3>
          <p className="text-muted-foreground">{error || 'Unable to load order details'}</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <VisualOrderTracker
        orderNumber={orderData.orderNumber}
        customerName={orderData.customerName}
        currentStatus={orderData.status}
        estimatedTime={new Date(orderData.orderDate)}
        enableSound={true}
      />

      {/* Order Items Summary */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4">Your Items</h3>
          <div className="space-y-3">
            {orderData.items.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm">{item.description}</span>
                <Badge variant="outline">{item.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Last Updated */}
      <div className="text-center text-sm text-muted-foreground">
        Last updated: {lastUpdate.toLocaleTimeString()}
        <br />
        <span className="text-xs">Auto-refreshes every 30 seconds</span>
      </div>
    </div>
  )
}
