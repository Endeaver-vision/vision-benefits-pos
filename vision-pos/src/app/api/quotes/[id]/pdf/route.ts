import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { jsPDF } from 'jspdf'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true,
      },
    })

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Generate PDF
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    let y = 20

    // Header
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('Vision POS', margin, y)
    y += 10

    doc.setFontSize(16)
    doc.setFont('helvetica', 'normal')
    doc.text('Quote', margin, y)
    y += 8

    // Quote info
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Quote #: ${quote.id.slice(0, 8).toUpperCase()}`, margin, y)
    y += 5
    doc.text(`Date: ${new Date(quote.createdAt).toLocaleDateString()}`, margin, y)
    y += 10

    // Customer info
    doc.setFontSize(12)
    doc.setTextColor(0)
    doc.setFont('helvetica', 'bold')
    doc.text('Prepared For:', margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.text(
      `${quote.customer?.firstName || 'Guest'} ${quote.customer?.lastName || ''}`,
      margin,
      y
    )
    y += 15

    // Line separator
    doc.setDrawColor(200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 10

    // Items header
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Item', margin, y)
    doc.text('Retail', pageWidth - 80, y)
    doc.text('You Pay', pageWidth - 40, y)
    y += 5
    doc.setDrawColor(220)
    doc.line(margin, y, pageWidth - margin, y)
    y += 8

    // Items
    doc.setFont('helvetica', 'normal')
    const items = quote.items as Array<{
      displayName: string
      retailPrice: number
      patientPays: number
      category: string
    }>

    for (const item of items) {
      if (y > 260) {
        doc.addPage()
        y = 20
      }

      doc.text(item.displayName, margin, y)
      doc.text(`$${Number(item.retailPrice).toFixed(2)}`, pageWidth - 80, y)
      doc.text(`$${Number(item.patientPays).toFixed(2)}`, pageWidth - 40, y)
      y += 7
    }

    y += 5
    doc.line(margin, y, pageWidth - margin, y)
    y += 10

    // Totals
    const totals = quote.totals as {
      subtotal: number
      insuranceSavings: number
      discountTotal: number
      tax: number
      total: number
    }

    // Retail total
    const retailTotal = items.reduce((sum, item) => sum + Number(item.retailPrice), 0)
    doc.text('Retail Value:', pageWidth - 80, y)
    doc.text(`$${retailTotal.toFixed(2)}`, pageWidth - 40, y)
    y += 7

    // Insurance savings
    if (totals.insuranceSavings > 0) {
      doc.setTextColor(34, 139, 34)
      doc.text('Insurance Savings:', pageWidth - 80, y)
      doc.text(`-$${totals.insuranceSavings.toFixed(2)}`, pageWidth - 40, y)
      y += 7
      doc.setTextColor(0)
    }

    // Discounts
    if (totals.discountTotal > 0) {
      doc.setTextColor(255, 140, 0)
      doc.text('Discounts:', pageWidth - 80, y)
      doc.text(`-$${totals.discountTotal.toFixed(2)}`, pageWidth - 40, y)
      y += 7
      doc.setTextColor(0)
    }

    // Subtotal
    doc.text('Subtotal:', pageWidth - 80, y)
    doc.text(`$${totals.subtotal.toFixed(2)}`, pageWidth - 40, y)
    y += 7

    // Tax
    doc.setTextColor(100)
    doc.text('Tax (8.75%):', pageWidth - 80, y)
    doc.text(`$${totals.tax.toFixed(2)}`, pageWidth - 40, y)
    y += 10
    doc.setTextColor(0)

    // Total
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Total:', pageWidth - 80, y)
    doc.setTextColor(34, 139, 34)
    doc.text(`$${totals.total.toFixed(2)}`, pageWidth - 40, y)
    y += 15

    // Signature area (if signature exists in quote)
    if (quote.signature) {
      doc.setTextColor(0)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('Customer Signature:', margin, y)
      y += 5

      // Add signature image
      try {
        const signatureData = quote.signature as string
        if (signatureData.startsWith('data:image')) {
          doc.addImage(signatureData, 'PNG', margin, y, 60, 30)
          y += 35
        }
      } catch {
        // Signature couldn't be added
      }

      doc.text(`Signed: ${new Date().toLocaleDateString()}`, margin, y)
      y += 10
    }

    // Footer
    y = 280
    doc.setFontSize(8)
    doc.setTextColor(100)
    doc.text('Thank you for choosing Vision POS!', pageWidth / 2, y, { align: 'center' })
    y += 4
    doc.text('Quote valid for 30 days from date of issue.', pageWidth / 2, y, { align: 'center' })

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="quote-${quote.id.slice(0, 8)}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
