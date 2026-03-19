'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package, Bell, CheckCircle2, Clock, XCircle, AlertTriangle, Home, ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DominosStyleTracker } from '@/components/order-tracking/dominos-style-tracker'
import { OrderStatus } from '@/types/order-tracking'

interface Order {
  id: string
  orderNumber: string
  status: OrderStatus
  orderDate: string
  estimatedCompletionDate: string | null
  customerInfo: {
    name: string
    email: string | null
    phone: string | null
  }
  items: Array<{
    id: string
    type: string
    productName: string
  }>
  pricing: {
    totalAmount: number
  }
  statusHistory: Array<{
    status: string
    timestamp: string
    changedBy: string | null
    notes: string | null
  }>
}

interface Alert {
  id: string
  orderNumber: string
  stage: string
  alertType: string
  severity: 'URGENT' | 'CRITICAL' | 'WARNING' | 'INFO'
  message: string
  createdAt: string
  acknowledgedAt?: string
  order: {
    id: string
    status: string
    customer: {
      firstName: string
      lastName: string
    }
  }
}

interface AlertStats {
  total: number
  bySeverity: Record<string, number>
}

const SEVERITY_COLORS = {
  URGENT: 'bg-red-900/30 border-red-500/50 text-red-300',
  CRITICAL: 'bg-orange-900/30 border-orange-500/50 text-orange-300',
  WARNING: 'bg-yellow-900/30 border-yellow-500/50 text-yellow-300',
  INFO: 'bg-blue-900/30 border-blue-500/50 text-blue-300',
}

