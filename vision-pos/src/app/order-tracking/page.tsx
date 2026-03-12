import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package, AlertTriangle, Home, Clock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { DominosStyleTracker } from '@/components/order-tracking/dominos-style-tracker'
import { OrderStatus } from '@/types/order-tracking'
import { OrderTrackingNavigation, OrderTrackingFooter } from '@/components/order-tracking/order-tracking-navigation'

export const dynamic = 'force-dynamic'

async function getOrders() {
  // Order model not yet implemented in schema
  // Return empty array until schema is updated
  return []
}

async function getAlertSummary() {
  // OrderAlert model not yet implemented in schema
  // Return empty data until schema is updated
  return {
    total: 0,
    bySeverity: { URGENT: [], CRITICAL: [], WARNING: [], INFO: [] },
    topAlerts: []
  }
}

export default async function OrderTrackingPage() {
  const [orders, alertSummary] = await Promise.all([
    getOrders(),
    getAlertSummary()
  ])

  return (
    <div className="container mx-auto p-6">
      <OrderTrackingNavigation />

      {/* Alert Banner - Timeline Status Updates */}
      {alertSummary.total > 0 && (
        <div className="mb-6 bg-gradient-to-r from-blue-900/20 to-slate-800/20 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="h-5 w-5 text-blue-400" />
                <h3 className="text-lg font-bold text-blue-300">
                  Timeline Status Updates - {alertSummary.total} Order{alertSummary.total !== 1 ? 's' : ''} Requiring Attention
                </h3>
              </div>
              
              {/* Severity Breakdown */}
              <div className="flex gap-4 mb-3 text-sm">
                {alertSummary.bySeverity.URGENT.length > 0 && (
                  <span className="px-3 py-1 bg-purple-900/40 text-purple-300 rounded-full font-medium">
                    🔔 {alertSummary.bySeverity.URGENT.length} Needs Attention
                  </span>
                )}
                {alertSummary.bySeverity.CRITICAL.length > 0 && (
                  <span className="px-3 py-1 bg-amber-900/40 text-amber-300 rounded-full font-medium">
                    ⏰ {alertSummary.bySeverity.CRITICAL.length} Review Soon
                  </span>
                )}
                {alertSummary.bySeverity.WARNING.length > 0 && (
                  <span className="px-3 py-1 bg-cyan-900/40 text-cyan-300 rounded-full font-medium">
                    📋 {alertSummary.bySeverity.WARNING.length} Monitor
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
              <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700">
                View Details →
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
        <Link href="/quotes/new">
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
                customerEmail={order.customer.email || undefined}
                customerPhone={order.customer.phone || undefined}
                items={order.items.map(item => ({
                  description: item.description,
                  type: item.type
                }))}
                totalAmount={order.totalAmount ? Number(order.totalAmount) : null}
                estimatedCompletion={order.estimatedCompletion}
                orderDate={order.orderDate}
                statusHistory={order.statusHistory}
                communications={order.communications}
                qualityChecks={order.qualityChecks}
              />
            </Card>
          ))}
        </div>
      )}

      <OrderTrackingFooter />
    </div>
  )
}
