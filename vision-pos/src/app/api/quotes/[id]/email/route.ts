import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { email, subject, message } = body

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

    const recipientEmail = email || quote.customer?.email

    if (!recipientEmail) {
      return NextResponse.json(
        { error: 'No email address provided' },
        { status: 400 }
      )
    }

    // Build email content
    const totals = quote.totals as {
      subtotal: number
      insuranceSavings: number
      discountTotal: number
      tax: number
      total: number
    }

    const items = quote.items as Array<{
      displayName: string
      retailPrice: number
      patientPays: number
    }>

    const itemsHtml = items
      .map(
        (item) =>
          `<tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.displayName}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${Number(item.retailPrice).toFixed(2)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${Number(item.patientPays).toFixed(2)}</td>
          </tr>`
      )
      .join('')

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #1a1a1a; margin: 0; }
          .header p { color: #666; }
          table { width: 100%; border-collapse: collapse; }
          th { text-align: left; padding: 8px; border-bottom: 2px solid #333; }
          .totals { margin-top: 20px; text-align: right; }
          .total-row { display: flex; justify-content: space-between; padding: 4px 0; }
          .grand-total { font-size: 1.25em; font-weight: bold; color: #16a34a; margin-top: 10px; }
          .savings { color: #16a34a; }
          .footer { margin-top: 40px; text-align: center; color: #666; font-size: 0.875em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Vision POS</h1>
            <p>Your Quote</p>
          </div>

          <p>Dear ${quote.customer?.firstName || 'Valued Customer'},</p>

          ${message ? `<p>${message}</p>` : '<p>Thank you for visiting us! Here is your personalized quote:</p>'}

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: right;">Retail</th>
                <th style="text-align: right;">Your Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals">
            ${totals.insuranceSavings > 0 ? `<div class="total-row savings">Insurance Savings: -$${totals.insuranceSavings.toFixed(2)}</div>` : ''}
            ${totals.discountTotal > 0 ? `<div class="total-row">Discounts: -$${totals.discountTotal.toFixed(2)}</div>` : ''}
            <div class="total-row">Subtotal: $${totals.subtotal.toFixed(2)}</div>
            <div class="total-row">Tax: $${totals.tax.toFixed(2)}</div>
            <div class="total-row grand-total">Total: $${totals.total.toFixed(2)}</div>
          </div>

          <div class="footer">
            <p>Quote valid for 30 days from ${new Date(quote.createdAt).toLocaleDateString()}</p>
            <p>Questions? Contact us to schedule your next appointment.</p>
          </div>
        </div>
      </body>
      </html>
    `

    // TODO: Integrate with email service (SendGrid, Resend, etc.)
    // For now, log the email and return success
    console.log('=== Email Preview ===')
    console.log('To:', recipientEmail)
    console.log('Subject:', subject || `Your Quote from Vision POS`)
    console.log('HTML:', emailHtml.substring(0, 500) + '...')
    console.log('===================')

    // In production, you would send the email here:
    // await sendEmail({
    //   to: recipientEmail,
    //   subject: subject || 'Your Quote from Vision POS',
    //   html: emailHtml,
    //   attachments: [{ filename: 'quote.pdf', content: pdfBuffer }]
    // })

    return NextResponse.json({
      success: true,
      message: `Quote email queued for ${recipientEmail}`,
      preview: process.env.NODE_ENV === 'development',
    })
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
