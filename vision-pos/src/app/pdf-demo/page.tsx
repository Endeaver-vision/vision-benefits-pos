import { QuotePDFGenerator, createSampleQuote } from '@/components/pdf/quote-pdf-generator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Download, Printer, Mail, Eye } from 'lucide-react'

export default function PDFDemoPage() {
  // Create sample quote data for demonstration
  const sampleQuote = createSampleQuote()

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Week 6 Day 1 - PDF Generation</h1>
          <p className="text-muted-foreground">
            Professional quote PDF generation with branded templates
          </p>
          <div className="flex justify-center gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Day 1 Complete
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              PDF Generation Active
            </Badge>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              Professional Templates
            </Badge>
          </div>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-blue-500" />
                Professional Template
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Branded quote layout with company branding, customer info, and pricing breakdown
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Eye className="h-4 w-4 text-green-500" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Real-time PDF preview with interactive viewer for accurate layout verification
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Download className="h-4 w-4 text-purple-500" />
                Download & Print
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Generate downloadable PDFs with browser print support for immediate use
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-orange-500" />
                Email Integration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Send quotes directly to customers via email with PDF attachment
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Implementation Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Implementation Summary</CardTitle>
            <CardDescription>
              Complete PDF generation system with professional quote templates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium">✅ Completed Features</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• React-PDF library integration with @react-pdf/renderer</li>
                  <li>• Professional branded quote template design</li>
                  <li>• Responsive PDF layout with proper styling</li>
                  <li>• Customer information and insurance details</li>
                  <li>• Itemized pricing with tax and discount calculations</li>
                  <li>• Terms and conditions with staff signature</li>
                  <li>• API endpoint: POST /api/quotes/:id/generate-pdf</li>
                  <li>• PDF preview component with viewer integration</li>
                  <li>• Download, print, and email functionality</li>
                  <li>• Sample quote data generator for testing</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">🔧 Technical Implementation</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Component-based PDF template architecture</li>
                  <li>• TypeScript interfaces for quote data structure</li>
                  <li>• Puppeteer integration for server-side PDF generation</li>
                  <li>• Client-side PDF generation with react-pdf</li>
                  <li>• Professional styling with company branding</li>
                  <li>• Responsive design for different quote configurations</li>
                  <li>• Error handling and loading states</li>
                  <li>• File system storage for generated PDFs</li>
                  <li>• Email integration API endpoints</li>
                  <li>• Mobile-friendly PDF viewer interface</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PDF Generator Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Live PDF Generator Demo</CardTitle>
            <CardDescription>
              Interactive demonstration of the complete PDF generation workflow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QuotePDFGenerator 
              quote={sampleQuote}
              onEmailSent={() => console.log('Email sent successfully')}
              onPrintComplete={() => console.log('Print completed')}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}