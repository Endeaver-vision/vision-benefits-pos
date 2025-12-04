import CustomerProfile from '@/components/customers/customer-profile'
import PageLayout from '@/components/layout/page-layout'

export default function CustomerProfilePage() {
  return (
    <PageLayout
      title="Customer Profile"
      subtitle="View and manage customer details"
    >
      <CustomerProfile />
    </PageLayout>
  )
}