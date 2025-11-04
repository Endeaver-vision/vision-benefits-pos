'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Package, TrendingDown, ExternalLink } from 'lucide-react'

interface StockAlert {
  id: string
  currentStock: number
  availableStock: number
  reorderPoint: number
  reorderQuantity: number
  product: {
    id: string
    name: string
    sku: string | null
    category: {
      name: string
    }
    suppliers: Array<{
      supplier: {
        name: string
        contactName: string | null
        phone: string | null
      }
    }>
  }
}

interface AlertsData {
  critical: StockAlert[]
  low: StockAlert[]
  summary: {
    total: number
    critical: number
    low: number
  }
}

interface StockAlertsProps {
  maxItems?: number
  showViewAll?: boolean
}

export default function StockAlerts({ maxItems = 5, showViewAll = true }: StockAlertsProps) {
  const [alerts, setAlerts] = useState<AlertsData>({
    critical: [],
    low: [],
    summary: { total: 0, critical: 0, low: 0 }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch('/api/inventory/alerts')
        if (response.ok) {
          const data = await response.json()
          setAlerts(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch stock alerts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
    
    // Refresh alerts every 5 minutes
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const getAlertBadge = (item: StockAlert) => {
    if (item.availableStock <= 0) {
      return <Badge variant="destructive">Out of Stock</Badge>
    } else {
      return <Badge variant="secondary">Low Stock</Badge>
    }
  }

  const allAlerts = [...alerts.critical, ...alerts.low].slice(0, maxItems)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span>Stock Alerts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse">Loading alerts...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span>Stock Alerts</span>
            {alerts.summary.total > 0 && (
              <Badge variant="outline">{alerts.summary.total}</Badge>
            )}
          </div>
          {showViewAll && alerts.summary.total > maxItems && (
            <Button variant="ghost" size="sm" asChild>
              <a href="/inventory?lowStock=true" className="flex items-center space-x-1">
                <span>View All</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.summary.total === 0 ? (
          <div className="text-center py-6">
            <Package className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">All items are well stocked!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">
                  {alerts.summary.critical}
                </div>
                <div className="text-xs text-gray-600">Out of Stock</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">
                  {alerts.summary.low}
                </div>
                <div className="text-xs text-gray-600">Low Stock</div>
              </div>
            </div>

            {/* Alert Items */}
            <div className="space-y-2">
              {allAlerts.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm truncate">
                        {item.product.name}
                      </span>
                      {getAlertBadge(item)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {item.product.category.name} • SKU: {item.product.sku || 'N/A'}
                    </div>
                    {item.availableStock <= 0 ? (
                      <div className="text-xs text-red-600 mt-1 flex items-center space-x-1">
                        <TrendingDown className="h-3 w-3" />
                        <span>Out of stock</span>
                      </div>
                    ) : (
                      <div className="text-xs text-orange-600 mt-1">
                        {item.currentStock} left (reorder at {item.reorderPoint})
                      </div>
                    )}
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    {item.product.suppliers.length > 0 && (
                      <div>{item.product.suppliers[0].supplier.name}</div>
                    )}
                    <div className="font-medium">
                      Order: {item.reorderQuantity}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {alerts.summary.total > maxItems && (
              <div className="text-center pt-2">
                <Button variant="outline" size="sm" asChild>
                  <a href="/inventory?lowStock=true">
                    View {alerts.summary.total - maxItems} more alerts
                  </a>
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}