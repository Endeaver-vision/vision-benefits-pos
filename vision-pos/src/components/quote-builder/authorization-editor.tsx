'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Pencil, Save } from 'lucide-react'

interface AuthorizationData {
  id: string
  carrier: string
  planName: string
  examCopay: number | null
  materialsCopay: number | null
  frameAllowance: number | null
  frameAllowanceFeatured?: number | null
  frameOverageDiscount: number | null
  contactAllowance: number | null
  contactFittingCovered?: boolean
}

interface AuthorizationEditorProps {
  customerId: string
  authorization: AuthorizationData
  onUpdate: () => void
}

export function AuthorizationEditor({
  customerId,
  authorization,
  onUpdate
}: AuthorizationEditorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Editable fields
  const [examCopay, setExamCopay] = useState<string>(
    authorization.examCopay?.toString() || ''
  )
  const [materialsCopay, setMaterialsCopay] = useState<string>(
    authorization.materialsCopay?.toString() || ''
  )
  const [frameAllowance, setFrameAllowance] = useState<string>(
    authorization.frameAllowance?.toString() || ''
  )
  const [frameOverageDiscount, setFrameOverageDiscount] = useState<string>(
    authorization.frameOverageDiscount ? (authorization.frameOverageDiscount * 100).toString() : ''
  )
  const [contactAllowance, setContactAllowance] = useState<string>(
    authorization.contactAllowance?.toString() || ''
  )

  const handleOpen = () => {
    // Reset form values to current authorization
    setExamCopay(authorization.examCopay?.toString() || '')
    setMaterialsCopay(authorization.materialsCopay?.toString() || '')
    setFrameAllowance(authorization.frameAllowance?.toString() || '')
    setFrameOverageDiscount(
      authorization.frameOverageDiscount ? (authorization.frameOverageDiscount * 100).toString() : ''
    )
    setContactAllowance(authorization.contactAllowance?.toString() || '')
    setError(null)
    setIsOpen(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      const updates: Record<string, number | null> = {}

      // Parse and validate fields
      if (examCopay !== (authorization.examCopay?.toString() || '')) {
        updates.examCopay = examCopay ? parseFloat(examCopay) : null
      }
      if (materialsCopay !== (authorization.materialsCopay?.toString() || '')) {
        updates.materialsCopay = materialsCopay ? parseFloat(materialsCopay) : null
      }
      if (frameAllowance !== (authorization.frameAllowance?.toString() || '')) {
        updates.frameAllowance = frameAllowance ? parseFloat(frameAllowance) : null
      }
      if (contactAllowance !== (authorization.contactAllowance?.toString() || '')) {
        updates.contactAllowance = contactAllowance ? parseFloat(contactAllowance) : null
      }

      // Handle frame overage discount (convert from percentage)
      const currentOverage = authorization.frameOverageDiscount ? (authorization.frameOverageDiscount * 100).toString() : ''
      if (frameOverageDiscount !== currentOverage) {
        updates.frameOverageDiscount = frameOverageDiscount ? parseFloat(frameOverageDiscount) / 100 : null
      }

      if (Object.keys(updates).length === 0) {
        setIsOpen(false)
        return
      }

      const response = await fetch(`/api/customers/${customerId}/authorization`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carrier: authorization.carrier.toLowerCase(),
          authorizationId: authorization.id,
          updates,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to update authorization')
      }

      // Notify parent to refresh
      onUpdate()
      setIsOpen(false)
    } catch (err) {
      console.error('Error updating authorization:', err)
      setError(err instanceof Error ? err.message : 'Failed to update authorization')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        className="text-white/60 hover:text-white hover:bg-white/10"
      >
        <Pencil className="h-4 w-4 mr-1" />
        Edit
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-slate-900 border-white/20 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Authorization</DialogTitle>
            <DialogDescription className="text-white/60">
              Update insurance benefit values for {authorization.carrier.toUpperCase()} - {authorization.planName}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Exam Copay */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="examCopay" className="text-right text-white/80">
                Exam Copay
              </Label>
              <div className="col-span-3 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">$</span>
                <Input
                  id="examCopay"
                  type="number"
                  step="1"
                  min="0"
                  value={examCopay}
                  onChange={(e) => setExamCopay(e.target.value)}
                  className="pl-7 bg-white/10 border-white/30 text-white"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Materials Copay */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="materialsCopay" className="text-right text-white/80">
                Materials Copay
              </Label>
              <div className="col-span-3 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">$</span>
                <Input
                  id="materialsCopay"
                  type="number"
                  step="1"
                  min="0"
                  value={materialsCopay}
                  onChange={(e) => setMaterialsCopay(e.target.value)}
                  className="pl-7 bg-white/10 border-white/30 text-white"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Frame Allowance */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="frameAllowance" className="text-right text-white/80">
                Frame Allowance
              </Label>
              <div className="col-span-3 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">$</span>
                <Input
                  id="frameAllowance"
                  type="number"
                  step="1"
                  min="0"
                  value={frameAllowance}
                  onChange={(e) => setFrameAllowance(e.target.value)}
                  className="pl-7 bg-white/10 border-white/30 text-white"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Frame Overage Discount */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="frameOverageDiscount" className="text-right text-white/80">
                Overage Discount
              </Label>
              <div className="col-span-3 relative">
                <Input
                  id="frameOverageDiscount"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={frameOverageDiscount}
                  onChange={(e) => setFrameOverageDiscount(e.target.value)}
                  className="pr-7 bg-white/10 border-white/30 text-white"
                  placeholder="20"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50">%</span>
              </div>
            </div>

            {/* Contact Allowance */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contactAllowance" className="text-right text-white/80">
                Contact Allowance
              </Label>
              <div className="col-span-3 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">$</span>
                <Input
                  id="contactAllowance"
                  type="number"
                  step="1"
                  min="0"
                  value={contactAllowance}
                  onChange={(e) => setContactAllowance(e.target.value)}
                  className="pl-7 bg-white/10 border-white/30 text-white"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="col-span-4 p-3 bg-red-500/20 border border-red-400/50 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="border-white/30 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
