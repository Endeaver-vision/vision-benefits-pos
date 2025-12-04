import CommunicationHub from '@/components/communication/communication-hub'
import PageLayout from '@/components/layout/page-layout'

export default function CommunicationPage() {
  return (
    <PageLayout
      title="Communication Hub"
      subtitle="Manage customer communications and campaigns"
    >
      <CommunicationHub />
    </PageLayout>
  )
}