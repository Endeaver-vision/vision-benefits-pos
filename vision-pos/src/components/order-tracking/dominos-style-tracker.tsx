'use client'

import { useState } from 'react'
import { OrderStatus } from '@/types/order-tracking'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Edit2, Check, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface DominosStyleTrackerProps {
  orderId: string
  currentStatus: OrderStatus
  orderNumber: string
  customerName: string
  items: Array<{ description?: string | null; type: string }>
  totalAmount?: number | null
  estimatedCompletion?: Date | null
  orderDate: Date
}

const ORDER_STAGES = [
  'Invoice',
  'Order Placed',
  'Shipped to Vendor',
  'Vendor Processing',
  'Vendor Shipped',
  'Received',
  'QC',
  'Patient Notified'
]

const STATUS_MAP: Record<OrderStatus, number> = {
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
  'CANCELLED': 0,
  'ON_HOLD': 0,
}

const STAGE_TO_STATUS = [
  'SUBMITTED',
  'CONFIRMED',
  'SHIPPED_TO_VENDOR',
  'VENDOR_PROCESSING',
  'VENDOR_SHIPPED',
  'RECEIVED',
  'QUALITY_CHECK',
  'PATIENT_NOTIFIED'
]

export function DominosStyleTracker({
  orderId,
  currentStatus,
  orderNumber,
  customerName,
  items,
  totalAmount,
  estimatedCompletion,
  orderDate
}: DominosStyleTrackerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditingDate, setIsEditingDate] = useState(false)
  const [editedDate, setEditedDate] = useState(estimatedCompletion?.toISOString().split('T')[0] || '')
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const router = useRouter()

  const currentStage = STATUS_MAP[currentStatus] || 0
  const nextStageIndex = currentStage < ORDER_STAGES.length - 1 ? currentStage + 1 : null
  const prevStageIndex = currentStage > 0 ? currentStage - 1 : null

  const updateStatus = async (newStageIndex: number) => {
    if (isUpdating) return // Prevent multiple simultaneous updates
    
    const newStatus = STAGE_TO_STATUS[newStageIndex]
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/order-tracking/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          notes: `Status ${currentStage < newStageIndex ? 'advanced' : 'reverted'} to ${ORDER_STAGES[newStageIndex]}`,
          updatedBy: 'system',
          updatedByName: 'Staff',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('API Error:', errorData)
        throw new Error(errorData.error || 'Failed to update status')
      }
      router.refresh()
    } catch (error) {
      console.error('Error updating status:', error)
      alert(`Failed to update order status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleBarClick = () => {
    if (nextStageIndex !== null && !isUpdating) {
      updateStatus(nextStageIndex)
    }
  }

  const handleBarRightClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (prevStageIndex !== null && !isUpdating) {
      updateStatus(prevStageIndex)
    }
  }

  const handleTouchStart = () => {
    if (isUpdating) return
    const timer = setTimeout(() => {
      if (prevStageIndex !== null) {
        updateStatus(prevStageIndex)
      }
    }, 800)
    setLongPressTimer(timer)
  }

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      if (nextStageIndex !== null && !isUpdating) {
        updateStatus(nextStageIndex)
      }
      setLongPressTimer(null)
    }
  }

  const handleDateSave = async () => {
    try {
      // Update estimated completion via API
      const response = await fetch(`/api/order-tracking/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estimatedCompletion: editedDate ? new Date(editedDate) : null,
        }),
      })
      
      if (!response.ok) throw new Error('Failed to update date')
      setIsEditingDate(false)
      router.refresh()
    } catch (error) {
      console.error('Error updating date:', error)
      alert('Failed to update estimated completion.')
    }
  }

  return (
    <div className="space-y-0" onClick={(e) => e.stopPropagation()}>
      {/* Compact Status Bar */}
      <div className="flex items-center justify-between bg-gradient-to-r from-green-600 to-emerald-500 text-white px-4 py-1.5 text-xs font-semibold">
        <span>{ORDER_STAGES[currentStage]}</span>
        <span className="opacity-90">Order #{orderNumber}</span>
      </div>

      {/* Main Tracker Container - Dark Blue Gradient */}
      <div className="bg-gradient-to-br from-slate-800 via-blue-900 to-slate-900 p-4">
        {/* Stage Labels ABOVE bar */}
        <div className="relative mb-2">
          <div className="flex">
            {ORDER_STAGES.map((stage, idx) => (
              <div key={idx} className="flex-1 text-center">
                <div className="text-[9px] font-bold text-white/70 uppercase tracking-wide">
                  {stage}
                </div>
              </div>
            ))}
          </div>
          
          {/* Segmented Progress Lines - Thicker with gaps */}
          <div className="relative flex gap-1 mt-1.5 mb-2">
            {ORDER_STAGES.map((_, idx) => (
              <div 
                key={idx}
                className={`flex-1 h-1 rounded-full transition-all duration-500 ${
                  idx <= currentStage 
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-sm shadow-emerald-500/50' 
                    : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Compact Pill Progress Bar - CLICKABLE */}
        <div 
          className="relative h-12 bg-slate-900/40 rounded-full overflow-hidden border border-white/5 cursor-pointer"
          onClick={handleBarClick}
          onContextMenu={handleBarRightClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Gradient Fill - Aligned perfectly with stages */}
          <div className="absolute inset-0 flex">
            {ORDER_STAGES.map((_, idx) => {
              const isComplete = idx <= currentStage
              
              return (
                <div
                  key={idx}
                  className="relative flex-1 transition-all duration-700"
                  style={{
                    background: isComplete 
                      ? `linear-gradient(135deg, ${
                          idx === 0 ? '#ef4444' : 
                          idx === 1 ? '#f97316' :
                          idx === 2 ? '#f59e0b' :
                          idx === 3 ? '#eab308' :
                          idx === 4 ? '#84cc16' :
                          idx === 5 ? '#22c55e' :
                          idx === 6 ? '#10b981' :
                          '#059669'
                        }, ${
                          idx === ORDER_STAGES.length - 1 ? '#059669' :
                          idx === 0 ? '#f97316' :
                          idx === 1 ? '#f59e0b' :
                          idx === 2 ? '#eab308' :
                          idx === 3 ? '#84cc16' :
                          idx === 4 ? '#22c55e' :
                          idx === 5 ? '#10b981' :
                          '#059669'
                        })`
                      : 'transparent'
                  }}
                >
                  {isComplete && (
                    <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent" />
                  )}
                  {/* Diagonal Separator - only on completed sections */}
                  {idx > 0 && isComplete && (
                    <div 
                      className="absolute left-0 top-1 bottom-1 w-[2px] bg-white/30 shadow-sm"
                      style={{ transform: 'skewX(-20deg)' }}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* Stage Numbers with Diagonal Separators */}
          <div className="absolute inset-0 flex">
            {ORDER_STAGES.map((stage, idx) => {
              const isComplete = idx < currentStage
              const isCurrent = idx === currentStage
              
              return (
                <div key={idx} className="relative flex-1 flex items-center justify-center">
                  {/* Diagonal Separator - only on completed sections */}
                  {idx > 0 && isComplete && (
                    <div 
                      className="absolute left-0 top-1 bottom-1 w-[2px] bg-white/25 shadow-sm"
                      style={{ 
                        transform: 'skewX(-20deg)',
                      }}
                    />
                  )}
                  
                  {/* Subdued grayish numbers */}
                  <div
                    className={`
                      relative z-10 text-base font-semibold transition-all duration-300
                      ${isComplete || isCurrent
                        ? 'text-white/90 drop-shadow-md' 
                        : 'text-gray-400/50'
                      }
                      ${isCurrent ? 'scale-110 text-white' : ''}
                    `}
                  >
                    {idx + 1}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Status Message */}
        <div className="text-center text-white mt-3">
          <p className="text-xs font-bold tracking-wide">
            YOUR ORDER IS {ORDER_STAGES[currentStage]?.toUpperCase()}
          </p>
          <p className="text-[10px] text-white/60 mt-0.5">{customerName}</p>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (prevStageIndex !== null && !isUpdating) {
                updateStatus(prevStageIndex)
              }
            }}
            disabled={prevStageIndex === null || isUpdating}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700/70 disabled:bg-slate-800/30 disabled:cursor-not-allowed rounded-lg text-white/80 disabled:text-white/30 text-sm font-medium transition-all"
            title="Go to previous step"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous Step
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (nextStageIndex !== null && !isUpdating) {
                updateStatus(nextStageIndex)
              }
            }}
            disabled={nextStageIndex === null || isUpdating}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600/80 hover:bg-emerald-600 disabled:bg-slate-800/30 disabled:cursor-not-allowed rounded-lg text-white disabled:text-white/30 text-sm font-medium transition-all"
            title="Advance to next step"
          >
            Next Step
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expandable Details - Dark Themed */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-900/50 to-blue-800/50 hover:from-blue-900/70 hover:to-blue-800/70 py-2 transition-colors text-white/80 text-xs"
      >
        <span>{isExpanded ? 'Hide' : 'Show'} Details</span>
        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {/* Expanded Details - Dark Themed */}
      {isExpanded && (
        <div className="bg-gradient-to-r from-blue-950/80 to-blue-900/80 p-4 space-y-3 border-t border-white/10">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-white/60">Order Date</p>
              <p className="font-medium text-white">{orderDate.toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-white/60 flex items-center gap-1">
                Est. Completion
                {!isEditingDate && (
                  <button
                    onClick={() => setIsEditingDate(true)}
                    className="text-emerald-400 hover:text-emerald-300"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                )}
              </p>
              {isEditingDate ? (
                <div className="flex gap-1">
                  <Input
                    type="date"
                    value={editedDate}
                    onChange={(e) => setEditedDate(e.target.value)}
                    className="h-6 text-xs bg-slate-800 border-white/20 text-white"
                  />
                  <button
                    onClick={handleDateSave}
                    className="text-emerald-400 hover:text-emerald-300"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setIsEditingDate(false)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <p className="font-medium text-white">
                  {estimatedCompletion ? estimatedCompletion.toLocaleDateString() : 'TBD'}
                </p>
              )}
            </div>
            <div>
              <p className="text-white/60">Total Amount</p>
              <p className="font-medium text-white">${totalAmount?.toFixed(2) || '0.00'}</p>
            </div>
            <div>
              <p className="text-white/60">Items</p>
              <p className="font-medium text-white">{items.length}</p>
            </div>
          </div>

          {items.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2 text-white/80">Order Items:</p>
              <div className="flex flex-wrap gap-1.5">
                {items.map((item, idx) => (
                  <span 
                    key={idx}
                    className="inline-flex px-2 py-0.5 rounded text-[10px] bg-white/10 text-white/90 border border-white/20"
                  >
                    {item.description || item.type}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
