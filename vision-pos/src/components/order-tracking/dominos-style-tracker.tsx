'use client'

import { useState } from 'react'
import { OrderStatus } from '@/types/order-tracking'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Edit2, Check, X, Clock, MessageSquare, CheckCircle2, Phone, Mail, Plus, Send, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface StatusHistory {
  id: string
  status: string
  previousStatus: string | null
  timestamp: Date
  updatedBy: string
  updatedByName: string | null
}

interface Communication {
  id: string
  type: string
  message: string
  timestamp: Date
  sentBy: string | null
  sentByName: string | null
}

interface QualityCheck {
  id: string
  passed: boolean
  notes: string | null
  performedAt: Date
  performedBy: string
  performedByName: string | null
}

interface DominosStyleTrackerProps {
  orderId: string
  currentStatus: OrderStatus
  orderNumber: string
  customerName: string
  customerEmail?: string
  customerPhone?: string | null
  items: Array<{ description?: string | null; type: string }>
  totalAmount?: number | null
  estimatedCompletion?: Date | null
  orderDate: Date
  statusHistory?: StatusHistory[]
  communications?: Communication[]
  qualityChecks?: QualityCheck[]
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

// Helper function to determine order type from items
function getOrderType(items: Array<{ description?: string | null; type: string }>) {
  if (items.length === 0) return { icon: '📦', label: 'Order' }
  if (items.length > 2) return { icon: '📦', label: 'Multiple Items' }
  
  const types = items.map(item => item.type.toLowerCase())
  const descriptions = items.map(item => (item.description || '').toLowerCase())
  
  // Check for specific types
  if (types.some(t => t.includes('contact')) || descriptions.some(d => d.includes('contact'))) {
    return { icon: '👁️', label: 'Contact Lenses' }
  }
  if (types.some(t => t.includes('frame')) && types.some(t => t.includes('lens'))) {
    return { icon: '👓', label: 'Complete Eyeglasses' }
  }
  if (types.some(t => t.includes('lens'))) {
    return { icon: '🔍', label: 'Lenses Only' }
  }
  if (types.some(t => t.includes('frame'))) {
    return { icon: '🎯', label: 'Frame Only' }
  }
  if (types.some(t => t.includes('service')) || types.some(t => t.includes('exam'))) {
    return { icon: '⚕️', label: 'Medical Services' }
  }
  
  return { icon: '📦', label: 'Order' }
}

export function DominosStyleTracker({
  orderId,
  currentStatus,
  orderNumber,
  customerName,
  customerEmail,
  customerPhone,
  items,
  totalAmount,
  estimatedCompletion,
  orderDate,
  statusHistory = [],
  communications = [],
  qualityChecks = []
}: DominosStyleTrackerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditingDate, setIsEditingDate] = useState(false)
  const [editedDate, setEditedDate] = useState(estimatedCompletion?.toISOString().split('T')[0] || '')
  const [isUpdating, setIsUpdating] = useState(false)
  const [updatingStage, setUpdatingStage] = useState<number | null>(null)
  const [showCommModal, setShowCommModal] = useState(false)
  const [showQCModal, setShowQCModal] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
  const [commForm, setCommForm] = useState({ type: 'NOTE', message: '', recipient: '' })
  const [qcForm, setQCForm] = useState({ passed: true, notes: '' })
  const router = useRouter()

  const currentStage = STATUS_MAP[currentStatus] || 0
  const orderType = getOrderType(items)

  const updateStatus = async (newStageIndex: number) => {
    if (isUpdating) return // Prevent multiple simultaneous updates
    
    const newStatus = STAGE_TO_STATUS[newStageIndex]
    setIsUpdating(true)
    setUpdatingStage(newStageIndex)
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
      setUpdatingStage(null)
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

  const handleAddCommunication = async () => {
    try {
      const response = await fetch(`/api/order-tracking/${orderId}/communications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: commForm.type,
          message: commForm.message,
          sentBy: 'current-user',
          sentByName: 'Staff',
        }),
      })
      
      if (!response.ok) throw new Error('Failed to add communication')
      setShowCommModal(false)
      setCommForm({ type: 'NOTE', message: '', recipient: '' })
      router.refresh()
    } catch (error) {
      console.error('Error adding communication:', error)
      alert('Failed to add communication.')
    }
  }

  const handleAddQC = async () => {
    try {
      const response = await fetch(`/api/order-tracking/${orderId}/quality-checks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passed: qcForm.passed,
          notes: qcForm.notes,
          performedBy: 'current-user',
          performedByName: 'Staff',
        }),
      })
      
