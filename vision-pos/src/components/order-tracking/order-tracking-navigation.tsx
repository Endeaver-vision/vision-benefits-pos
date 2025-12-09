'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft } from 'lucide-react'

export function OrderTrackingNavigation() {
  const router = useRouter()

  return (
    <>
      {/* Header Navigation */}
      <div className="mb-6 bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-white/90 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="text-white/90 hover:text-white hover:bg-white/10"
            >
              <Home className="h-4 w-4 mr-1" />
              Dashboard
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

export function OrderTrackingFooter() {
  const router = useRouter()

  return (
    <div className="bg-white/10 backdrop-blur-md border-t border-white/20">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-white/90 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
            className="text-white/90 hover:text-white hover:bg-white/10"
          >
            <Home className="h-4 w-4 mr-1" />
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
