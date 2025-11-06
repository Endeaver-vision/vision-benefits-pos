import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer'

// Professional quote PDF template styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontFamily: 'Helvetica'
  },
  
  // Header Section
  header: {
    flexDirection: 'row',
    marginBottom: 30,
    borderBottom: 2,
    borderBottomColor: '#2563eb',
    paddingBottom: 20
  },
  
  logo: {
    width: 80,
    height: 80,
    marginRight: 20
  },
  
  companyInfo: {
    flex: 1,
    flexDirection: 'column'
  },
  
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: 5
  },
  
  companyAddress: {
    fontSize: 10,
    color: '#6b7280',
    lineHeight: 1.4
  },
  
  quoteInfo: {
    alignItems: 'flex-end',
    minWidth: 150
  },
  
  quoteTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 10
  },
  
  quoteNumber: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 3
  },
  
  quoteDate: {
    fontSize: 12,
    color: '#374151'
  },
  
  // Customer Section
  customerSection: {
    flexDirection: 'row',
    marginBottom: 25,
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 5
  },
  
  customerColumn: {
    flex: 1,
    marginRight: 20
  },
  
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: 8,
    borderBottom: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 3
  },
  
  customerText: {
    fontSize: 10,
    color: '#374151',
    marginBottom: 3,
    lineHeight: 1.3
  },
  
  // Quote Items Section
  itemsSection: {
    marginBottom: 25
  },
  
  itemsTable: {
    border: 1,
    borderColor: '#e5e7eb',
    borderRadius: 5
  },
  
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    padding: 10,
    fontWeight: 'bold',
    fontSize: 12
  },
  
  tableRow: {
    flexDirection: 'row',
    borderBottom: 1,
    borderBottomColor: '#e5e7eb',
    padding: 10,
    fontSize: 10
  },
  
  tableRowAlt: {
    flexDirection: 'row',
    borderBottom: 1,
    borderBottomColor: '#e5e7eb',
    padding: 10,
    fontSize: 10,
    backgroundColor: '#f9fafb'
  },
  
  col1: { flex: 3, paddingRight: 10 },
  col2: { flex: 2, paddingRight: 10 },
  col3: { flex: 1, textAlign: 'right', paddingRight: 10 },
  col4: { flex: 1, textAlign: 'right', paddingRight: 10 },
  col5: { flex: 1, textAlign: 'right' },
  
  // Pricing Section
  pricingSection: {
    alignItems: 'flex-end',
    marginBottom: 25
  },
  
  pricingTable: {
    width: 300,
    border: 1,
    borderColor: '#e5e7eb',
    borderRadius: 5
  },
  
  pricingRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: 1,
    borderBottomColor: '#e5e7eb'
  },
  
  pricingLabel: {
    flex: 2,
    fontSize: 11,
    color: '#374151'
  },
  
  pricingValue: {
    flex: 1,
    fontSize: 11,
    textAlign: 'right',
    color: '#374151'
  },
  
  totalRow: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    fontWeight: 'bold'
  },
  
  totalLabel: {
    flex: 2,
    fontSize: 14
  },
  
  totalValue: {
    flex: 1,
    fontSize: 14,
    textAlign: 'right'
  },
  
  // Terms and Conditions
  termsSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8fafc',
    borderRadius: 5
  },
  
  termsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: 8
  },
  
  termsText: {
    fontSize: 9,
    color: '#6b7280',
    lineHeight: 1.4,
    marginBottom: 5
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 9,
    color: '#9ca3af',
    borderTop: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10
  },
  
  // Insurance Information
  insuranceSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#ecfdf5',
    borderRadius: 5,
    border: 1,
    borderColor: '#10b981'
  },
  
  insuranceTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#065f46',
    marginBottom: 8
  },
  
  insuranceText: {
    fontSize: 10,
    color: '#047857',
    marginBottom: 3,
    lineHeight: 1.3
  },
  
  // Special Features
  featuresSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#fef3c7',
    borderRadius: 5,
    border: 1,
    borderColor: '#f59e0b'
  },
  
  featuresTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 8
  },
  
  featureItem: {
    fontSize: 10,
    color: '#b45309',
    marginBottom: 3,
    lineHeight: 1.3
  }
})

export interface QuoteData {
  id: string
  quoteNumber: string
  date: string
  expirationDate: string
  customer: {
    name: string
    email: string
    phone: string
    address: {
      street: string
      city: string
      state: string
      zipCode: string
    }
  }
  insurance?: {
    provider: string
    memberId: string
    groupNumber: string
    planType: string
    benefits: {
      frameAllowance: number
      lensAllowance: number
      examCovered: boolean
    }
  }
  items: Array<{
    id: string
    type: 'exam' | 'eyeglasses' | 'contacts' | 'accessories'
    description: string
    details?: string
    quantity: number
    unitPrice: number
    discount: number
    total: number
  }>
  pricing: {
    subtotal: number
    discounts: number
    tax: number
    insuranceCoverage: number
    total: number
    amountDue: number
  }
  specialFeatures?: string[]
  terms: string[]
  staff: {
    name: string
    title: string
  }
  location: {
    name: string
    address: string
    phone: string
    email: string
  }
}

interface QuotePDFTemplateProps {
  quote: QuoteData
}

