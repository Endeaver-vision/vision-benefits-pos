/**
 * Week 7 Day 1 - Quote Auto-Expiration Background Job
 * 
 * Handles automatic expiration of quotes after 30 days and sends warning notifications
 */

import { PrismaClient } from '@prisma/client'
import { QuoteStatus, QuoteExpirationManager } from '@/lib/quote-state-machine'

const prisma = new PrismaClient()

export interface ExpirationJobResult {
  quotesChecked: number
  quotesExpired: number
  warningsSent: number
  errors: string[]
  executionTimeMs: number
}

export interface ExpirationJobOptions {
  dryRun?: boolean
  batchSize?: number
  maxQuotesToProcess?: number
  sendNotifications?: boolean
  logVerbose?: boolean
}

export class QuoteExpirationJob {
  private options: Required<ExpirationJobOptions>
  private startTime: number = 0

  constructor(options: ExpirationJobOptions = {}) {
    this.options = {
      dryRun: options.dryRun ?? false,
      batchSize: options.batchSize ?? 100,
      maxQuotesToProcess: options.maxQuotesToProcess ?? 1000,
      sendNotifications: options.sendNotifications ?? true,
      logVerbose: options.logVerbose ?? false
    }
  }

  /**
   * Main execution method for the expiration job
   */
  async execute(): Promise<ExpirationJobResult> {
    this.startTime = Date.now()
    
    const result: ExpirationJobResult = {
      quotesChecked: 0,
      quotesExpired: 0,
      warningsSent: 0,
      errors: [],
      executionTimeMs: 0
    }

    try {
      this.log('Starting quote expiration job...', 'info')

      // Step 1: Find quotes eligible for expiration or warning
      const eligibleQuotes = await this.findEligibleQuotes()
      result.quotesChecked = eligibleQuotes.length

      this.log(`Found ${eligibleQuotes.length} quotes to process`, 'info')

      // Step 2: Process quotes in batches
      const batchCount = Math.ceil(eligibleQuotes.length / this.options.batchSize)
      
      for (let i = 0; i < batchCount; i++) {
        const startIdx = i * this.options.batchSize
        const endIdx = Math.min(startIdx + this.options.batchSize, eligibleQuotes.length)
        const batch = eligibleQuotes.slice(startIdx, endIdx)

        this.log(`Processing batch ${i + 1}/${batchCount} (${batch.length} quotes)`, 'verbose')

        const batchResult = await this.processBatch(batch)
        result.quotesExpired += batchResult.expired
        result.warningsSent += batchResult.warnings
        result.errors.push(...batchResult.errors)
      }

      result.executionTimeMs = Date.now() - this.startTime
      this.log(`Quote expiration job completed in ${result.executionTimeMs}ms`, 'info')
      this.log(`Results: ${result.quotesExpired} expired, ${result.warningsSent} warnings sent`, 'info')

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      result.errors.push(`Fatal error in expiration job: ${errorMessage}`)
      result.executionTimeMs = Date.now() - this.startTime
      
      this.log(`Quote expiration job failed: ${errorMessage}`, 'error')
      return result
    } finally {
      await prisma.$disconnect()
    }
  }

