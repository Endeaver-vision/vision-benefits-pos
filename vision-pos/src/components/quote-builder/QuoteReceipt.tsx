'use client'

import { forwardRef } from 'react'

interface ReceiptItem {
  displayName: string
  category: string
  retailPrice: number
  patientPays: number
  insurancePays: number
  quantity?: number
}

interface SecondPairData {
  enabled: boolean
  frameName: string
  totalDue: number
  discountAmount: number
}

interface ContactLensData {
  enabled: boolean
  lensName: string
  manufacturer: string
  boxesRight: number
  boxesLeft: number
  totalDue: number
  annualSupplyDiscount: number
  insuranceCredit: number
}

interface QuoteReceiptProps {
  customerName: string
  quoteNumber?: string
  orderNumber?: string
  carrier?: string
  planName?: string
  items: ReceiptItem[]
  examItems: ReceiptItem[]
  secondPair?: SecondPairData | null
  contactLenses?: ContactLensData | null
  retailTotal: number
  insuranceTotal: number
  patientTotal: number
  tax: number
  grandTotal: number
}

export const QuoteReceipt = forwardRef<HTMLDivElement, QuoteReceiptProps>(
  function QuoteReceipt(
    {
      customerName,
      quoteNumber,
      orderNumber,
      carrier,
      planName,
      items,
      examItems,
      secondPair,
      contactLenses,
      retailTotal,
      insuranceTotal,
      patientTotal,
      tax,
      grandTotal,
    },
    ref
  ) {
    const formatPrice = (price: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(price)
    }

    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // Group items by category
    const frameItems = items.filter((item) => item.category === 'frame')
    const lensItems = items.filter((item) => item.category === 'lens')
    const coatingItems = items.filter((item) => item.category === 'coating')
    const addonItems = items.filter((item) => item.category === 'addon')

    return (
      <div
        ref={ref}
        className="bg-white text-black p-8 max-w-2xl mx-auto print:p-4 print:max-w-none"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-2xl font-bold">VisionPOS</h1>
          <p className="text-sm text-gray-600">Optical Services Receipt</p>
        </div>

        {/* Quote/Order Info */}
        <div className="flex justify-between mb-6 text-sm">
          <div>
            <p>
              <strong>Date:</strong> {today}
            </p>
            {quoteNumber && (
              <p>
                <strong>Quote #:</strong> {quoteNumber}
              </p>
            )}
            {orderNumber && (
              <p>
                <strong>Order #:</strong> {orderNumber}
              </p>
            )}
          </div>
          <div className="text-right">
            <p>
              <strong>Customer:</strong> {customerName}
            </p>
            {carrier && (
              <p>
                <strong>Insurance:</strong> {carrier}
              </p>
            )}
            {planName && (
              <p>
                <strong>Plan:</strong> {planName}
              </p>
            )}
          </div>
        </div>

        {/* Exam Services */}
        {examItems.length > 0 && (
          <div className="mb-6">
            <h2 className="font-bold text-lg border-b border-gray-300 pb-1 mb-2">
              Exam Services
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1">Service</th>
                  <th className="text-right py-1">Retail</th>
                  <th className="text-right py-1">Insurance</th>
                  <th className="text-right py-1">You Pay</th>
                </tr>
              </thead>
              <tbody>
                {examItems.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="py-1">{item.displayName}</td>
                    <td className="text-right">{formatPrice(item.retailPrice)}</td>
                    <td className="text-right text-green-700">
                      -{formatPrice(item.insurancePays)}
                    </td>
                    <td className="text-right font-medium">
                      {formatPrice(item.patientPays)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Eyeglasses */}
        {(frameItems.length > 0 ||
          lensItems.length > 0 ||
          coatingItems.length > 0 ||
          addonItems.length > 0) && (
          <div className="mb-6">
            <h2 className="font-bold text-lg border-b border-gray-300 pb-1 mb-2">
              Eyeglasses
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1">Item</th>
                  <th className="text-right py-1">Retail</th>
                  <th className="text-right py-1">Insurance</th>
                  <th className="text-right py-1">You Pay</th>
                </tr>
              </thead>
              <tbody>
                {frameItems.map((item, idx) => (
                  <tr key={`frame-${idx}`} className="border-b border-gray-200">
                    <td className="py-1">Frame: {item.displayName}</td>
                    <td className="text-right">{formatPrice(item.retailPrice)}</td>
                    <td className="text-right text-green-700">
                      -{formatPrice(item.insurancePays)}
                    </td>
                    <td className="text-right font-medium">
                      {formatPrice(item.patientPays)}
                    </td>
                  </tr>
                ))}
                {lensItems.map((item, idx) => (
                  <tr key={`lens-${idx}`} className="border-b border-gray-200">
                    <td className="py-1">{item.displayName}</td>
                    <td className="text-right">{formatPrice(item.retailPrice)}</td>
                    <td className="text-right text-green-700">
                      -{formatPrice(item.insurancePays)}
                    </td>
                    <td className="text-right font-medium">
                      {formatPrice(item.patientPays)}
                    </td>
                  </tr>
                ))}
                {coatingItems.map((item, idx) => (
                  <tr key={`coating-${idx}`} className="border-b border-gray-200">
                    <td className="py-1">{item.displayName}</td>
                    <td className="text-right">{formatPrice(item.retailPrice)}</td>
                    <td className="text-right text-green-700">
                      -{formatPrice(item.insurancePays)}
                    </td>
                    <td className="text-right font-medium">
                      {formatPrice(item.patientPays)}
                    </td>
                  </tr>
                ))}
                {addonItems.map((item, idx) => (
                  <tr key={`addon-${idx}`} className="border-b border-gray-200">
                    <td className="py-1">{item.displayName}</td>
                    <td className="text-right">{formatPrice(item.retailPrice)}</td>
                    <td className="text-right text-green-700">
                      -{formatPrice(item.insurancePays)}
                    </td>
                    <td className="text-right font-medium">
                      {formatPrice(item.patientPays)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Second Pair */}
        {secondPair?.enabled && (
          <div className="mb-6">
            <h2 className="font-bold text-lg border-b border-gray-300 pb-1 mb-2">
              Second Pair
            </h2>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-1">{secondPair.frameName}</td>
                  <td className="text-right">
                    {secondPair.discountAmount > 0 && (
                      <span className="text-green-700 mr-2">
                        Save {formatPrice(secondPair.discountAmount)}
                      </span>
                    )}
                  </td>
                  <td className="text-right font-medium">
                    {formatPrice(secondPair.totalDue)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Contact Lenses */}
        {contactLenses?.enabled && (
          <div className="mb-6">
            <h2 className="font-bold text-lg border-b border-gray-300 pb-1 mb-2">
              Contact Lenses
            </h2>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-1">
                    {contactLenses.lensName}
                    <br />
                    <span className="text-xs text-gray-600">
                      {contactLenses.manufacturer} • {contactLenses.boxesRight} boxes
                      OD, {contactLenses.boxesLeft} boxes OS
                    </span>
                  </td>
                  <td className="text-right font-medium">
                    {formatPrice(contactLenses.totalDue)}
                  </td>
                </tr>
                {contactLenses.annualSupplyDiscount > 0 && (
                  <tr>
                    <td className="py-1 text-green-700 text-sm">
                      Annual Supply Discount
                    </td>
                    <td className="text-right text-green-700">
                      -{formatPrice(contactLenses.annualSupplyDiscount)}
                    </td>
                  </tr>
                )}
                {contactLenses.insuranceCredit > 0 && (
                  <tr>
                    <td className="py-1 text-green-700 text-sm">
                      Insurance Credit Applied
                    </td>
                    <td className="text-right text-green-700">
                      -{formatPrice(contactLenses.insuranceCredit)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals */}
        <div className="border-t-2 border-black pt-4 mt-6">
          <table className="w-full">
            <tbody>
              <tr>
                <td className="py-1">Retail Total</td>
                <td className="text-right">{formatPrice(retailTotal)}</td>
              </tr>
              {insuranceTotal > 0 && (
                <tr className="text-green-700">
                  <td className="py-1">Insurance Savings</td>
                  <td className="text-right">-{formatPrice(insuranceTotal)}</td>
                </tr>
              )}
              <tr>
                <td className="py-1">Subtotal</td>
                <td className="text-right">{formatPrice(patientTotal)}</td>
              </tr>
              <tr>
                <td className="py-1">Tax (8.75%)</td>
                <td className="text-right">{formatPrice(tax)}</td>
              </tr>
              <tr className="text-xl font-bold border-t border-black">
                <td className="py-2">Total Due</td>
                <td className="text-right">{formatPrice(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t">
          <p>Thank you for choosing VisionPOS!</p>
          <p>Questions? Contact us at support@visionpos.com</p>
        </div>
      </div>
    )
  }
)
