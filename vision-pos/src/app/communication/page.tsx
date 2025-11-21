import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import CommunicationHub from '@/components/communication/communication-hub'

export default function CommunicationPage() {
  return (
    <div>
      <div className="container mx-auto p-6 pb-0">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
      <CommunicationHub />
    </div>
  )
}