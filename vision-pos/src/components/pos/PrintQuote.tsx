'use client'

import { useEffect, useRef } from 'react'
import { usePOSStore } from '@/stores/pos-store'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, X } from 'lucide-react'

interface PrintQuoteProps {
  open: boolean
  onClose: () => void
}

/**
 * Print-optimized quote view
 * Opens a dialog with print-friendly styling and triggers browser print
 */
export default function PrintQuote({ open, onClose }: PrintQuoteProps) {
  const { quote } = usePOSStore()
  const printRef = useRef<HTMLDivElement>(null)

  // Early return if not open to prevent calculations on undefined data
  if (!open) {
    return null
  }

  const {
    pairs = [],
    lineItems = [],
    patient,
    subtotal = 0,
    insuranceSavings = 0,
    discountTotal = 0,
    tax = 0,
    total = 0
  } = quote

  // Group items by pair
  const itemsByPair = (pairs ?? []).map((pair) => ({
    pair,
    items: lineItems.filter((item) => item.pairId === pair.id),
    total: lineItems
      .filter((item) => item.pairId === pair.id)
      .reduce((sum, item) => sum + item.patientPays, 0),
  }))

  const retailTotal = lineItems.reduce((sum, item) => sum + item.retailPrice, 0)

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quote - Vision POS</title>
        <style>
          @page { margin: 0.5in; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #1a1a1a;
            font-size: 12px;
            line-height: 1.5;
          }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 5px 0 0; color: #666; }
          .customer { margin-bottom: 20px; }
          .customer strong { font-size: 14px; }
          .pair-section { margin-bottom: 15px; }
          .pair-header { font-weight: bold; font-size: 14px; margin-bottom: 8px; padding: 5px; background: #f5f5f5; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th { text-align: left; border-bottom: 1px solid #333; padding: 5px 0; }
          td { padding: 4px 0; border-bottom: 1px solid #eee; }
          .price { text-align: right; }
          .totals { margin-top: 20px; border-top: 2px solid #333; padding-top: 10px; }
          .total-row { display: flex; justify-content: space-between; padding: 3px 0; }
          .total-row.savings { color: #16a34a; }
          .total-row.discount { color: #ea580c; }
          .grand-total { font-size: 18px; font-weight: bold; margin-top: 10px; padding-top: 10px; border-top: 1px solid #333; }
          .grand-total .amount { color: #16a34a; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; }
          .signature-line { margin-top: 40px; border-top: 1px solid #333; width: 200px; text-align: center; padding-top: 5px; }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()

    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Print Preview</h2>
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Print content */}
        <div ref={printRef} className="bg-white p-6 border rounded-lg">
          {/* Header */}
          <div className="header">
            <h1>Vision POS</h1>
            <p>Quote</p>
            <p style={{ fontSize: '10px', marginTop: '5px' }}>
              Date: {new Date().toLocaleDateString()}
            </p>
          </div>

          {/* Customer info */}
          <div className="customer">
            <strong>Prepared For:</strong>
            <div>
              {patient ? `${patient.firstName} ${patient.lastName}` : 'Guest'}
            </div>
          </div>

          {/* Items by pair */}
          {itemsByPair.map(
            ({ pair, items, total: pairTotal }) =>
              items.length > 0 && (
                <div key={pair.id} className="pair-section">
                  <div className="pair-header">{pair.label}</div>
                  <table>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th className="price">Retail</th>
                        <th className="price">Your Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.name}</td>
                          <td className="price">${item.retailPrice.toFixed(2)}</td>
                          <td className="price">${item.patientPays.toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={2}>
                          <strong>{pair.label} Subtotal</strong>
                        </td>
                        <td className="price">
                          <strong>${pairTotal.toFixed(2)}</strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )
          )}

          {/* Totals */}
          <div className="totals">
            <div className="total-row">
              <span>Retail Value:</span>
              <span>${retailTotal.toFixed(2)}</span>
            </div>
            {insuranceSavings > 0 && (
              <div className="total-row savings">
                <span>Insurance Savings:</span>
                <span>-${insuranceSavings.toFixed(2)}</span>
              </div>
            )}
            {discountTotal > 0 && (
              <div className="total-row discount">
                <span>Discounts:</span>
                <span>-${discountTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="total-row">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="total-row">
              <span>Tax (8.75%):</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="grand-total">
              <div className="total-row">
                <span>Total:</span>
                <span className="amount">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Signature line */}
          <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between' }}>
            <div className="signature-line">
              <div style={{ height: '30px' }}></div>
              <span>Customer Signature</span>
            </div>
            <div className="signature-line">
              <div style={{ height: '30px' }}></div>
              <span>Date</span>
            </div>
          </div>

          {/* Footer */}
          <div className="footer">
            <p>Thank you for choosing Vision POS!</p>
            <p>Quote valid for 30 days from date of issue.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
