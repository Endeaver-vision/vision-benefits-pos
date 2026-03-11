'use client'

import { useState } from 'react'
import { usePOSStore } from '@/stores/pos-store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Percent, DollarSign, Tag, X, Trash2 } from 'lucide-react'

interface DiscountModalProps {
  open: boolean
  onClose: () => void
}

const PRESET_DISCOUNTS = [
  { label: '10%', type: 'percent' as const, amount: 10, reason: '10% Discount' },
  { label: '15%', type: 'percent' as const, amount: 15, reason: '15% Discount' },
  { label: '20%', type: 'percent' as const, amount: 20, reason: '20% Discount' },
  { label: '25%', type: 'percent' as const, amount: 25, reason: '25% Discount' },
  { label: '$25', type: 'fixed' as const, amount: 25, reason: '$25 Off' },
  { label: '$50', type: 'fixed' as const, amount: 50, reason: '$50 Off' },
  { label: '$100', type: 'fixed' as const, amount: 100, reason: '$100 Off' },
]

const DISCOUNT_REASONS = [
  'Courtesy Discount',
  'Employee Discount',
  'Senior Discount',
  'Military/Veteran',
  'Student Discount',
  'Price Match',
  'Manager Approval',
  'Custom',
]

export default function DiscountModal({ open, onClose }: DiscountModalProps) {
  const { quote, addDiscount, removeDiscount } = usePOSStore()

  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('Courtesy Discount')
  const [customReason, setCustomReason] = useState('')

  const handlePresetClick = (preset: (typeof PRESET_DISCOUNTS)[0]) => {
    setDiscountType(preset.type)
    setAmount(preset.amount.toString())
    setReason(preset.reason)
  }

  const handleApply = () => {
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) return

    // Validate percent is not > 100
    if (discountType === 'percent' && numAmount > 100) return

    addDiscount({
      type: discountType,
      amount: numAmount,
      reason: reason === 'Custom' ? customReason : reason,
    })

    // Reset form
    setAmount('')
    setReason('Courtesy Discount')
    setCustomReason('')
    onClose()
  }

  const calculatePreview = () => {
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) return 0

    if (discountType === 'percent') {
      return quote.subtotal * (numAmount / 100)
    }
    return numAmount
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Add Discount
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing discounts */}
          {(quote.discounts?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <Label>Applied Discounts</Label>
              <div className="space-y-1">
                {(quote.discounts ?? []).map((discount, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-green-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">
                        {discount.type === 'percent'
                          ? `${discount.amount}%`
                          : `$${discount.amount.toFixed(2)}`}
                      </span>
                      <span className="text-sm text-green-600">
                        {discount.reason}
                      </span>
                    </div>
                    <button
                      onClick={() => removeDiscount(index)}
                      className="p-1 hover:bg-green-100 rounded"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick presets */}
          <div>
            <Label>Quick Add</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {PRESET_DISCOUNTS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetClick(preset)}
                  className={cn(
                    'py-2 px-3 text-sm font-medium rounded-lg border transition-all',
                    preset.type === 'percent'
                      ? 'border-blue-200 hover:bg-blue-50 hover:border-blue-300'
                      : 'border-green-200 hover:bg-green-50 hover:border-green-300'
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Discount type */}
          <div>
            <Label>Type</Label>
            <RadioGroup
              value={discountType}
              onValueChange={(v) => setDiscountType(v as 'percent' | 'fixed')}
              className="flex gap-4 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="percent" id="percent" />
                <Label htmlFor="percent" className="flex items-center gap-1">
                  <Percent className="h-4 w-4" />
                  Percentage
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed" id="fixed" />
                <Label htmlFor="fixed" className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Fixed Amount
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Amount input */}
          <div>
            <Label>Amount</Label>
            <div className="relative mt-2">
              {discountType === 'fixed' && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  $
                </span>
              )}
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={discountType === 'percent' ? '10' : '25.00'}
                className={cn(discountType === 'fixed' && 'pl-7')}
                min={0}
                max={discountType === 'percent' ? 100 : undefined}
                step={discountType === 'percent' ? 1 : 0.01}
              />
              {discountType === 'percent' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  %
                </span>
              )}
            </div>
            {amount && (
              <p className="text-sm text-green-600 mt-1">
                Saves: ${calculatePreview().toFixed(2)}
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <Label>Reason</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {DISCOUNT_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={cn(
                    'px-3 py-1 text-sm rounded-full border transition-all',
                    reason === r
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            {reason === 'Custom' && (
              <Input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter reason..."
                className="mt-2"
              />
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={!amount || parseFloat(amount) <= 0}
          >
            Apply Discount
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
