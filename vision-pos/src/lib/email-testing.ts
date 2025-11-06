import { EmailService } from './email-service'
import { PrismaClient } from '@prisma/client'
import { QuoteData } from '../types/quote-builder'

let prismaInstance: PrismaClient | null = null

function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient()
  }
  return prismaInstance
}

export interface EmailTestResult {
  success: boolean
  error?: string
  details?: Record<string, unknown>
  provider?: string
  messageId?: string
  duration?: number
}

export class EmailTester {
  private emailService: EmailService

  constructor() {
    this.emailService = new EmailService()
  }

  /**
   * Test email configuration and connectivity
   */
  async testConfiguration(): Promise<EmailTestResult> {
    const startTime = Date.now()
    
    try {
      const result = await this.emailService.testConnection()
      
      return {
        success: result.success,
        error: result.error,
        details: result.details,
        provider: result.provider,
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      }
    }
  }

  /**
   * Test sending an email to a test address
   */
  async testEmailSending(testEmail: string): Promise<EmailTestResult> {
    const startTime = Date.now()
    
    try {
      // Create a test quote object
      const testQuote: QuoteData = {
        id: 'test-quote-' + Date.now(),
        customerInfo: {
          name: 'Test Customer',
          email: testEmail,
          phone: '555-0123',
          address: '123 Test St',
          dateOfBirth: '1990-01-01'
        },
        frameSelection: {
          brand: 'Test Brand',
          model: 'Test Model',
          color: 'Black',
          size: 'Medium',
          price: 199.99
        },
        lensOptions: {
          type: 'single-vision',
          material: 'plastic',
          coatings: ['anti-reflective'],
          prescription: {
            rightEye: { sphere: -2.0, cylinder: -1.0, axis: 90 },
            leftEye: { sphere: -2.5, cylinder: -0.5, axis: 85 }
          },
          price: 99.99
        },
        addOns: [],
        insuranceInfo: {
          provider: 'Test Insurance',
          memberId: 'TEST123',
          groupNumber: 'GROUP456',
          copay: 25.00,
          benefits: {
            frameAllowance: 150.00,
            lensAllowance: 100.00,
            frequency: '24 months'
          }
        },
        pricing: {
          subtotal: 299.98,
          tax: 24.00,
          total: 323.98,
          insurance: {
            covered: 250.00,
            remaining: 73.98
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const result = await this.emailService.sendQuoteEmail({
        to: testEmail,
        customerName: testQuote.customerInfo.name,
        quoteNumber: testQuote.id,
        quoteData: testQuote,
        pdfBuffer: Buffer.from('test-pdf-content'), // Mock PDF for testing
        customMessage: 'This is a test email from the Vision POS system.'
      })

      return {
        success: true,
        messageId: result.messageId,
        provider: result.provider,
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      }
    }
  }

  /**
   * Test email template rendering
   */
  async testTemplateRendering(): Promise<EmailTestResult> {
    const startTime = Date.now()
    
    try {
      const testQuote: QuoteData = {
        id: 'TMPL-001',
        customerInfo: {
          name: 'Template Test User',
          email: 'test@example.com',
          phone: '555-0123',
          address: '123 Template St',
          dateOfBirth: '1985-05-15'
        },
        frameSelection: {
          brand: 'Ray-Ban',
          model: 'Aviator',
          color: 'Gold',
          size: 'Large',
          price: 299.99
        },
        lensOptions: {
          type: 'progressive',
          material: 'high-index',
          coatings: ['anti-reflective', 'blue-light'],
          prescription: {
            rightEye: { sphere: -1.5, cylinder: -0.75, axis: 180 },
            leftEye: { sphere: -1.75, cylinder: -0.5, axis: 175 }
          },
          price: 199.99
        },
        addOns: [],
        insuranceInfo: {
          provider: 'Vision Plus',
          memberId: 'VP123456',
          groupNumber: 'GROUP789',
          copay: 25.00,
          benefits: {
            frameAllowance: 200.00,
            lensAllowance: 150.00,
            frequency: '24 months'
          }
        },
        pricing: {
          subtotal: 499.98,
          tax: 40.00,
          total: 539.98,
          insurance: {
            covered: 350.00,
            remaining: 189.98
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Test HTML template
      const htmlTemplate = this.emailService.generateHtmlTemplate(
        testQuote,
        'Testing HTML template rendering functionality.'
      )

      // Test plain text template
      const textTemplate = this.emailService.generateTextTemplate(
        testQuote,
        'Testing plain text template rendering functionality.'
      )

      // Verify templates contain expected content
      const htmlChecks = [
        htmlTemplate.includes(testQuote.customerInfo.name),
        htmlTemplate.includes(testQuote.id),
        htmlTemplate.includes('Ray-Ban Aviator'),
        htmlTemplate.includes('Testing HTML template')
      ]

      const textChecks = [
        textTemplate.includes(testQuote.customerInfo.name),
        textTemplate.includes(testQuote.id),
        textTemplate.includes('Ray-Ban Aviator'),
        textTemplate.includes('Testing plain text template')
      ]

      const allChecksPass = [...htmlChecks, ...textChecks].every(Boolean)

      return {
        success: allChecksPass,
        details: {
          htmlTemplate: {
            length: htmlTemplate.length,
            checks: htmlChecks
          },
          textTemplate: {
            length: textTemplate.length,
            checks: textChecks
          }
        },
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Template rendering failed',
        duration: Date.now() - startTime
      }
    }
  }

  /**
   * Test database logging functionality
   */
  async testDatabaseLogging(): Promise<EmailTestResult> {
    const startTime = Date.now()
    
    try {
      const prisma = getPrismaClient()
      
      // Create a test email log entry
      const testLogEntry = await prisma.emailLogs.create({
        data: {
          quoteId: 'test-quote-db',
          recipientEmail: 'db-test@example.com',
          subject: 'Database Test Email',
          status: 'SENT',
          provider: 'TEST_PROVIDER',
          messageId: 'test-message-' + Date.now(),
          retryCount: 0,
          sentAt: new Date()
        }
      })

      // Verify the entry was created
      const retrievedEntry = await prisma.emailLogs.findUnique({
        where: { id: testLogEntry.id }
      })

      if (!retrievedEntry) {
        throw new Error('Failed to retrieve created email log entry')
      }

      // Clean up test entry
      await prisma.emailLogs.delete({
        where: { id: testLogEntry.id }
      })

      return {
        success: true,
        details: {
          created: testLogEntry,
          retrieved: retrievedEntry,
          deleted: true
        },
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database logging test failed',
        duration: Date.now() - startTime
      }
    }
  }

  /**
   * Run comprehensive email system tests
   */
  async runFullTestSuite(testEmail?: string): Promise<{
    overall: boolean
    results: Record<string, EmailTestResult>
    summary: string
  }> {
    const results: Record<string, EmailTestResult> = {}
    
    console.log('🧪 Starting Email System Test Suite...\n')

    // Test 1: Configuration
    console.log('1️⃣ Testing email configuration...')
    results.configuration = await this.testConfiguration()
    console.log(results.configuration.success ? '✅ Configuration test passed' : '❌ Configuration test failed')
    
    // Test 2: Template rendering
    console.log('2️⃣ Testing template rendering...')
    results.templates = await this.testTemplateRendering()
    console.log(results.templates.success ? '✅ Template test passed' : '❌ Template test failed')
    
    // Test 3: Database logging
    console.log('3️⃣ Testing database logging...')
    results.database = await this.testDatabaseLogging()
    console.log(results.database.success ? '✅ Database test passed' : '❌ Database test failed')
    
    // Test 4: Email sending (optional)
    if (testEmail) {
      console.log('4️⃣ Testing email sending...')
      results.sending = await this.testEmailSending(testEmail)
      console.log(results.sending.success ? '✅ Email sending test passed' : '❌ Email sending test failed')
    }

    const totalTests = Object.keys(results).length
    const passedTests = Object.values(results).filter(r => r.success).length
    const overall = passedTests === totalTests

    const summary = `Email System Test Results: ${passedTests}/${totalTests} tests passed (${Math.round(passedTests/totalTests*100)}%)`
    
    console.log(`\n📊 ${summary}`)
    
    if (!overall) {
      console.log('\n❌ Failed Tests:')
      Object.entries(results).forEach(([test, result]) => {
        if (!result.success) {
          console.log(`   • ${test}: ${result.error}`)
        }
      })
    }

    return { overall, results, summary }
  }
}

/**
 * Email error handler with retry logic
 */
export class EmailErrorHandler {
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAYS = [1000, 5000, 15000] // 1s, 5s, 15s

  /**
   * Execute email operation with retry logic
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = EmailErrorHandler.MAX_RETRIES
  ): Promise<T> {
    let lastError: Error = new Error('No error occurred')
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break
        }

        // Don't retry certain types of errors
        if (this.isNonRetryableError(lastError)) {
          break
        }

        // Wait before retrying
        const delay = this.RETRY_DELAYS[attempt] || 15000
        await this.sleep(delay)
        
        console.log(`Email operation failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`)
      }
    }
    
    throw lastError
  }

  /**
   * Check if an error should not be retried
   */
  private static isNonRetryableError(error: Error): boolean {
    const nonRetryablePatterns = [
      /invalid.*email/i,
      /authentication.*failed/i,
      /unauthorized/i,
      /forbidden/i,
      /not.*found/i,
      /bad.*request/i
    ]
    
    return nonRetryablePatterns.some(pattern => pattern.test(error.message))
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Log email error with context
   */
  static async logError(
    error: Error,
    context: {
      quoteId?: string
      recipientEmail?: string
      operation?: string
      provider?: string
      retryCount?: number
    }
  ): Promise<void> {
    const errorLog = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context
    }
    
    console.error('📧 Email Error:', JSON.stringify(errorLog, null, 2))
    
    // Log to database if quote ID is available
    if (context.quoteId && context.recipientEmail) {
      try {
        const prisma = getPrismaClient()
        await prisma.emailLogs.create({
          data: {
            quoteId: context.quoteId,
            recipientEmail: context.recipientEmail,
            subject: 'Email Error Log',
            status: 'FAILED',
            provider: context.provider || 'UNKNOWN',
            errorMessage: error.message,
            retryCount: context.retryCount || 0,
            sentAt: new Date()
          }
        })
      } catch (dbError) {
        console.error('Failed to log email error to database:', dbError)
      }
    }
  }
}

/**
 * Email validation utilities
 */
export class EmailValidator {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  private static readonly DISPOSABLE_DOMAINS = [
    '10minutemail.com',
    'temp-mail.org',
    'guerrillamail.com',
    'mailinator.com',
    'yopmail.com'
  ]

  /**
   * Validate email address format
   */
  static isValidEmail(email: string): boolean {
    return this.EMAIL_REGEX.test(email.trim())
  }

  /**
   * Check if email domain is disposable
   */
  static isDisposableEmail(email: string): boolean {
    const domain = email.split('@')[1]?.toLowerCase()
    return this.DISPOSABLE_DOMAINS.includes(domain)
  }

  /**
   * Validate and sanitize email list
   */
  static validateEmailList(emails: string[]): {
    valid: string[]
    invalid: string[]
    disposable: string[]
  } {
    const result = {
      valid: [] as string[],
      invalid: [] as string[],
      disposable: [] as string[]
    }

    emails.forEach(email => {
      const cleanEmail = email.trim().toLowerCase()
      
      if (!this.isValidEmail(cleanEmail)) {
        result.invalid.push(email)
      } else if (this.isDisposableEmail(cleanEmail)) {
        result.disposable.push(email)
      } else {
        result.valid.push(cleanEmail)
      }
    })

    return result
  }

  /**
   * Comprehensive email validation
   */
  static validateEmailForSending(email: string): {
    valid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []
    
    if (!email || !email.trim()) {
      errors.push('Email address is required')
    } else {
      const cleanEmail = email.trim()
      
      if (!this.isValidEmail(cleanEmail)) {
        errors.push('Invalid email address format')
      }
      
      if (this.isDisposableEmail(cleanEmail)) {
        warnings.push('Email appears to be from a disposable email service')
      }
      
      if (cleanEmail.length > 254) {
        errors.push('Email address is too long (max 254 characters)')
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }
}