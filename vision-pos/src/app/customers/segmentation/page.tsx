import CustomerSegmentation from '@/components/customers/customer-segmentation'
import PageLayout from '@/components/layout/page-layout'

export default function SegmentationPage() {
  return (
    <PageLayout
      title="Customer Segmentation"
      subtitle="Group and analyze customers by segments"
    >
      <CustomerSegmentation />
    </PageLayout>
  )
}