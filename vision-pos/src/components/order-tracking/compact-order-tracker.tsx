'use client'

import { Badge } from '@/components/ui/badge'
import { OrderStatus } from '@/types/order-tracking'
import { Package, Wrench, CheckSquare, Gift, CheckCircle } from 'lucide-react'

interface CompactOrderTrackerProps {
  currentStatus: OrderStatus
  customerName: string
}

const STAGE_MAP: Record<OrderStatus, number> = {
  'DRAFT': 0,
  'SUBMITTED': 1,
  'CONFIRMED': 1,
  'IN_PRODUCTION': 2,
  'QUALITY_CHECK': 3,
  'READY_FOR_PICKUP': 4,
  'READY_FOR_SHIPPING': 4,
  'SHIPPED': 4,
  'DELIVERED': 5,
  'CANCELLED': 0,
  'ON_HOLD': 0
}

const STAGES = [
  { label: 'Placed', icon: Package },
  { label: 'Production', icon: Wrench },
  { label: 'QC', icon: CheckSquare },
  { label: 'Ready', icon: Gift },
  { label: 'Complete', icon: CheckCircle }
]

// Dynamic color based on progress
function getProgressColor(stage: number): string {
  if (stage === 0) return 'from-gray-400 to-gray-400'
  if (stage === 1) return 'from-blue-500 to-blue-600'
  if (stage === 2) return 'from-orange-500 to-yellow-500'
  if (stage === 3) return 'from-purple-500 to-purple-600'
  if (stage === 4) return 'from-green-500 to-emerald-500'
  if (stage >= 5) return 'from-cyan-500 to-teal-500'
  return 'from-gray-400 to-gray-400'
}

export function CompactOrderTracker({ currentStatus, customerName }: CompactOrderTrackerProps) {
  const currentStage = STAGE_MAP[currentStatus] || 0
  const progressPercent = Math.max(8, (currentStage / 5) * 100) // Min 8% for visibility

  return (
    <div className="space-y-2">
      {/* Progress Bar with Icons */}
      <div className="relative h-10 bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700">
        <div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getProgressColor(currentStage)} transition-all duration-700 ease-out`}
          style={{ width: `${progressPercent}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-between px-2">
          {STAGES.map((stage, idx) => {
            const Icon = stage.icon
            const isActive = idx < currentStage
            const isCurrent = idx === currentStage - 1
            
            return (
              <div key={stage.label} className="flex flex-col items-center">
                <Icon 
                  className={`h-4 w-4 transition-all ${
                    isActive 
                      ? 'text-white drop-shadow-md' 
                      : isCurrent
                      ? 'text-white drop-shadow-md scale-110'
                      : 'text-gray-500 dark:text-gray-600'
                  }`}
                />
                <span className={`text-[10px] font-semibold mt-0.5 ${
                  isActive 
                    ? 'text-white' 
                    : 'text-gray-600 dark:text-gray-500'
                }`}>
                  {stage.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground truncate flex-1">{customerName}</span>
        <Badge 
          variant="outline" 
          className={`text-xs ml-2 ${
            currentStage === 5 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
            currentStage >= 4 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
            currentStage >= 3 ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
            currentStage >= 2 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
          }`}
        >
          {currentStatus.replace(/_/g, ' ')}
        </Badge>
      </div>
    </div>
  )
}
