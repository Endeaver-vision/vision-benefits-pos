#!/usr/bin/env node

/**
 * Email System Test Runner
 * 
 * This script validates the email delivery system for the Vision POS application.
 * 
 * Usage:
 *   npm run test:email
 *   npm run test:email -- --send-test user@example.com
 */

import { EmailTester } from '../src/lib/email-testing-simple'

const args = process.argv.slice(2)
const shouldSendTest = args.includes('--send-test')
const testEmail = shouldSendTest ? args[args.indexOf('--send-test') + 1] : undefined

async function main() {
  console.log('🚀 Vision POS Email System Test Suite')
  console.log('=====================================\n')

  try {
    const tester = new EmailTester()
    
    // Run comprehensive test suite
    const results = await tester.runFullTestSuite(testEmail)
    
    console.log('\n📋 Detailed Results:')
    console.log('====================')
    
    Object.entries(results.results).forEach(([testName, result]) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL'
      const duration = result.duration ? `(${result.duration}ms)` : ''
      
      console.log(`${status} ${testName} ${duration}`)
      
      if (!result.success && result.error) {
        console.log(`    Error: ${result.error}`)
      }
      
      if (result.details) {
        console.log(`    Details: ${JSON.stringify(result.details, null, 2)}`)
      }
    })
    
    console.log(`\n${results.summary}`)
    
    if (results.overall) {
      console.log('\n🎉 All tests passed! Email system is ready for production.')
      process.exit(0)
    } else {
      console.log('\n⚠️  Some tests failed. Please review the results above.')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('💥 Test suite failed to run:', error)
    process.exit(1)
  }
}

// Display help information
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Email System Test Runner

Usage:
  npm run test:email                           Run all tests except email sending
  npm run test:email -- --send-test EMAIL     Run all tests including sending test email
  npm run test:email -- --help                Show this help message

Examples:
  npm run test:email
  npm run test:email -- --send-test test@example.com

Test Categories:
  • Configuration Test    - Validates email service setup
  • Template Test         - Verifies email template generation
  • Database Test         - Checks email logging functionality
  • Email Sending Test    - Sends actual test email (optional)

Environment Variables Required:
  SENDGRID_API_KEY        SendGrid API key for email delivery
  OR
  SMTP_HOST               SMTP server hostname
  SMTP_PORT               SMTP server port (default: 587)
  SMTP_USER               SMTP username
  SMTP_PASS               SMTP password
  SMTP_SECURE             Use TLS (true/false, default: false)
`)
  process.exit(0)
}

// Validate test email if provided
if (shouldSendTest && (!testEmail || !testEmail.includes('@'))) {
  console.error('❌ Invalid test email address provided.')
  console.error('Usage: npm run test:email -- --send-test user@example.com')
  process.exit(1)
}

// Run the test suite
main().catch(console.error)