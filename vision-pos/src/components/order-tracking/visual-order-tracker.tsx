'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Volume2, VolumeX, Share2, Sparkles } from 'lucide-react'
import { OrderStatus } from '@/types/order-tracking'

interface VisualOrderTrackerProps {
  orderNumber: string
  customerName: string
  currentStatus: OrderStatus
  estimatedTime?: Date
  onStatusChange?: (newStatus: OrderStatus) => void
  enableSound?: boolean
}

const ORDER_STAGES = [
  { status: 'SUBMITTED', label: 'Order Placed', color: 'from-red-500 to-orange-500' },
  { status: 'IN_PRODUCTION', label: 'In Production', color: 'from-orange-500 to-yellow-500' },
  { status: 'QUALITY_CHECK', label: 'Quality Check', color: 'from-yellow-500 to-blue-400' },
  { status: 'READY_FOR_PICKUP', label: 'Ready', color: 'from-blue-400 to-blue-500' },
  { status: 'DELIVERED', label: 'Complete', color: 'from-blue-500 to-cyan-400' }
]

export function VisualOrderTracker({
  orderNumber,
  customerName,
  currentStatus,
  estimatedTime,
  onStatusChange,
  enableSound = true
}: VisualOrderTrackerProps) {
  const [soundEnabled, setSoundEnabled] = useState(enableSound)
  const [previousStatus, setPreviousStatus] = useState<OrderStatus>(currentStatus)

  // Get current stage index
  const currentStageIndex = ORDER_STAGES.findIndex(stage => stage.status === currentStatus)
  const progressPercentage = currentStageIndex >= 0 ? ((currentStageIndex + 1) / ORDER_STAGES.length) * 100 : 0

  // Play sound on status change
  useEffect(() => {
    if (soundEnabled && previousStatus !== currentStatus) {
      const audio = new Audio('/notification.mp3')
      audio.play().catch(() => {
        // Silently fail if audio doesn't play
      })
    }
    setPreviousStatus(currentStatus)
  }, [currentStatus, soundEnabled, previousStatus])

  const getCurrentStageMessage = () => {
    const stage = ORDER_STAGES[currentStageIndex]
    if (!stage) return 'Processing your order'
    
    const messages: Record<string, string> = {
      'SUBMITTED': `${customerName}'s order has been received`,
      'IN_PRODUCTION': `Your eyewear is being crafted`,
      'QUALITY_CHECK': `Final quality inspection in progress`,
      'READY_FOR_PICKUP': `Your order is ready for pickup`,
      'DELIVERED': `Order complete - Thank you!`
    }
    
    return messages[stage.status] || 'Processing your order'
  }

  const handleShare = async () => {
    const shareData = {
      title: `Order ${orderNumber} - Vision POS`,
      text: `Track my eyewear order: ${getCurrentStageMessage()}`,
      url: window.location.href
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        // User cancelled share
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  return (
    <Card className="relative overflow-hidden border-2">
      {/* Header with branding and controls */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            <h2 className="text-2xl font-bold">VISION TRACKER</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-white hover:bg-white/20"
            >
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="bg-white/10 text-white border-white/30 hover:bg-white/20"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
        
        <p className="text-sm text-white/90">
          Know the status of your order, from the moment it's prepared to the second it's ready for pickup.
        </p>
      </div>

      <CardContent className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-900 dark:to-slate-800">
        {/* Progress Bar Container */}
        <div className="relative mb-6">
          {/* Stage Labels Above */}
          <div className="flex justify-between mb-4 px-2">
            {ORDER_STAGES.map((stage, index) => (
              <div
                key={stage.status}
                className={`flex flex-col items-center flex-1 ${
                  index <= currentStageIndex ? 'opacity-100' : 'opacity-40'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-500 ${
                    index <= currentStageIndex
                      ? 'bg-gradient-to-br ' + stage.color + ' text-white shadow-lg scale-110'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                  } ${index === currentStageIndex ? 'ring-4 ring-blue-300 animate-pulse' : ''}`}
                >
                  {index + 1}
                </div>
                <span className="text-xs font-semibold mt-2 text-center">{stage.label}</span>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="relative h-20 bg-white dark:bg-slate-700 rounded-full shadow-inner border-4 border-gray-200 dark:border-gray-600 overflow-hidden">
            {/* Animated Progress Fill */}
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500 via-orange-500 via-yellow-500 via-blue-400 to-cyan-400 transition-all duration-1000 ease-in-out rounded-full"
              style={{ width: `${progressPercentage}%` }}
            />

            {/* Stage Dividers */}
            {ORDER_STAGES.slice(0, -1).map((_, index) => (
              <div
                key={index}
                className="absolute inset-y-0 w-1 bg-gray-300 dark:bg-gray-500"
                style={{ left: `${((index + 1) / ORDER_STAGES.length) * 100}%` }}
              />
            ))}
          </div>
        </div>

        {/* Status Message */}
        <div className="text-center mb-4">
          <Badge
            variant="outline"
            className="bg-white dark:bg-slate-800 px-6 py-2 text-lg font-bold border-2"
          >
            {ORDER_STAGES[currentStageIndex]?.label.toUpperCase() || 'PROCESSING'}
          </Badge>
          <p className="text-2xl font-bold mt-4 text-gray-900 dark:text-white">
            {getCurrentStageMessage()}
          </p>
          {estimatedTime && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              {customerName} placed order at{' '}
              {estimatedTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </p>
          )}
        </div>

        {/* Order Number Display */}
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          Order #{orderNumber}
        </div>
      </CardContent>

    </Card>
  )
}
