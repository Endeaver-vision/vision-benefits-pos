import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { emailService } from '@/lib/email-service'
import puppeteer from 'puppeteer'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let logEntryId: string | null = null
  
  try {
    const quoteId = params.id
    const requestBody = await request.json()
    
    const {
      to,
      cc = [],
      bcc = [],
      subject,
      customMessage,
      includeAttachment = true,
      retryCount = 0
    } = requestBody

    // Validate email addresses
    if (!to || !isValidEmail(to)) {
      return NextResponse.json(
        { error: 'Valid recipient email address is required' },
        { status: 400 }
      )
    }

    // Validate CC and BCC emails
    const invalidCCEmails = cc.filter((email: string) => !isValidEmail(email))
    const invalidBCCEmails = bcc.filter((email: string) => !isValidEmail(email))
    
    if (invalidCCEmails.length > 0) {
      return NextResponse.json(
        { error: `Invalid CC email addresses: ${invalidCCEmails.join(', ')}` },
        { status: 400 }
      )
    }
    
    if (invalidBCCEmails.length > 0) {
      return NextResponse.json(
        { error: `Invalid BCC email addresses: ${invalidBCCEmails.join(', ')}` },
        { status: 400 }
      )
    }

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
    const insuranceInfo = quote.insuranceInfo as any
    const examServices = quote.examServices as any
    const eyeglasses = quote.eyeglasses as any
    const contacts = quote.contacts as any

    // Transform database data to email template format
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
        ...(eyeglasses?.enhancements ? eyeglasses.enhancements : [])
      ],
      staff: {
        name: quote.users.firstName + ' ' + quote.users.lastName,
        title: quote.users.role || 'Licensed Optician'
      },
      location: {
        name: quote.locations.name,
        address: quote.locations.address,
        phone: quote.locations.phone,
        email: quote.locations.email || 'info@visionbenefitspos.com'
      }
    }

    let pdfBuffer: Buffer | undefined

    // Generate PDF if attachment is requested
    if (includeAttachment) {
      try {
        const browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        })

        const page = await browser.newPage()
        const htmlContent = generateQuoteHTML(quoteData)
        
        await page.setContent(htmlContent, {
          waitUntil: 'networkidle0'
        })

        pdfBuffer = await page.pdf({
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
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError)
        
        // Continue without PDF attachment if generation fails
        pdfBuffer = undefined
      }
    }

    // Send email
    try {
      const emailResult = await emailService.sendQuoteEmail({
        to,
        customerName: quoteData.customer.name,
        quoteNumber: quoteData.quoteNumber,
        quoteData,
        pdfBuffer: pdfBuffer || Buffer.from(''),
        ccEmails: cc,
        bccEmails: bcc
      })

      // Log email activity
      await prisma.email_logs.create({
        data: {
          id: generateId(),
          quoteId: quote.id,
          recipientEmail: to,
          ccEmails: cc.length > 0 ? JSON.stringify(cc) : null,
          bccEmails: bcc.length > 0 ? JSON.stringify(bcc) : null,
          subject: subject || `Your Vision Quote #${quote.quoteNumber}`,
          status: 'SENT',
          provider: emailResult.provider,
          messageId: emailResult.messageId || null,
          sentAt: new Date(),
          retryCount: retryCount
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
        messageId: emailResult.messageId,
        provider: emailResult.provider,
        recipient: to,
        attachmentIncluded: !!pdfBuffer
      })

    } catch (emailError) {
      console.error('Email sending error:', emailError)

      // Log failed email attempt
      await prisma.email_logs.create({
        data: {
          id: generateId(),
          quoteId: quote.id,
          recipientEmail: to,
          subject: subject || `Your Vision Quote #${quote.quoteNumber}`,
          status: 'FAILED',
          errorMessage: emailError instanceof Error ? emailError.message : 'Unknown error',
          sentAt: new Date(),
          retryCount: retryCount
        }
      })

      // Retry logic for transient errors
      if (retryCount < 3 && isRetryableError(emailError)) {
        return NextResponse.json({
          success: false,
          error: 'Email delivery failed, retry scheduled',
          retryable: true,
          retryCount: retryCount + 1
        }, { status: 503 })
      }

      return NextResponse.json({
        success: false,
        error: 'Failed to send email',
        details: emailError instanceof Error ? emailError.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Email API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
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

    // Get email history for this quote
    const emailLogs = await prisma.email_logs.findMany({
      where: { quoteId },
      orderBy: { sentAt: 'desc' },
      take: 10
    })

    return NextResponse.json({
      success: true,
      emailHistory: emailLogs
    })

  } catch (error) {
    console.error('Email history retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve email history' },
      { status: 500 }
    )
  }
}

// Helper functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function isRetryableError(error: any): boolean {
  if (error.code) {
    // Common retryable error codes
    const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED']
    return retryableCodes.includes(error.code)
  }
  
  // SendGrid specific retryable status codes
  if (error.response && error.response.status) {
    const retryableStatuses = [429, 500, 502, 503, 504]
    return retryableStatuses.includes(error.response.status)
  }
  
  return false
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
}

function generateQuoteHTML(quote: any): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Quote ${quote.quoteNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
        .company-name { font-size: 24px; font-weight: bold; color: #1e3a8a; }
        .quote-title { font-size: 28px; color: #dc2626; margin: 20px 0; }
        .customer-info { background: #f8fafc; padding: 15px; margin-bottom: 20px; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th, .items-table td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
        .items-table th { background: #1e3a8a; color: white; }
        .total { font-size: 18px; font-weight: bold; text-align: right; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">${quote.location.name}</div>
        <div>${quote.location.address}</div>
        <div>Phone: ${quote.location.phone} | Email: ${quote.location.email}</div>
        <div class="quote-title">QUOTE #${quote.quoteNumber}</div>
      </div>
      
      <div class="customer-info">
        <strong>Customer:</strong> ${quote.customer.name}<br>
        <strong>Date:</strong> ${quote.date}<br>
        <strong>Expires:</strong> ${quote.expirationDate}
      </div>
      
      <table class="items-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Details</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          ${quote.items.map((item: any) => `
            <tr>
              <td>${item.description}</td>
              <td>${item.details || '-'}</td>
              <td>$${item.total.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="total">
        Total: $${quote.pricing.total.toFixed(2)}
      </div>
    </body>
    </html>
  `
}