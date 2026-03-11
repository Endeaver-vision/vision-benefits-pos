'use client'

import { useState } from 'react'
import { usePOSStore } from '@/stores/pos-store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Mail, Send, Loader2, Check, AlertCircle } from 'lucide-react'

interface EmailQuoteModalProps {
  open: boolean
  onClose: () => void
}

export default function EmailQuoteModal({ open, onClose }: EmailQuoteModalProps) {
  const { quote } = usePOSStore()
  const [email, setEmail] = useState(quote.patient?.email || '')
  const [subject, setSubject] = useState('Your Quote from Vision POS')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Early return if not open to prevent calculations on undefined data
  if (!open) {
    return null
  }

  const handleSend = async () => {
    if (!email) {
      setError('Please enter an email address')
      return
    }

    setSending(true)
    setError(null)

    try {
      // First save the quote to get an ID
      const saveResponse = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: quote.patient?.id,
          items: (quote.lineItems ?? []).map((item) => ({
            sku: item.productId,
            displayName: item.name,
            category: item.category,
            retailPrice: item.retailPrice,
            patientPays: item.patientPays,
            insurancePays: item.insurancePays,
            quantity: item.quantity,
          })),
          totals: {
            subtotal: quote.subtotal,
            insuranceSavings: quote.insuranceSavings,
            discountTotal: quote.discountTotal,
            tax: quote.tax,
            total: quote.total,
          },
          status: 'DRAFT',
        }),
      })

      if (!saveResponse.ok) {
        throw new Error('Failed to save quote')
      }

      const { id: quoteId } = await saveResponse.json()

      // Send email
      const emailResponse = await fetch(`/api/quotes/${quoteId}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          subject,
          message,
        }),
      })

      if (!emailResponse.ok) {
        throw new Error('Failed to send email')
      }

      setSent(true)
      setTimeout(() => {
        onClose()
        setSent(false)
        setMessage('')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Quote
          </DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-green-700">Email Sent!</h3>
            <p className="text-gray-500 mt-1">Quote sent to {email}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
              />
            </div>

            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="message">Personal Message (optional)</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a personal note to the customer..."
                rows={3}
              />
            </div>

            {/* Quote preview */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-sm text-gray-700 mb-2">Quote Summary</h4>
              <div className="text-sm text-gray-600">
                <p>{(quote.lineItems ?? []).length} items</p>
                <p className="font-semibold text-lg text-green-600 mt-1">
                  Total: ${quote.total.toFixed(2)}
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={handleSend}
                disabled={sending || !email}
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
