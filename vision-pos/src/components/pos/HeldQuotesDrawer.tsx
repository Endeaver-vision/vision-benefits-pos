'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePOSStore } from '@/stores/pos-store'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Pause,
  Clock,
  User,
  DollarSign,
  Trash2,
  ArrowRight,
  Loader2,
  RefreshCw,
  FileText,
} from 'lucide-react'

interface HeldQuote {
  id: string
  quoteNumber: string
  status: string
  grandTotal: number
  patientTotal: number
  expiresAt: string
  createdAt: string
  customer?: {
    firstName: string
    lastName: string
  }
}

interface HeldQuotesDrawerProps {
  open: boolean
  onClose: () => void
}

export default function HeldQuotesDrawer({
  open,
  onClose,
}: HeldQuotesDrawerProps) {
  const { loadQuote, newQuote } = usePOSStore()

  const [quotes, setQuotes] = useState<HeldQuote[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingQuote, setLoadingQuote] = useState<string | null>(null)

  const fetchHeldQuotes = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch all recent draft quotes (held quotes)
      const response = await fetch('/api/quotes/held')
      if (response.ok) {
        const data = await response.json()
        setQuotes(data.quotes || [])
      }
    } catch (error) {
      console.error('Failed to fetch held quotes:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchHeldQuotes()
    }
  }, [open, fetchHeldQuotes])

  const handleRecall = async (quoteId: string) => {
    setLoadingQuote(quoteId)
    try {
      // Clear current quote first
      newQuote()
      // Load the held quote
      await loadQuote(quoteId)
      onClose()
    } catch (error) {
      console.error('Failed to recall quote:', error)
    } finally {
      setLoadingQuote(null)
    }
  }

  const handleDelete = async (quoteId: string) => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setQuotes((prev) => prev.filter((q) => q.id !== quoteId))
      }
    } catch (error) {
      console.error('Failed to delete quote:', error)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) {
      return `${diffMins}m ago`
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const getExpiryStatus = (expiresAt: string) => {
    const expiry = new Date(expiresAt)
    const now = new Date()
    const diffDays = Math.ceil(
      (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffDays < 0) {
      return { label: 'Expired', color: 'bg-red-100 text-red-700' }
    } else if (diffDays <= 3) {
      return { label: `${diffDays}d left`, color: 'bg-orange-100 text-orange-700' }
    } else if (diffDays <= 7) {
      return { label: `${diffDays}d left`, color: 'bg-yellow-100 text-yellow-700' }
    } else {
      return { label: `${diffDays}d left`, color: 'bg-green-100 text-green-700' }
    }
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[400px] sm:w-[450px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Pause className="h-5 w-5" />
            Held Quotes
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {quotes.length} quote{quotes.length !== 1 ? 's' : ''} on hold
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchHeldQuotes}
            disabled={loading}
          >
            <RefreshCw
              className={cn('h-4 w-4 mr-1', loading && 'animate-spin')}
            />
            Refresh
          </Button>
        </div>

        <div className="mt-4 space-y-3 overflow-y-auto max-h-[calc(100vh-200px)]">
          {loading && quotes.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No held quotes</p>
              <p className="text-sm mt-1">
                Quotes you put on hold will appear here
              </p>
            </div>
          ) : (
            quotes.map((quote) => {
              const expiry = getExpiryStatus(quote.expiresAt)
              const isLoading = loadingQuote === quote.id

              return (
                <div
                  key={quote.id}
                  className="p-4 border rounded-lg hover:border-gray-300 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">
                          {quote.quoteNumber}
                        </span>
                        <Badge className={expiry.color}>{expiry.label}</Badge>
                      </div>
                      {quote.customer && (
                        <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {quote.customer.firstName} {quote.customer.lastName}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        ${quote.patientTotal?.toFixed(2) || quote.grandTotal?.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                        <Clock className="h-3 w-3" />
                        {formatDate(quote.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleRecall(quote.id)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <ArrowRight className="h-4 w-4 mr-1" />
                          Recall
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(quote.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
