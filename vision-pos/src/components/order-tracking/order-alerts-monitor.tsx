'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Bell, CheckCircle2, Clock, XCircle, ArrowLeft, Home, Package } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface Alert {
  id: string
  orderNumber: string
  stage: string
  alertType: string
  severity: string
  message: string
  createdAt: string
  acknowledgedAt?: string
  order: {
    customer: {
      firstName: string
      lastName: string
    }
  }
}

interface AlertStats {
  total: number
  bySeverity: Record<string, number>
  byType: Record<string, number>
  byStage: Record<string, number>
}

const SEVERITY_COLORS = {
  URGENT: 'bg-red-900/20 border-red-500 text-red-400',
  CRITICAL: 'bg-orange-900/20 border-orange-500 text-orange-400',
  WARNING: 'bg-yellow-900/20 border-yellow-500 text-yellow-400',
  INFO: 'bg-blue-900/20 border-blue-500 text-blue-400',
}

const SEVERITY_ICONS = {
  URGENT: XCircle,
  CRITICAL: AlertTriangle,
  WARNING: Clock,
  INFO: Bell,
}

export default function OrderAlertsMonitor() {
  const router = useRouter()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [stats, setStats] = useState<AlertStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/order-alerts')
      const data = await response.json()
      setAlerts(data.alerts || [])
      setStats(data.stats || null)
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const runCheck = async () => {
    setRefreshing(true)
    try {
      await fetch('/api/order-alerts', { method: 'POST' })
      await fetchAlerts()
    } catch (error) {
      console.error('Error running check:', error)
      setRefreshing(false)
    }
  }

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await fetch(`/api/order-alerts/${alertId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'acknowledge',
          userName: 'Staff',
        }),
      })
      await fetchAlerts()
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
        body: JSON.stringify({
          action: 'resolve',
          userName: 'Staff',
          notes: notes || undefined,
        }),
      })
      await fetchAlerts()
    } catch (error) {
      console.error('Error resolving alert:', error)
    }
  }

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white/60">Loading order alerts...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Navigation */}
      <div className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-white/90 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="text-white/90 hover:text-white hover:bg-white/10"
            >
              <Home className="h-4 w-4 mr-1" />
              Dashboard
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/orders')}
              className="text-white/90 hover:text-white hover:bg-white/10"
            >
              <Package className="h-4 w-4 mr-1" />
              Orders
            </Button>
          </div>
        </div>
      </div>

      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Order Monitoring</h2>
          <p className="text-white/60 text-sm">Real-time tracking of order issues and delays</p>
        </div>
        <button
          onClick={runCheck}
          disabled={refreshing}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          {refreshing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Bell className="w-4 h-4" />
              Run Check Now
            </>
          )}
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-lg border border-white/10">
            <div className="text-white/60 text-xs font-medium mb-1">Total Alerts</div>
            <div className="text-3xl font-bold text-white">{stats.total}</div>
          </div>
          <div className="bg-gradient-to-br from-red-900/20 to-red-950/20 p-4 rounded-lg border border-red-500/30">
            <div className="text-red-400 text-xs font-medium mb-1">Urgent</div>
            <div className="text-3xl font-bold text-red-400">{stats.bySeverity.URGENT || 0}</div>
          </div>
          <div className="bg-gradient-to-br from-orange-900/20 to-orange-950/20 p-4 rounded-lg border border-orange-500/30">
            <div className="text-orange-400 text-xs font-medium mb-1">Critical</div>
            <div className="text-3xl font-bold text-orange-400">{stats.bySeverity.CRITICAL || 0}</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-900/20 to-yellow-950/20 p-4 rounded-lg border border-yellow-500/30">
            <div className="text-yellow-400 text-xs font-medium mb-1">Warning</div>
            <div className="text-3xl font-bold text-yellow-400">{stats.bySeverity.WARNING || 0}</div>
          </div>
        </div>
      )}

      {/* Alerts List */}
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="bg-gradient-to-br from-green-900/10 to-green-950/10 p-8 rounded-lg border border-green-500/20 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-green-400 font-medium">All orders are on track!</p>
            <p className="text-white/40 text-sm mt-1">No alerts at this time</p>
          </div>
        ) : (
          alerts.map(alert => {
            const SeverityIcon = SEVERITY_ICONS[alert.severity as keyof typeof SEVERITY_ICONS] || Bell
            const colorClass = SEVERITY_COLORS[alert.severity as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.INFO

            return (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${colorClass} ${
                  alert.acknowledgedAt ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <SeverityIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold">#{alert.orderNumber}</span>
                        <span className="text-xs opacity-75">
                          {alert.order.customer.firstName} {alert.order.customer.lastName}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-white/10 rounded">
                          {alert.stage.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-sm mb-2">{alert.message}</p>
                      <div className="flex items-center gap-4 text-xs opacity-60">
                        <span>{new Date(alert.createdAt).toLocaleString()}</span>
                        {alert.acknowledgedAt && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Acknowledged
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!alert.acknowledgedAt && (
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-medium transition-colors whitespace-nowrap"
                      >
                        Acknowledge
                      </button>
                    )}
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-medium transition-colors whitespace-nowrap"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer Navigation */}
      <div className="mt-8 bg-white/10 backdrop-blur-md border-t border-white/20 rounded-b-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-white/90 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="text-white/90 hover:text-white hover:bg-white/10"
            >
              <Home className="h-4 w-4 mr-1" />
              Dashboard
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/orders')}
              className="text-white/90 hover:text-white hover:bg-white/10"
            >
              <Package className="h-4 w-4 mr-1" />
              Orders
            </Button>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="bg-white/10 backdrop-blur-md border-t border-white/20">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-white/90 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="text-white/90 hover:text-white hover:bg-white/10"
            >
              <Home className="h-4 w-4 mr-1" />
              Dashboard
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/orders')}
              className="text-white/90 hover:text-white hover:bg-white/10"
            >
              <Package className="h-4 w-4 mr-1" />
              Orders
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
