import OrderAlertsMonitor from '@/components/order-tracking/order-alerts-monitor'

export default function OrderMonitoringPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <OrderAlertsMonitor />
      </div>
    </div>
  )
}
