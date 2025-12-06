import { prisma } from '@/lib/prisma'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { DominosStyleTracker } from '@/components/order-tracking/dominos-style-tracker'
import { OrderStatus } from '@/types/order-tracking'

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

async function getAlertSummary() {
  try {
    const alerts = await prisma.orderAlert.findMany({
      where: { resolved: false },
      include: {
        order: {
          select: {
            orderNumber: true,
            status: true,
          }
        }
      },
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'asc' }
      ]
    })

    const bySeverity = {
      URGENT: alerts.filter(a => a.severity === 'URGENT'),
      CRITICAL: alerts.filter(a => a.severity === 'CRITICAL'),
      WARNING: alerts.filter(a => a.severity === 'WARNING'),
      INFO: alerts.filter(a => a.severity === 'INFO'),
    }

    return {
      total: alerts.length,
      bySeverity,
      topAlerts: alerts.slice(0, 5) // Top 5 most critical
    }
  } catch (error) {
    console.error('Failed to fetch alert summary:', error)
    return {
      total: 0,
      bySeverity: { URGENT: [], CRITICAL: [], WARNING: [], INFO: [] },
      topAlerts: []
    }
  }
}

export default async function OrderTrackingPage() {
  const [orders, alertSummary] = await Promise.all([
    getOrders(),
    getAlertSummary()
  ])

  return (
    <div className="container mx-auto p-6">
      {/* Alert Banner - Always visible with summary */}
      {alertSummary.total > 0 && (
        <div className="mb-6 bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <h3 className="text-lg font-bold text-red-400">
                  {alertSummary.total} Order{alertSummary.total !== 1 ? 's' : ''} Out of Timeline
                </h3>
              </div>
              
              {/* Severity Breakdown */}
              <div className="flex gap-4 mb-3 text-sm">
                {alertSummary.bySeverity.URGENT.length > 0 && (
                  <span className="px-3 py-1 bg-red-900/40 text-red-300 rounded-full font-medium">
                    🚨 {alertSummary.bySeverity.URGENT.length} Urgent
                  </span>
                )}
                {alertSummary.bySeverity.CRITICAL.length > 0 && (
                  <span className="px-3 py-1 bg-orange-900/40 text-orange-300 rounded-full font-medium">
                    ⚠️ {alertSummary.bySeverity.CRITICAL.length} Critical
                  </span>
                )}
                {alertSummary.bySeverity.WARNING.length > 0 && (
                  <span className="px-3 py-1 bg-yellow-900/40 text-yellow-300 rounded-full font-medium">
                    ⏰ {alertSummary.bySeverity.WARNING.length} Warning
                  </span>
                )}
              </div>

              {/* Top Alerts Preview */}
              <div className="space-y-1.5">
                {alertSummary.topAlerts.map(alert => (
                  <div key={alert.id} className="text-sm text-white/80 flex items-center gap-2">
                    <span className="font-mono text-white/60">#{alert.orderNumber}</span>
                    <span className="text-xs px-2 py-0.5 bg-white/10 rounded">
                      {alert.order.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-white/70">{alert.message}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link href="/order-monitoring">
              <Button variant="destructive" size="sm">
                View All Alerts →
              </Button>
            </Link>
          </div>
        </div>
      )}

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
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <DominosStyleTracker
                orderId={order.id}
                currentStatus={order.status as OrderStatus}
                orderNumber={order.orderNumber}
                customerName={`${order.customer.firstName} ${order.customer.lastName}`}
                items={order.items.map(item => ({
                  description: item.description,
                  type: item.type
                }))}
                totalAmount={order.totalAmount ? Number(order.totalAmount) : null}
                estimatedCompletion={order.estimatedCompletion}
                orderDate={order.orderDate}
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