export function QuotePDFTemplate({ quote }: QuotePDFTemplateProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>Vision Benefits POS</Text>
            <Text style={styles.companyAddress}>
              {quote.location.address}{'\n'}
              Phone: {quote.location.phone}{'\n'}
              Email: {quote.location.email}
            </Text>
          </View>
          <View style={styles.quoteInfo}>
            <Text style={styles.quoteTitle}>QUOTE</Text>
            <Text style={styles.quoteNumber}>Quote #: {quote.quoteNumber}</Text>
            <Text style={styles.quoteDate}>Date: {quote.date}</Text>
            <Text style={styles.quoteDate}>Expires: {quote.expirationDate}</Text>
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.customerSection}>
          <View style={styles.customerColumn}>
            <Text style={styles.sectionTitle}>CUSTOMER INFORMATION</Text>
            <Text style={styles.customerText}>Name: {quote.customer.name}</Text>
            <Text style={styles.customerText}>Email: {quote.customer.email}</Text>
            <Text style={styles.customerText}>Phone: {quote.customer.phone}</Text>
            <Text style={styles.customerText}>
              Address: {quote.customer.address.street}{'\n'}
              {quote.customer.address.city}, {quote.customer.address.state} {quote.customer.address.zipCode}
            </Text>
          </View>
          
          {quote.insurance && (
            <View style={styles.customerColumn}>
              <Text style={styles.sectionTitle}>INSURANCE INFORMATION</Text>
              <Text style={styles.customerText}>Provider: {quote.insurance.provider}</Text>
              <Text style={styles.customerText}>Member ID: {quote.insurance.memberId}</Text>
              <Text style={styles.customerText}>Group #: {quote.insurance.groupNumber}</Text>
              <Text style={styles.customerText}>Plan: {quote.insurance.planType}</Text>
            </View>
          )}
        </View>

        {/* Insurance Benefits */}
        {quote.insurance && (
          <View style={styles.insuranceSection}>
            <Text style={styles.insuranceTitle}>INSURANCE BENEFITS</Text>
            <Text style={styles.insuranceText}>
              Frame Allowance: ${quote.insurance.benefits.frameAllowance.toFixed(2)}
            </Text>
            <Text style={styles.insuranceText}>
              Lens Allowance: ${quote.insurance.benefits.lensAllowance.toFixed(2)}
            </Text>
            <Text style={styles.insuranceText}>
              Exam Coverage: {quote.insurance.benefits.examCovered ? 'Covered' : 'Not Covered'}
            </Text>
          </View>
        )}

        {/* Special Features */}
        {quote.specialFeatures && quote.specialFeatures.length > 0 && (
          <View style={styles.featuresSection}>
            <Text style={styles.featuresTitle}>SPECIAL FEATURES & NOTES</Text>
            {quote.specialFeatures.map((feature, index) => (
              <Text key={index} style={styles.featureItem}>• {feature}</Text>
            ))}
          </View>
        )}

        {/* Quote Items */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>QUOTE ITEMS</Text>
          <View style={styles.itemsTable}>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>Description</Text>
              <Text style={styles.col2}>Details</Text>
              <Text style={styles.col3}>Qty</Text>
              <Text style={styles.col4}>Unit Price</Text>
              <Text style={styles.col5}>Total</Text>
            </View>
            
            {quote.items.map((item, index) => (
              <View key={item.id} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={styles.col1}>{item.description}</Text>
                <Text style={styles.col2}>{item.details || '-'}</Text>
                <Text style={styles.col3}>{item.quantity}</Text>
                <Text style={styles.col4}>${item.unitPrice.toFixed(2)}</Text>
                <Text style={styles.col5}>${item.total.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Pricing Summary */}
        <View style={styles.pricingSection}>
          <View style={styles.pricingTable}>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Subtotal:</Text>
              <Text style={styles.pricingValue}>${quote.pricing.subtotal.toFixed(2)}</Text>
            </View>
            
            {quote.pricing.discounts > 0 && (
              <View style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>Discounts:</Text>
                <Text style={styles.pricingValue}>-${quote.pricing.discounts.toFixed(2)}</Text>
              </View>
            )}
            
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Tax:</Text>
              <Text style={styles.pricingValue}>${quote.pricing.tax.toFixed(2)}</Text>
            </View>
            
            {quote.pricing.insuranceCoverage > 0 && (
              <View style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>Insurance Coverage:</Text>
                <Text style={styles.pricingValue}>-${quote.pricing.insuranceCoverage.toFixed(2)}</Text>
              </View>
            )}
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL:</Text>
              <Text style={styles.totalValue}>${quote.pricing.total.toFixed(2)}</Text>
            </View>
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>AMOUNT DUE:</Text>
              <Text style={styles.totalValue}>${quote.pricing.amountDue.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Terms and Conditions */}
        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>TERMS AND CONDITIONS</Text>
          {quote.terms.map((term, index) => (
            <Text key={index} style={styles.termsText}>• {term}</Text>
          ))}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          This quote was prepared by {quote.staff.name}, {quote.staff.title} | Valid until {quote.expirationDate}
          {'\n'}For questions about this quote, please contact us at {quote.location.phone} or {quote.location.email}
        </Text>
      </Page>
    </Document>
  )
}

// Default company information and terms
export const defaultQuoteData: Partial<QuoteData> = {
  location: {
    name: 'Vision Benefits POS',
    address: '123 Vision Way, Eyecare City, EC 12345',
    phone: '(555) 123-4567',
    email: 'quotes@visionbenefitspos.com'
  },
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
    name: 'Vision Specialist',
    title: 'Licensed Optician'
  }
}