const SEVERITY_ICONS = {
  URGENT: XCircle,
  CRITICAL: AlertTriangle,
  WARNING: Clock,
  INFO: Bell,
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [alertStats, setAlertStats] = useState<AlertStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [alertsExpanded, setAlertsExpanded] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const [ordersRes, alertsRes] = await Promise.all([
          fetch('/api/orders'),
          fetch('/api/order-alerts')
        ])

        if (ordersRes.ok) {
          const ordersData = await ordersRes.json()
          setOrders(ordersData.data || [])
        }

        if (alertsRes.ok) {
          const alertsData = await alertsRes.json()
          setAlerts(alertsData.alerts || [])
          setAlertStats(alertsData.stats || null)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await fetch(`/api/order-alerts/${alertId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge', userName: 'Staff' }),
      })
      // Refresh alerts
      const res = await fetch('/api/order-alerts')
      if (res.ok) {
        const data = await res.json()
        setAlerts(data.alerts || [])
        setAlertStats(data.stats || null)
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error)
    }
  }

  const resolveAlert = async (alertId: string) => {
    const notes = prompt('Resolution notes (optional):')
    try {
      await fetch(`/api/order-alerts/${alertId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve', userName: 'Staff', notes: notes || undefined }),
      })
      // Refresh alerts
      const res = await fetch('/api/order-alerts')
      if (res.ok) {
        const data = await res.json()
        setAlerts(data.alerts || [])
        setAlertStats(data.stats || null)
      }
    } catch (error) {
      console.error('Error resolving alert:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-white/60">Loading orders...</div>
      </div>
    )
  }

  const activeAlerts = alerts.filter(a => !a.acknowledgedAt)
  const hasAlerts = activeAlerts.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Header Navigation */}
      <div className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <Home className="h-4 w-4 mr-1" />
              Dashboard
            </Button>
          </div>
          <Link href="/pos">
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-1" />
              New Order
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto p-6 space-y-6">
        {/* Alerts Banner - Collapsible */}
        {hasAlerts && (
          <div className="bg-gradient-to-r from-amber-900/20 to-red-900/20 border border-amber-500/30 rounded-lg overflow-hidden">
            {/* Alert Summary Header */}
            <button
              onClick={() => setAlertsExpanded(!alertsExpanded)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                <span className="text-lg font-semibold text-amber-300">
                  {activeAlerts.length} Order{activeAlerts.length !== 1 ? 's' : ''} Need Attention
                </span>
                <div className="flex gap-2 ml-2">
                  {alertStats?.bySeverity.URGENT && alertStats.bySeverity.URGENT > 0 && (
                    <span className="px-2 py-0.5 bg-red-900/50 text-red-300 rounded-full text-xs font-medium">
                      {alertStats.bySeverity.URGENT} Urgent
                    </span>
                  )}
                  {alertStats?.bySeverity.CRITICAL && alertStats.bySeverity.CRITICAL > 0 && (
                    <span className="px-2 py-0.5 bg-orange-900/50 text-orange-300 rounded-full text-xs font-medium">
                      {alertStats.bySeverity.CRITICAL} Critical
                    </span>
                  )}
                  {alertStats?.bySeverity.WARNING && alertStats.bySeverity.WARNING > 0 && (
                    <span className="px-2 py-0.5 bg-yellow-900/50 text-yellow-300 rounded-full text-xs font-medium">
                      {alertStats.bySeverity.WARNING} Warning
                    </span>
                  )}
                </div>
              </div>
              <span className="text-white/60 text-sm">
                {alertsExpanded ? 'Hide' : 'Show'} Details
              </span>
            </button>

            {/* Expanded Alerts List */}
            {alertsExpanded && (
              <div className="border-t border-amber-500/20 p-4 space-y-2 max-h-80 overflow-y-auto">
                {activeAlerts.map(alert => {
                  const SeverityIcon = SEVERITY_ICONS[alert.severity] || Bell
                  const colorClass = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.INFO

                  return (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-lg border ${colorClass}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 flex-1">
                          <SeverityIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-sm">#{alert.orderNumber}</span>
                              <span className="text-xs opacity-75">
                                {alert.order.customer.firstName} {alert.order.customer.lastName}
                              </span>
                            </div>
                            <p className="text-xs opacity-90">{alert.message}</p>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); acknowledgeAlert(alert.id) }}
                            className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors"
                          >
                            Ack
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); resolveAlert(alert.id) }}
                            className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors"
                          >
                            Resolve
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Orders</h1>
            <p className="text-white/60">
              {orders.length} order{orders.length !== 1 ? 's' : ''} • Live tracking
            </p>
          </div>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <Card className="bg-slate-800/50 border-white/10">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Package className="h-16 w-16 mx-auto text-white/30 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Orders Yet</h3>
                <p className="text-white/60 mb-6">
                  Orders will appear here once created from the POS system.
                </p>
                <Link href="/pos">
                  <Button className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Order
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="overflow-hidden bg-transparent border-0">
                <DominosStyleTracker
                  orderId={order.id}
                  currentStatus={order.status}
                  orderNumber={order.orderNumber}
                  customerName={order.customerInfo.name}
                  customerEmail={order.customerInfo.email || undefined}
                  customerPhone={order.customerInfo.phone}
                  items={order.items.map(item => ({
                    description: item.productName,
                    type: item.type
                  }))}
                  totalAmount={order.pricing?.totalAmount ?? null}
                  estimatedCompletion={order.estimatedCompletionDate ? new Date(order.estimatedCompletionDate) : null}
                  orderDate={new Date(order.orderDate)}
                  statusHistory={(order.statusHistory || []).map(h => ({
                    id: `${order.id}-${h.timestamp}`,
                    status: h.status,
                    previousStatus: null,
                    timestamp: new Date(h.timestamp),
                    updatedBy: h.changedBy || 'system',
                    updatedByName: h.changedBy || 'System'
                  }))}
                  communications={[]}
                  qualityChecks={[]}
                />
              </Card>
            ))}
          </div>
        )}

        {/* All Clear Message */}
        {!hasAlerts && orders.length > 0 && (
          <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <span className="text-emerald-300 font-medium">All orders are on track!</span>
          </div>
        )}
      </div>
    </div>
  )
}