  /**
   * Find quotes eligible for expiration or warning notification
   */
  private async findEligibleQuotes() {
    const expirableStatuses = [QuoteStatus.DRAFT, QuoteStatus.PRESENTED]
    
    // Calculate the cutoff date for expiration (30 days ago by default)
    const now = new Date()
    const expirationCutoff = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
    const warningCutoff = new Date(now.getTime() - (27 * 24 * 60 * 60 * 1000)) // 3 days before expiration

    const quotes = await prisma.quotes.findMany({
      where: {
        status: {
          in: expirableStatuses
        },
        OR: [
          {
            // Quotes ready to expire
            lastActivityAt: {
              lte: expirationCutoff
            },
            expiredAt: null
          },
          {
            // Quotes ready for warning (if warning not sent yet)
            lastActivityAt: {
              lte: warningCutoff
            },
            expireNotificationSent: false,
            expiredAt: null
          }
        ]
      },
      include: {
        customers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      take: this.options.maxQuotesToProcess,
      orderBy: {
        lastActivityAt: 'asc' // Process oldest first
      }
    })

    return quotes
  }

  /**
   * Process a batch of quotes for expiration/warnings
   */
  private async processBatch(quotes: any[]): Promise<{
    expired: number
    warnings: number
    errors: string[]
  }> {
    const result = {
      expired: 0,
      warnings: 0,
      errors: []
    }

    for (const quote of quotes) {
      try {
        const shouldExpire = QuoteExpirationManager.shouldExpire(quote)
        const shouldWarn = QuoteExpirationManager.shouldSendExpirationWarning(quote)

        if (shouldExpire) {
          await this.expireQuote(quote)
          result.expired++
          this.log(`Expired quote ${quote.quoteNumber}`, 'verbose')
        } else if (shouldWarn) {
          await this.sendExpirationWarning(quote)
          result.warnings++
          this.log(`Sent warning for quote ${quote.quoteNumber}`, 'verbose')
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push(`Error processing quote ${quote.quoteNumber}: ${errorMessage}`)
        this.log(`Error processing quote ${quote.quoteNumber}: ${errorMessage}`, 'error')
      }
    }

    return result
  }

  /**
   * Expire a specific quote
   */
  private async expireQuote(quote: any): Promise<void> {
    if (this.options.dryRun) {
      this.log(`[DRY RUN] Would expire quote ${quote.quoteNumber}`, 'info')
      return
    }

    const now = new Date()

    await prisma.quotes.update({
      where: { id: quote.id },
      data: {
        status: QuoteStatus.EXPIRED,
        previousStatus: quote.status,
        statusChangedAt: now,
        statusChangedBy: 'system',
        statusReason: 'Auto-expired after 30 days of inactivity',
        expiredAt: now,
        lastActivityAt: now,
        updatedAt: now
      }
    })

    // Send expiration notification
    if (this.options.sendNotifications) {
      await this.sendExpirationNotification(quote)
    }

    // Log the expiration
    await this.logQuoteExpiration(quote)
  }

  /**
   * Send expiration warning notification
   */
  private async sendExpirationWarning(quote: any): Promise<void> {
    if (this.options.dryRun) {
      this.log(`[DRY RUN] Would send warning for quote ${quote.quoteNumber}`, 'info')
      return
    }

    const daysUntilExpiration = QuoteExpirationManager.getDaysUntilExpiration(quote)

    // Update the notification sent flag
    await prisma.quotes.update({
      where: { id: quote.id },
      data: {
        expireNotificationSent: true,
        expireNotificationSentAt: new Date()
      }
    })

    // Send warning email (simulated for now)
    await this.sendWarningEmail(quote, daysUntilExpiration)
  }

  /**
   * Send expiration notification email
   */
  private async sendExpirationNotification(quote: any): Promise<void> {
    // In a real implementation, this would integrate with an email service
    this.log(`Sending expiration notification for quote ${quote.quoteNumber} to ${quote.customers?.email}`, 'info')

    // Simulate email sending
    const emailData = {
      to: quote.customers?.email,
      subject: `Quote ${quote.quoteNumber} has expired`,
      template: 'quote_expired',
      data: {
        customerName: `${quote.customers?.firstName} ${quote.customers?.lastName}`,
        quoteNumber: quote.quoteNumber,
        expirationDate: quote.expiredAt,
        salesAssociate: `${quote.users?.firstName} ${quote.users?.lastName}`
      }
    }

    this.log(`Email notification queued: ${JSON.stringify(emailData)}`, 'verbose')
  }

  /**
   * Send warning email before expiration
   */
  private async sendWarningEmail(quote: any, daysUntilExpiration: number): Promise<void> {
    this.log(`Sending expiration warning for quote ${quote.quoteNumber} to ${quote.customers?.email}`, 'info')

    const emailData = {
      to: quote.customers?.email,
      cc: quote.users?.email,
      subject: `Quote ${quote.quoteNumber} expires in ${daysUntilExpiration} days`,
      template: 'quote_expiration_warning',
      data: {
        customerName: `${quote.customers?.firstName} ${quote.customers?.lastName}`,
        quoteNumber: quote.quoteNumber,
        daysUntilExpiration,
        salesAssociate: `${quote.users?.firstName} ${quote.users?.lastName}`,
        quoteLink: `${process.env.NEXT_PUBLIC_BASE_URL}/quotes/${quote.id}`
      }
    }

    this.log(`Warning email queued: ${JSON.stringify(emailData)}`, 'verbose')
  }

  /**
   * Log quote expiration for audit trail
   */
  private async logQuoteExpiration(quote: any): Promise<void> {
    // In a real implementation, this would log to a dedicated audit table
    this.log(`Quote expiration logged for ${quote.quoteNumber}`, 'verbose')
  }

  /**
   * Logging utility
   */
  private log(message: string, level: 'info' | 'verbose' | 'error' | 'warn' = 'info'): void {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`

    if (level === 'error' || level === 'warn') {
      console.error(logMessage)
    } else if (level === 'verbose' && this.options.logVerbose) {
      console.log(logMessage)
    } else if (level === 'info') {
      console.log(logMessage)
    }
  }
}

/**
 * Utility function to run the expiration job
 */
export async function runQuoteExpirationJob(options?: ExpirationJobOptions): Promise<ExpirationJobResult> {
  const job = new QuoteExpirationJob(options)
  return await job.execute()
}

/**
 * Cron job wrapper for scheduled execution
 */
export async function scheduleQuoteExpirationJob(): Promise<void> {
  console.log('Starting scheduled quote expiration job...')
  
  try {
    const result = await runQuoteExpirationJob({
      dryRun: false,
      sendNotifications: true,
      logVerbose: process.env.NODE_ENV === 'development'
    })

    console.log('Quote expiration job completed:', {
      quotesChecked: result.quotesChecked,
      quotesExpired: result.quotesExpired,
      warningsSent: result.warningsSent,
      errors: result.errors.length,
      executionTimeMs: result.executionTimeMs
    })

    // Alert on errors
    if (result.errors.length > 0) {
      console.error('Quote expiration job had errors:', result.errors)
    }

  } catch (error) {
    console.error('Quote expiration job failed:', error)
  }
}

export default QuoteExpirationJob