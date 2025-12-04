import TemplateManagement from '@/components/communication/template-management'
import PageLayout from '@/components/layout/page-layout'

export default function CommunicationTemplatesPage() {
  return (
    <PageLayout
      title="Communication Templates"
      subtitle="Manage email and SMS templates"
    >
      <TemplateManagement />
    </PageLayout>
  )
}