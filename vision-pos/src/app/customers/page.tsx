import CustomerManagement from '@/components/customers/customer-management'
import PageLayout from '@/components/layout/page-layout'

export default function CustomersPage() {
  return (
    <PageLayout
      title="Customer Management"
      subtitle="Search and manage customer records"
    >
      <CustomerManagement />
    </PageLayout>
  )
}