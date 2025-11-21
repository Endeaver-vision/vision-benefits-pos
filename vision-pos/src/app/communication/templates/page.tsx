import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import TemplateManagement from '@/components/communication/template-management'

export default function CommunicationTemplatesPage() {
  return (
    <div>
      <div className="container mx-auto p-6 pb-0">
        <Link href="/communication">
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Communication
          </Button>
        </Link>
      </div>
      <TemplateManagement />
    </div>
  )
}