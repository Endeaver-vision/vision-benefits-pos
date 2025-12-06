'use client'

import { useState } from 'react'
import { OrderStatus } from '@/types/order-tracking'
import { SmartModal, StatusUpdateData } from './smart-modal'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface DominosTrackerProps {
  orderId: string
  currentStatus: OrderStatus
  orderNumber: string
  customerName: string
  items: Array<{ description?: string | null; type: string }>
  totalAmount?: number | null
  estimatedCompletion?: Date | null
  orderDate: Date
  onStatusUpdate?: () => void
}

const ORDER_STAGES = [
  { status: 'SUBMITTED', label: 'Invoice', shortLabel: 'Invoice' },
  { status: 'CONFIRMED', label: 'Order Placed', shortLabel: 'Placed' },
  { status: 'SHIPPED_TO_VENDOR', label: 'Shipped to Vendor', shortLabel: 'Shipped' },
  { status: 'VENDOR_PROCESSING', label: 'Vendor Processing', shortLabel: 'Processing' },
  { status: 'VENDOR_SHIPPED', label: 'Vendor Shipped', shortLabel: 'Shipped Back' },
  { status: 'RECEIVED', label: 'Received', shortLabel: 'Received' },
  { status: 'QUALITY_CHECK', label: 'QC', shortLabel: 'QC' },
  { status: 'PATIENT_NOTIFIED', label: 'Patient Notified', shortLabel: 'Ready' },
] as const

// Map existing statuses to stages
const STATUS_TO_STAGE: Record<string, number> = {
  'DRAFT': 0,
  'SUBMITTED': 0,
  'CONFIRMED': 1,
  'SHIPPED_TO_VENDOR': 2,
  'VENDOR_PROCESSING': 3,
  'VENDOR_SHIPPED': 4,
  'RECEIVED': 5,
  'IN_PRODUCTION': 5,
  'QUALITY_CHECK': 6,
  'READY_FOR_PICKUP': 7,
  'READY_FOR_SHIPPING': 7,
  'PATIENT_NOTIFIED': 7,
  'SHIPPED': 7,
  'DELIVERED': 7,
}

export function DominosTracker({ orderId, currentStatus, orderNumber, onStatusUpdate }: DominosTrackerProps) {
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 })
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const trackerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const currentStage = STATUS_TO_STAGE[currentStatus] || 0
  const progressPercent = ((currentStage + 1) / ORDER_STAGES.length) * 100

  // Get next stage
  const nextStage = currentStage < ORDER_STAGES.length - 1 ? ORDER_STAGES[currentStage + 1] : null

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (nextStage && !isUpdating) {
      setSelectedStatus(nextStage.status)
      setShowModal(true)
    }
  }

  const handleStatusUpdate = async (data: StatusUpdateData) => {
    if (!selectedStatus) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/order-tracking/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: selectedStatus,
          notes: data.note,
          metadata: data.metadata,
          updatedBy: 'system',
          updatedByName: 'Staff',
        }),
      })

      if (!response.ok) throw new Error('Failed to update status')

      // Call callback if provided
      if (onStatusUpdate) {
        onStatusUpdate()
      } else {
        // Fallback: refresh the page
        router.refresh()
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update order status. Please try again.')
    } finally {
      setIsUpdating(false)
      setSelectedStatus(null)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenuPos({ x: e.clientX, y: e.clientY })
    setShowContextMenu(true)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const timer = setTimeout(() => {
      const touch = e.touches[0]
      setContextMenuPos({ x: touch.clientX, y: touch.clientY })
      setShowContextMenu(true)
    }, 500) // 500ms for long press
    setLongPressTimer(timer)
  }

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => setShowContextMenu(false)
    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showContextMenu])

  return (
    <div className="relative">
      {/* Domino's Style Tracker */}
      <div
        ref={trackerRef}
        className="relative bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-4 cursor-pointer select-none"
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Progress Bar Container */}
        <div className="relative h-16 bg-white/20 rounded-full overflow-hidden mb-3">
          {/* Animated Progress Fill */}
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          >
            {/* Glossy effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-black/10" />
          </div>

          {/* Stage Labels */}
          <div className="absolute inset-0 flex items-center justify-between px-3">
            {ORDER_STAGES.map((stage, idx) => {
              const isComplete = idx <= currentStage
              const isCurrent = idx === currentStage

              return (
                <div
                  key={stage.status}
                  className="flex flex-col items-center z-10"
                  style={{ flex: 1 }}
                >
                  {/* Stage Number Circle */}
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                      transition-all duration-300 border-2
                      ${isComplete 
                        ? 'bg-white text-blue-600 border-white shadow-lg scale-110' 
                        : 'bg-gray-300/50 text-gray-600 border-gray-400'
                      }
                      ${isCurrent ? 'ring-4 ring-white/50 animate-pulse' : ''}
                    `}
                  >
                    {idx + 1}
                  </div>

                  {/* Stage Label */}
                  <span
                    className={`
                      text-xs font-semibold mt-1 text-center
                      ${isComplete ? 'text-white drop-shadow-md' : 'text-gray-300'}
                    `}
                  >
                    {stage.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Status Message */}
        <div className="text-center text-white">
          <p className="text-lg font-bold">
            {ORDER_STAGES[currentStage]?.label.toUpperCase() || 'PROCESSING'}
          </p>
          <p className="text-sm text-white/80 mt-1">
            Order #{orderNumber}
          </p>
        </div>

        {/* Tooltip */}
        <div className="absolute bottom-2 right-4 text-xs text-white/70">
          Click to advance • Long press for options
        </div>
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <div
          className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 min-w-[200px] z-50"
          style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
            Change Status
          </div>
          {ORDER_STAGES.map((stage, idx) => (
            <button
              key={stage.status}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              onClick={() => {
                setSelectedStatus(stage.status)
                setShowContextMenu(false)
                setShowModal(true)
              }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: stage.color }}
              />
              <span className={idx <= currentStage ? 'font-semibold' : ''}>
                {stage.label}
              </span>
              {idx === currentStage && (
                <span className="ml-auto text-xs text-blue-600">Current</span>
              )}
            </button>
          ))}
          <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => {
                console.log('Add note')
                setShowContextMenu(false)
              }}
            >
              📝 Add Note
            </button>
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => {
                console.log('View history')
                setShowContextMenu(false)
              }}
            >
              📊 View History
            </button>
          </div>
        </div>
      )}

      {/* Smart Modal */}
      {showModal && selectedStatus && (
        <SmartModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false)
            setSelectedStatus(null)
          }}
          onConfirm={handleStatusUpdate}
          currentStage={currentStatus}
          nextStage={selectedStatus}
          orderNumber={orderNumber}
        />
      )}
    </div>
  )
}
