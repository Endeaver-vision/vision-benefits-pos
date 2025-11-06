import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quoteId = params.id
    
    // Fetch quote data from database
    const quote = await prisma.quotes.findUnique({
      where: { id: quoteId },
      include: {
        customers: true,
        users: true,
        locations: true
      }
    })

    if (!quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    // Parse JSON fields
    const patientInfo = quote.patientInfo as any
    const insuranceInfo = quote.insuranceInfo as any
    const examServices = quote.examServices as any
    const eyeglasses = quote.eyeglasses as any
    const contacts = quote.contacts as any

    // Transform database data to PDF template format
    const quoteData = {
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      date: quote.createdAt.toLocaleDateString(),
      expirationDate: quote.expirationDate.toLocaleDateString(),
      customer: {
        name: `${quote.customers.firstName} ${quote.customers.lastName}`,
        email: quote.customers.email,
        phone: quote.customers.phone || '(555) 000-0000',
        address: {
          street: quote.customers.address || '123 Main St',
          city: quote.customers.city || 'Anytown',
          state: quote.customers.state || 'ST',
          zipCode: quote.customers.zipCode || '12345'
        }
      },
      insurance: insuranceInfo && insuranceInfo.provider ? {
        provider: insuranceInfo.provider,
        memberId: insuranceInfo.memberId || '',
        groupNumber: insuranceInfo.groupNumber || '',
        planType: insuranceInfo.planType || 'Standard Plan',
        benefits: {
          frameAllowance: insuranceInfo.frameAllowance || 150.00,
          lensAllowance: insuranceInfo.lensAllowance || 200.00,
          examCovered: insuranceInfo.examCovered || true
        }
      } : undefined,
      items: [
        ...(examServices && examServices.selected ? [{
          id: 'exam-1',
          type: 'exam' as const,
          description: 'Comprehensive Eye Exam',
          details: examServices.details || 'Complete vision and health assessment',
          quantity: 1,
          unitPrice: examServices.price || 125.00,
          discount: 0,
          total: examServices.price || 125.00
        }] : []),
        ...(eyeglasses && eyeglasses.frame ? [{
          id: 'eyeglasses-1',
          type: 'eyeglasses' as const,
          description: `${eyeglasses.frame.brand} ${eyeglasses.frame.model || 'Frame'}`,
          details: `Color: ${eyeglasses.frame.color || 'N/A'}, ${eyeglasses.lenses?.type || 'Standard Lenses'}`,
          quantity: 1,
          unitPrice: (eyeglasses.frame.price || 0) + (eyeglasses.lenses?.price || 0),
          discount: quote.discount || 0,
          total: (eyeglasses.frame.price || 0) + (eyeglasses.lenses?.price || 0) - (quote.discount || 0)
        }] : []),
        ...(contacts && contacts.selected ? [{
          id: 'contacts-1',
          type: 'contacts' as const,
          description: 'Contact Lenses',
          details: contacts.brand || 'Standard contacts',
          quantity: 1,
          unitPrice: contacts.price || 100.00,
          discount: 0,
          total: contacts.price || 100.00
        }] : [])
      ],
      pricing: {
        subtotal: quote.subtotal,
        discounts: quote.discount + quote.secondPairDiscount,
        tax: quote.tax,
        insuranceCoverage: quote.insuranceDiscount,
        total: quote.total,
        amountDue: quote.patientResponsibility
      },
      specialFeatures: [
        ...(quote.isSecondPair ? [`Second Pair Discount: ${quote.secondPairType}`] : []),
        ...(quote.isPatientOwnedFrame ? [`Patient-Owned Frame: ${quote.pofConditionAssessment} condition`] : []),
        ...(eyeglasses?.enhancements ? eyeglasses.enhancements : [])
      ],
      terms: [
        'This quote is valid for 30 days from the date issued.',
        'Prices are subject to change based on final prescription requirements.',
        'Insurance benefits are estimated and subject to verification.',
        'Full payment or approved financing required before order processing.',
        'Frame selection subject to availability. Similar styles may be substituted.',
        'Prescription accuracy is customer\'s responsibility. Additional fees may apply for prescription changes.',
        'Returns and exchanges subject to company policy and manufacturer warranties.'
      ],
      staff: {
        name: quote.users.firstName + ' ' + quote.users.lastName,
        title: quote.users.role || 'Licensed Optician'
      },
      location: {
        name: quote.locations.name,
        address: quote.locations.address,
        phone: quote.locations.phone,
        email: quote.locations.email
      }
    }

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    const page = await browser.newPage()
    
    // Create HTML content for the quote
    const htmlContent = generateQuoteHTML(quoteData)
    
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    })

    // Generate PDF buffer
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    })

    await browser.close()

    // Save PDF to filesystem (optional)
    const fileName = `quote_${quote.quoteNumber}_${Date.now()}.pdf`
    const filePath = path.join(process.cwd(), 'public', 'generated-pdfs', fileName)
    
    // Ensure directory exists
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    fs.writeFileSync(filePath, pdfBuffer)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Quote_${quote.quoteNumber}.pdf"`
      }
    })

  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quoteId = params.id
    
    // For now, just redirect to POST to generate PDF
    return await POST(request, { params })

  } catch (error) {
    console.error('PDF retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve PDF' },
      { status: 500 }
    )
  }
}

