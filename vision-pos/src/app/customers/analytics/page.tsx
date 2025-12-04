import CustomerAnalyticsDashboard from '@/components/customers/analytics-dashboard'
import PageLayout from '@/components/layout/page-layout'

export default function AnalyticsPage() {
  return (
    <PageLayout
      title="Customer Analytics"
      subtitle="Insights and metrics about your customer base"
    >
      <CustomerAnalyticsDashboard />
    </PageLayout>
  )
}