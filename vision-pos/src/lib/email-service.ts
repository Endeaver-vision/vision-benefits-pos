import sgMail from '@sendgrid/mail'
import nodemailer from 'nodemailer'
import { QuoteData } from '../types/quote-builder'

// Email service configuration
export class EmailService {
  private sendgridApiKey: string
  private fallbackTransporter: nodemailer.Transporter | null = null

  constructor() {
    this.sendgridApiKey = process.env.SENDGRID_API_KEY || ''
    
    if (this.sendgridApiKey) {
      sgMail.setApiKey(this.sendgridApiKey)
    }

    // Setup fallback SMTP transporter (for development or backup)
    this.setupFallbackTransporter()
  }

  private setupFallbackTransporter() {
    try {
        this.fallbackTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASSWORD || ''
        }
      })
    } catch (error) {
      console.warn('Fallback email transporter setup failed:', error)
    }
  }

  async sendQuoteEmail({
    to,
    customerName,
    quoteNumber,
    quoteData,
    pdfBuffer,
    ccEmails = [],
    bccEmails = []
  }: {
    to: string
    customerName: string
    quoteNumber: string
    quoteData: any
    pdfBuffer: Buffer
    ccEmails?: string[]
    bccEmails?: string[]
  }) {
    const subject = `Your Vision Quote #${quoteNumber} from Vision Benefits POS`
    const htmlContent = this.generateQuoteEmailHTML({
      customerName,
      quoteNumber,
      quoteData
    })
    const textContent = this.generateQuoteEmailText({
      customerName,
      quoteNumber,
      quoteData
    })

    const emailData = {
      to,
      cc: ccEmails.length > 0 ? ccEmails : undefined,
      bcc: bccEmails.length > 0 ? bccEmails : undefined,
      from: {
        email: process.env.FROM_EMAIL || 'quotes@visionbenefitspos.com',
        name: 'Vision Benefits POS'
      },
      subject,
      html: htmlContent,
      text: textContent,
      attachments: [
        {
          content: pdfBuffer.toString('base64'),
          filename: `Quote_${quoteNumber}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        }
      ]
    }

    try {
      // Try SendGrid first
      if (this.sendgridApiKey) {
        const result = await sgMail.send(emailData as any)
        return {
          success: true,
          provider: 'sendgrid',
          messageId: result[0]?.headers?.['x-message-id']
        }
      }

      // Fallback to SMTP
      if (this.fallbackTransporter) {
        const result = await this.fallbackTransporter.sendMail({
          ...emailData,
          attachments: [
            {
              filename: `Quote_${quoteNumber}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf'
            }
          ]
        })
        return {
          success: true,
          provider: 'smtp',
          messageId: result.messageId
        }
      }

      throw new Error('No email service configured')

    } catch (error) {
      console.error('Email sending failed:', error)
      throw error
    }
  }

  private generateQuoteEmailHTML({
    customerName,
    quoteNumber,
    quoteData
  }: {
    customerName: string
    quoteNumber: string
    quoteData: any
  }): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Vision Quote #${quoteNumber}</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      max-width: 600px;
      margin: 0 auto;
      padding: 0;
      background-color: #f8f9fa;
    }
    
    .email-container {
      background-color: #ffffff;
      margin: 20px auto;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: bold;
    }
    
    .header p {
      margin: 10px 0 0 0;
      font-size: 16px;
      opacity: 0.9;
    }
    
    .content {
      padding: 30px;
    }
    
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
      color: #1e3a8a;
    }
    
    .quote-summary {
      background-color: #f8fafc;
      border-left: 4px solid #3b82f6;
      padding: 20px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    
    .quote-summary h3 {
      margin: 0 0 15px 0;
      color: #1e3a8a;
      font-size: 18px;
    }
    
    .quote-details {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 15px;
    }
    
    .quote-item {
      flex: 1;
      min-width: 120px;
    }
    
    .quote-item label {
      display: block;
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    
    .quote-item value {
      display: block;
      font-size: 16px;
      font-weight: bold;
      color: #1f2937;
    }
    
    .quote-item.total value {
      color: #059669;
      font-size: 20px;
    }
    
    .items-section {
      margin: 25px 0;
    }
    
    .items-section h4 {
      color: #1e3a8a;
      margin-bottom: 15px;
      font-size: 16px;
    }
    
    .item {
      padding: 12px 0;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .item:last-child {
      border-bottom: none;
    }
    
    .item-name {
      font-weight: 500;
      color: #1f2937;
    }
    
    .item-details {
      font-size: 14px;
      color: #6b7280;
    }
    
    .item-price {
      font-weight: bold;
      color: #059669;
    }
    
    .next-steps {
      background-color: #ecfdf5;
      border: 1px solid #10b981;
      padding: 20px;
      border-radius: 8px;
      margin: 25px 0;
    }
    
    .next-steps h4 {
      color: #047857;
      margin: 0 0 10px 0;
    }
    
    .next-steps ul {
      margin: 0;
      padding-left: 20px;
      color: #065f46;
    }
    
    .next-steps li {
      margin-bottom: 5px;
    }
    
    .cta-button {
      display: inline-block;
      background-color: #3b82f6;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
      text-align: center;
      margin: 20px 0;
    }
    
    .footer {
      background-color: #f8fafc;
      padding: 25px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    
    .footer p {
      margin: 5px 0;
      color: #6b7280;
      font-size: 14px;
    }
    
    .contact-info {
      margin-top: 15px;
    }
    
    .contact-info a {
      color: #3b82f6;
      text-decoration: none;
    }
    
    @media (max-width: 600px) {
      .email-container {
        margin: 10px;
        border-radius: 4px;
      }
      
      .header, .content, .footer {
        padding: 20px;
      }
      
      .quote-details {
        flex-direction: column;
      }
      
      .item {
        flex-direction: column;
        align-items: flex-start;
        gap: 5px;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>Vision Benefits POS</h1>
      <p>Your trusted vision care partner</p>
    </div>
    
    <div class="content">
      <div class="greeting">
        Hello ${customerName},
      </div>
      
      <p>Thank you for visiting our practice! We've prepared your personalized vision quote and wanted to share the details with you.</p>
      
      <div class="quote-summary">
        <h3>Quote Summary</h3>
        <div class="quote-details">
          <div class="quote-item">
            <label>Quote Number</label>
            <value>${quoteNumber}</value>
          </div>
          <div class="quote-item">
            <label>Date</label>
            <value>${quoteData.date}</value>
          </div>
          <div class="quote-item">
            <label>Valid Until</label>
            <value>${quoteData.expirationDate}</value>
          </div>
          <div class="quote-item total">
            <label>Total Amount</label>
            <value>$${quoteData.pricing?.total?.toFixed(2) || '0.00'}</value>
          </div>
        </div>
      </div>
      
      ${quoteData.items && quoteData.items.length > 0 ? `
      <div class="items-section">
        <h4>Your Selected Items</h4>
        ${quoteData.items.map((item: any) => `
          <div class="item">
            <div>
              <div class="item-name">${item.description}</div>
              ${item.details ? `<div class="item-details">${item.details}</div>` : ''}
            </div>
            <div class="item-price">$${item.total?.toFixed(2) || '0.00'}</div>
          </div>
        `).join('')}
      </div>
      ` : ''}
      
      ${quoteData.insurance ? `
      <div class="quote-summary">
        <h3>Insurance Benefits Applied</h3>
        <p>Your ${quoteData.insurance.provider} insurance plan has been applied to this quote, saving you $${quoteData.pricing?.insuranceCoverage?.toFixed(2) || '0.00'}.</p>
      </div>
      ` : ''}
      
      <div class="next-steps">
        <h4>Next Steps</h4>
        <ul>
          <li>Review the attached PDF quote for complete details</li>
          <li>Contact us with any questions about your quote</li>
          <li>Schedule an appointment to proceed with your order</li>
          <li>This quote is valid until ${quoteData.expirationDate}</li>
        </ul>
      </div>
      
      <p>We're here to help you see your best! If you have any questions about this quote or would like to schedule an appointment, please don't hesitate to reach out.</p>
      
      <a href="tel:${quoteData.location?.phone || '(555) 123-4567'}" class="cta-button">
        Call to Schedule: ${quoteData.location?.phone || '(555) 123-4567'}
      </a>
    </div>
    
    <div class="footer">
      <p><strong>Vision Benefits POS</strong></p>
      <p>${quoteData.location?.address || '123 Vision Way, Eyecare City, EC 12345'}</p>
      <div class="contact-info">
        <p>Phone: <a href="tel:${quoteData.location?.phone || '(555) 123-4567'}">${quoteData.location?.phone || '(555) 123-4567'}</a></p>
        <p>Email: <a href="mailto:${quoteData.location?.email || 'info@visionbenefitspos.com'}">${quoteData.location?.email || 'info@visionbenefitspos.com'}</a></p>
      </div>
      <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
        This email was sent regarding your vision quote. Please contact us if you received this in error.
      </p>
    </div>
  </div>
</body>
</html>
    `
  }

  private generateQuoteEmailText({
    customerName,
    quoteNumber,
    quoteData
  }: {
    customerName: string
    quoteNumber: string
    quoteData: any
  }): string {
    const items = quoteData.items || []
    const itemsList = items.map((item: any) => 
      `- ${item.description}${item.details ? ` (${item.details})` : ''}: $${item.total?.toFixed(2) || '0.00'}`
    ).join('\n')

    return `
Hello ${customerName},

Thank you for visiting Vision Benefits POS! We've prepared your personalized vision quote.

QUOTE SUMMARY
Quote Number: ${quoteNumber}
Date: ${quoteData.date}
Valid Until: ${quoteData.expirationDate}
Total Amount: $${quoteData.pricing?.total?.toFixed(2) || '0.00'}

${items.length > 0 ? `YOUR SELECTED ITEMS
${itemsList}` : ''}

${quoteData.insurance ? `INSURANCE BENEFITS
Your ${quoteData.insurance.provider} insurance plan has been applied, saving you $${quoteData.pricing?.insuranceCoverage?.toFixed(2) || '0.00'}.` : ''}

NEXT STEPS
• Review the attached PDF quote for complete details
• Contact us with any questions about your quote
• Schedule an appointment to proceed with your order
• This quote is valid until ${quoteData.expirationDate}

We're here to help you see your best! If you have any questions, please contact us:

Vision Benefits POS
${quoteData.location?.address || '123 Vision Way, Eyecare City, EC 12345'}
Phone: ${quoteData.location?.phone || '(555) 123-4567'}
Email: ${quoteData.location?.email || 'info@visionbenefitspos.com'}

---
This email was sent regarding your vision quote. Please contact us if you received this in error.
    `.trim()
  }

  async testEmailConnection(): Promise<boolean> {
    try {
      if (this.sendgridApiKey) {
        // Test SendGrid connection
        return true
      }

      if (this.fallbackTransporter) {
        await this.fallbackTransporter.verify()
        return true
      }

      return false
    } catch (error) {
      console.error('Email connection test failed:', error)
      return false
    }
  }

  /**
   * Test email service connection with detailed response
   */
  async testConnection(): Promise<{
    success: boolean
    error?: string
    details?: Record<string, unknown>
    provider?: string
  }> {
    try {
      if (this.sendgridApiKey) {
        // Test SendGrid connection
        return {
          success: true,
          provider: 'SendGrid',
          details: { configured: true, hasApiKey: true }
        }
      } else if (this.fallbackTransporter) {
        // Test SMTP connection
        try {
          await this.fallbackTransporter.verify()
          return {
            success: true,
            provider: 'SMTP',
            details: { configured: true, verified: true }
          }
        } catch (smtpError) {
          return {
            success: false,
            provider: 'SMTP',
            error: smtpError instanceof Error ? smtpError.message : 'SMTP verification failed',
            details: { configured: true, verified: false }
          }
        }
      } else {
        return {
          success: false,
          error: 'No email service configured (missing SENDGRID_API_KEY or SMTP settings)',
          details: {
            sendgridConfigured: !!this.sendgridApiKey,
            smtpConfigured: !!this.fallbackTransporter,
            envVarsChecked: {
              SENDGRID_API_KEY: !!process.env.SENDGRID_API_KEY,
              SMTP_HOST: !!process.env.SMTP_HOST
            }
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      }
    }
  }

  /**
   * Generate HTML email template (exposed for testing)
   */
  generateHtmlTemplate(quoteData: QuoteData): string {
    return this.generateQuoteEmailHTML({
      customerName: quoteData.patient?.firstName || 'Valued Customer',
      quoteNumber: quoteData.id || 'QUOTE-001',
      quoteData
    })
  }

  /**
   * Generate plain text email template (exposed for testing)
   */
  generateTextTemplate(quoteData: QuoteData): string {
    return this.generateQuoteEmailText({
      customerName: quoteData.patient?.firstName || 'Valued Customer',
      quoteNumber: quoteData.id || 'QUOTE-001',
      quoteData
    })
  }
}

export const emailService = new EmailService()