      if (!response.ok) throw new Error('Failed to add quality check')
      setShowQCModal(false)
      setQCForm({ passed: true, notes: '' })
      router.refresh()
    } catch (error) {
      console.error('Error adding quality check:', error)
      alert('Failed to add quality check.')
    }
  }

  const toggleItemExpand = (idx: number) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(idx)) {
      newExpanded.delete(idx)
    } else {
      newExpanded.add(idx)
    }
    setExpandedItems(newExpanded)
  }

  // Filter communications to exclude status updates
  const filteredCommunications = communications.filter(comm => 
    !comm.message?.toLowerCase().includes('status') && 
    !comm.message?.toLowerCase().includes('advanced') &&
    !comm.message?.toLowerCase().includes('reverted')
  )

  return (
    <div className="space-y-0" onClick={(e) => e.stopPropagation()}>
      {/* Enhanced Header Banner */}
      <div className="flex items-center justify-between bg-gradient-to-r from-green-600 to-emerald-500 text-white px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{orderType.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Order #{orderNumber}</span>
              <span className="text-xs px-2 py-0.5 bg-white/20 rounded">
                {ORDER_STAGES[currentStage]}
              </span>
            </div>
            <div className="text-xs opacity-90 mt-0.5">
              {orderType.label} • Patient: {customerName}
            </div>
          </div>
        </div>
        <div className="text-right text-xs">
          <div className="font-medium">Placed</div>
          <div className="opacity-90">{new Date(orderDate).toLocaleDateString()}</div>
        </div>
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

        {/* Compact Pill Progress Bar - CLICKABLE SEGMENTS */}
        <div 
          className="relative h-12 bg-slate-900/40 rounded-full overflow-hidden border border-white/5"
        >
          {/* Gradient Fill - Aligned perfectly with stages */}
          <div className="absolute inset-0 flex">
            {ORDER_STAGES.map((_, idx) => {
              const isComplete = idx <= currentStage
              
              return (
                <div
                  key={idx}
                  className="relative flex-1 transition-all duration-700 cursor-pointer hover:brightness-110"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!isUpdating && idx !== currentStage) {
                      updateStatus(idx)
                    }
                  }}
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
                  {/* Vertical Separator - only on completed sections */}
                  {idx > 0 && isComplete && (
                    <div 
                      className="absolute left-0 top-1 bottom-1 w-[1px] bg-gray-400/50"
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* Stage Numbers with Diagonal Separators */}
          <div className="absolute inset-0 flex pointer-events-none">
            {ORDER_STAGES.map((stage, idx) => {
              const isComplete = idx < currentStage
              const isCurrent = idx === currentStage
              
              return (
                <div key={idx} className="relative flex-1 flex items-center justify-center">
                  {/* Vertical Separator - only on completed sections */}
                  {idx > 0 && isComplete && (
                    <div 
                      className="absolute left-0 top-1 bottom-1 w-[1px] bg-gray-400/50"
                    />
                  )}
                  
                  {/* Subdued grayish numbers or spinner */}
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
                    {updatingStage === idx ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      idx + 1
                    )}
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
          <p className="text-[10px] text-white/60 mt-0.5">Click any stage above to jump to that step</p>
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

      {/* Expanded Details - Enhanced & Comprehensive */}
      {isExpanded && (
        <div className="bg-gradient-to-r from-blue-950/80 to-blue-900/80 p-4 space-y-4 border-t border-white/10">
          {/* Basic Info Grid */}
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

          {/* Customer Contact Info */}
          <div className="border-t border-white/10 pt-3">
            <p className="text-xs font-semibold mb-2 text-emerald-400 flex items-center gap-1.5">
              <Mail className="h-3 w-3" />
              Customer Contact
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {customerEmail && (
                <div>
                  <p className="text-white/60">Email</p>
                  <p className="font-medium text-white text-[10px]">{customerEmail}</p>
                </div>
              )}
              {customerPhone && (
                <div>
                  <p className="text-white/60">Phone</p>
                  <p className="font-medium text-white">{customerPhone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Order Items Details - Expandable */}
          {items.length > 0 && (
            <div className="border-t border-white/10 pt-3">
              <p className="text-xs font-semibold mb-2 text-blue-400">📦 Order Items</p>
              <div className="space-y-1.5">
                {items.map((item, idx) => {
                  const isExpanded = expandedItems.has(idx)
                  return (
                    <div 
                      key={idx}
                      className="rounded text-xs bg-white/5 text-white/90 border border-white/10 overflow-hidden"
                    >
                      <button
                        onClick={() => toggleItemExpand(idx)}
                        className="w-full px-2 py-1.5 flex items-center justify-between hover:bg-white/5 transition-colors"
                      >
                        <div className="font-medium text-left">{item.type}</div>
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                      {isExpanded && item.description && (
                        <div className="px-2 pb-2 text-[10px] text-white/70 border-t border-white/10 pt-2 bg-white/5">
                          <p className="whitespace-pre-wrap">{item.description}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Status History */}
          {statusHistory.length > 0 && (
            <div className="border-t border-white/10 pt-3">
              <p className="text-xs font-semibold mb-2 text-purple-400 flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                Status History
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {statusHistory.map((history) => (
                  <div key={history.id} className="text-[10px] text-white/70 flex items-start gap-2">
                    <span className="text-white/50">{new Date(history.timestamp).toLocaleString()}</span>
                    <span className="flex-1">
                      {history.previousStatus || 'NEW'} → {history.status}
                      {history.updatedByName && (
                        <span className="text-white/50 ml-1">
                          by {history.updatedByName}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Communications - Editable */}
          <div className="border-t border-white/10 pt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                <MessageSquare className="h-3 w-3" />
                Communications
              </p>
              <Button
                onClick={() => setShowCommModal(true)}
                size="sm"
                className="h-6 text-[10px] bg-cyan-600 hover:bg-cyan-700"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
            {filteredCommunications.length > 0 ? (
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {filteredCommunications.map((comm) => (
                  <div key={comm.id} className="px-2 py-1.5 bg-white/5 rounded text-[10px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-cyan-300 font-medium">{comm.type}</span>
                      <span className="text-white/50">{new Date(comm.timestamp).toLocaleString()}</span>
                    </div>
                    {comm.message && <p className="text-white/70">{comm.message}</p>}
                    {comm.sentByName && (
                      <p className="text-white/50 mt-1">
                        Sent by {comm.sentByName}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-white/50">No communications yet</p>
            )}
          </div>

          {/* Quality Checks - Interactive */}
          <div className="border-t border-white/10 pt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-green-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3" />
                Quality Checks
              </p>
              <Button
                onClick={() => setShowQCModal(true)}
                size="sm"
                className="h-6 text-[10px] bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-3 w-3 mr-1" />
                Perform QC
              </Button>
            </div>
            {qualityChecks.length > 0 ? (
              <div className="space-y-1.5">
                {qualityChecks.map((qc) => (
                  <div key={qc.id} className="px-2 py-1.5 bg-white/5 rounded text-[10px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-white">
                        Quality Check - {qc.passed ? '✅ Passed' : '❌ Failed'}
                      </span>
                      <span className="text-white/50">{new Date(qc.performedAt).toLocaleString()}</span>
                    </div>
                    {qc.notes && <p className="text-white/70">{qc.notes}</p>}
                    {qc.performedByName && (
                      <p className="text-white/50 mt-1">
                        By {qc.performedByName}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-white/50">No quality checks yet</p>
            )}
          </div>
        </div>
      )}

      {/* Communication Modal */}
      {showCommModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCommModal(false)}>
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Add Communication</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-white/70 mb-1 block">Type</label>
                <select
                  value={commForm.type}
                  onChange={(e) => setCommForm({ ...commForm, type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-white/20 rounded text-white text-sm"
                >
                  <option value="NOTE">Note</option>
                  <option value="EMAIL">Email</option>
                  <option value="SMS">SMS</option>
                  <option value="CALL">Phone Call</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-white/70 mb-1 block">Message</label>
                <Textarea
                  value={commForm.message}
                  onChange={(e) => setCommForm({ ...commForm, message: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-white/20 rounded text-white text-sm min-h-24"
                  placeholder="Enter your message..."
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  onClick={() => setShowCommModal(false)}
                  variant="outline"
                  className="bg-slate-700 hover:bg-slate-600 text-white border-white/20"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddCommunication}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                  disabled={!commForm.message.trim()}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quality Check Modal */}
      {showQCModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowQCModal(false)}>
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Perform Quality Check</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-white/70 mb-2 block">Result</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setQCForm({ ...qcForm, passed: true })}
                    className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors ${
                      qcForm.passed
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-700 text-white/60 hover:bg-slate-600'
                    }`}
                  >
                    ✅ Pass
                  </button>
                  <button
                    onClick={() => setQCForm({ ...qcForm, passed: false })}
                    className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors ${
                      !qcForm.passed
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-700 text-white/60 hover:bg-slate-600'
                    }`}
                  >
                    ❌ Fail
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm text-white/70 mb-1 block">Notes</label>
                <Textarea
                  value={qcForm.notes}
                  onChange={(e) => setQCForm({ ...qcForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-white/20 rounded text-white text-sm min-h-24"
                  placeholder="Add any notes or issues found..."
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  onClick={() => setShowQCModal(false)}
                  variant="outline"
                  className="bg-slate-700 hover:bg-slate-600 text-white border-white/20"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddQC}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Submit
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