// Generate HTML content for PDF
function generateQuoteHTML(quote: any): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Quote ${quote.quoteNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Helvetica', Arial, sans-serif;
          font-size: 12px;
          line-height: 1.4;
          color: #374151;
          background: white;
        }
        
        .page {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
        }
        
        .company-info h1 {
          color: #1e3a8a;
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        
        .company-info p {
          color: #6b7280;
          line-height: 1.6;
        }
        
        .quote-info {
          text-align: right;
        }
        
        .quote-title {
          color: #dc2626;
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 15px;
        }
        
        .quote-details p {
          margin-bottom: 5px;
          font-weight: 500;
        }
        
        .customer-section {
          display: flex;
          gap: 40px;
          margin-bottom: 30px;
          background: #f8fafc;
          padding: 20px;
          border-radius: 8px;
        }
        
        .customer-column {
          flex: 1;
        }
        
        .section-title {
          color: #1e3a8a;
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 10px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 5px;
        }
        
        .customer-text {
          margin-bottom: 5px;
        }
        
        .insurance-section {
          background: #ecfdf5;
          border: 1px solid #10b981;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        
        .insurance-title {
          color: #065f46;
          font-weight: bold;
          margin-bottom: 10px;
        }
        
        .insurance-text {
          color: #047857;
          margin-bottom: 5px;
        }
        
        .features-section {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        
        .features-title {
          color: #92400e;
          font-weight: bold;
          margin-bottom: 10px;
        }
        
        .feature-item {
          color: #b45309;
          margin-bottom: 5px;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .items-table th {
          background: #1e3a8a;
          color: white;
          padding: 15px 10px;
          text-align: left;
          font-weight: bold;
        }
        
        .items-table td {
          padding: 12px 10px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .items-table tr:nth-child(even) {
          background: #f9fafb;
        }
        
        .items-table .text-right {
          text-align: right;
        }
        
        .pricing-section {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 30px;
        }
        
        .pricing-table {
          width: 350px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .pricing-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 15px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .pricing-row.total {
          background: #1e3a8a;
          color: white;
          font-weight: bold;
          font-size: 16px;
        }
        
        .terms-section {
          background: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        
        .terms-title {
          color: #1e3a8a;
          font-weight: bold;
          margin-bottom: 15px;
        }
        
        .terms-text {
          color: #6b7280;
          margin-bottom: 8px;
          line-height: 1.5;
        }
        
        .footer {
          text-align: center;
          color: #9ca3af;
          font-size: 10px;
          border-top: 1px solid #e5e7eb;
          padding-top: 20px;
          margin-top: 40px;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Header -->
        <div class="header">
          <div class="company-info">
            <h1>${quote.location.name}</h1>
            <p>${quote.location.address}<br>
               Phone: ${quote.location.phone}<br>
               Email: ${quote.location.email}</p>
          </div>
          <div class="quote-info">
            <div class="quote-title">QUOTE</div>
            <div class="quote-details">
              <p>Quote #: ${quote.quoteNumber}</p>
              <p>Date: ${quote.date}</p>
              <p>Expires: ${quote.expirationDate}</p>
            </div>
          </div>
        </div>

        <!-- Customer Information -->
        <div class="customer-section">
          <div class="customer-column">
            <div class="section-title">CUSTOMER INFORMATION</div>
            <div class="customer-text">Name: ${quote.customer.name}</div>
            <div class="customer-text">Email: ${quote.customer.email}</div>
            <div class="customer-text">Phone: ${quote.customer.phone}</div>
            <div class="customer-text">Address: ${quote.customer.address.street}<br>
              ${quote.customer.address.city}, ${quote.customer.address.state} ${quote.customer.address.zipCode}</div>
          </div>
          ${quote.insurance ? `
          <div class="customer-column">
            <div class="section-title">INSURANCE INFORMATION</div>
            <div class="customer-text">Provider: ${quote.insurance.provider}</div>
            <div class="customer-text">Member ID: ${quote.insurance.memberId}</div>
            <div class="customer-text">Group #: ${quote.insurance.groupNumber}</div>
            <div class="customer-text">Plan: ${quote.insurance.planType}</div>
          </div>
          ` : ''}
        </div>

        ${quote.insurance ? `
        <!-- Insurance Benefits -->
        <div class="insurance-section">
          <div class="insurance-title">INSURANCE BENEFITS</div>
          <div class="insurance-text">Frame Allowance: $${quote.insurance.benefits.frameAllowance.toFixed(2)}</div>
          <div class="insurance-text">Lens Allowance: $${quote.insurance.benefits.lensAllowance.toFixed(2)}</div>
          <div class="insurance-text">Exam Coverage: ${quote.insurance.benefits.examCovered ? 'Covered' : 'Not Covered'}</div>
        </div>
        ` : ''}

        ${quote.specialFeatures && quote.specialFeatures.length > 0 ? `
        <!-- Special Features -->
        <div class="features-section">
          <div class="features-title">SPECIAL FEATURES & NOTES</div>
          ${quote.specialFeatures.map((feature: string) => `<div class="feature-item">• ${feature}</div>`).join('')}
        </div>
        ` : ''}

        <!-- Quote Items -->
        <div class="section-title">QUOTE ITEMS</div>
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 35%">Description</th>
              <th style="width: 25%">Details</th>
              <th style="width: 10%" class="text-right">Qty</th>
              <th style="width: 15%" class="text-right">Unit Price</th>
              <th style="width: 15%" class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${quote.items.map((item: any) => `
              <tr>
                <td>${item.description}</td>
                <td>${item.details || '-'}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">$${item.unitPrice.toFixed(2)}</td>
                <td class="text-right">$${item.total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Pricing Summary -->
        <div class="pricing-section">
          <div class="pricing-table">
            <div class="pricing-row">
              <span>Subtotal:</span>
              <span>$${quote.pricing.subtotal.toFixed(2)}</span>
            </div>
            ${quote.pricing.discounts > 0 ? `
            <div class="pricing-row">
              <span>Discounts:</span>
              <span>-$${quote.pricing.discounts.toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="pricing-row">
              <span>Tax:</span>
              <span>$${quote.pricing.tax.toFixed(2)}</span>
            </div>
            ${quote.pricing.insuranceCoverage > 0 ? `
            <div class="pricing-row">
              <span>Insurance Coverage:</span>
              <span>-$${quote.pricing.insuranceCoverage.toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="pricing-row total">
              <span>TOTAL:</span>
              <span>$${quote.pricing.total.toFixed(2)}</span>
            </div>
            <div class="pricing-row total">
              <span>AMOUNT DUE:</span>
              <span>$${quote.pricing.amountDue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <!-- Terms and Conditions -->
        <div class="terms-section">
          <div class="terms-title">TERMS AND CONDITIONS</div>
          ${quote.terms.map((term: string) => `<div class="terms-text">• ${term}</div>`).join('')}
        </div>

        <!-- Footer -->
        <div class="footer">
          This quote was prepared by ${quote.staff.name}, ${quote.staff.title} | Valid until ${quote.expirationDate}<br>
          For questions about this quote, please contact us at ${quote.location.phone} or ${quote.location.email}
        </div>
      </div>
    </body>
    </html>
  `
}