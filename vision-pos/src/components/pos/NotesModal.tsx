'use client'

import { useState, useEffect } from 'react'
import { usePOSStore } from '@/stores/pos-store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { StickyNote, Clock } from 'lucide-react'

interface NotesModalProps {
  open: boolean
  onClose: () => void
}

const QUICK_NOTES = [
  'Patient needs remeasure',
  'Frame adjustment needed',
  'Call when ready',
  'Rush order requested',
  'Patient has questions about warranty',
  'Prescription expires soon',
  'Second pair pickup',
  'Insurance recheck needed',
  'Lab notes: ',
  'Special instructions: ',
]

export default function NotesModal({ open, onClose }: NotesModalProps) {
  const { quote, setNotes } = usePOSStore()
  const [localNotes, setLocalNotes] = useState('')

  // Sync with quote notes when modal opens
  useEffect(() => {
    if (open) {
      setLocalNotes(quote.notes)
    }
  }, [open, quote.notes])

  const handleQuickNote = (note: string) => {
    setLocalNotes((prev) => {
      if (prev.trim()) {
        return `${prev}\n${note}`
      }
      return note
    })
  }

  const handleSave = () => {
    setNotes(localNotes)
    onClose()
  }

  const handleClear = () => {
    setLocalNotes('')
  }

  const wordCount = localNotes.trim().split(/\s+/).filter(Boolean).length

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5" />
            Order Notes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick notes */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Quick Add
            </label>
            <div className="flex flex-wrap gap-2 mt-2">
              {QUICK_NOTES.map((note) => (
                <button
                  key={note}
                  onClick={() => handleQuickNote(note)}
                  className="px-2 py-1 text-xs rounded-full border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all"
                >
                  {note}
                </button>
              ))}
            </div>
          </div>

          {/* Notes textarea */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Notes</label>
              <span className="text-xs text-gray-400">
                {wordCount} {wordCount === 1 ? 'word' : 'words'}
              </span>
            </div>
            <Textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder="Add notes for this order..."
              className="min-h-[150px] resize-none"
            />
          </div>

          {/* Last updated indicator */}
          {quote.notes && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>
                Previously saved notes exist
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <div className="flex items-center justify-between w-full">
            <Button
              variant="ghost"
              onClick={handleClear}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              Clear All
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save Notes
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
