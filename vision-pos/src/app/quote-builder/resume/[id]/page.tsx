/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QuoteStatusBadge, QuoteStatus } from '@/components/ui/quote-status-badge';
import { 
  ArrowLeft, 
  FileText, 
  User, 
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface Quote {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  patientInfo: any;
  insuranceInfo: any;
  examServices: any[];
  eyeglasses: any[];
  contacts: any[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  customers: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  customerName: string;
}

export default function ResumeQuotePage() {
  const params = useParams();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const quoteId = params.id as string;

  useEffect(() => {
    fetchQuote();
  }, [quoteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchQuote = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/quotes/${quoteId}`);
      const data = await response.json();

      if (response.ok) {
        setQuote(data);
      } else {
        setError(data.error || 'Failed to fetch quote');
      }
    } catch (error) {
      console.error('Error fetching quote:', error);
      setError('Failed to fetch quote');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeQuote = () => {
    if (!quote) return;

    // Store quote data in sessionStorage for the quote builder
    sessionStorage.setItem('resumeQuoteData', JSON.stringify({
      quoteId: quote.id,
      patientInfo: quote.patientInfo,
      insuranceInfo: quote.insuranceInfo,
      examServices: quote.examServices,
      eyeglasses: quote.eyeglasses,
      contacts: quote.contacts,
      subtotal: quote.subtotal,
      tax: quote.tax,
      total: quote.total,
      customerId: quote.customers.id
    }));

    // Navigate to quote builder
    router.push('/quote-builder/new');
  };

  const canResumeQuote = (status: QuoteStatus): boolean => {
    return status === 'DRAFT' || status === 'BUILDING';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Quote Not Found</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Resume Quote</h1>
            <p className="text-gray-600">Continue working on {quote.quoteNumber}</p>
          </div>
        </div>
        <QuoteStatusBadge status={quote.status} size="lg" />
      </div>

      {/* Quote Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quote Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Quote Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Quote Number</label>
                <p className="font-mono text-lg">{quote.quoteNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="mt-1">
                  <QuoteStatusBadge status={quote.status} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p>{format(new Date(quote.createdAt), 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p>{format(new Date(quote.updatedAt), 'MMM dd, yyyy')}</p>
              </div>
            </div>

            {/* Items Summary */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Items Summary</h4>
              <div className="space-y-2">
                {quote.examServices.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm">Exam Services</span>
                    <Badge variant="secondary">{quote.examServices.length} items</Badge>
                  </div>
                )}
                {quote.eyeglasses.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm">Eyeglasses</span>
                    <Badge variant="secondary">{quote.eyeglasses.length} pairs</Badge>
                  </div>
                )}
                {quote.contacts.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm">Contact Lenses</span>
                    <Badge variant="secondary">{quote.contacts.length} items</Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Amount</span>
                <span className="text-xl font-bold">${quote.total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <p className="font-medium">{quote.customerName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-sm">{quote.customers.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Phone</label>
              <p className="text-sm">{quote.customers.phone || 'Not provided'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Resume Quote */}
        {canResumeQuote(quote.status) ? (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-blue-600 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900">Ready to Resume</h3>
                  <p className="text-sm text-blue-700 mb-4">
                    This quote is in {quote.status} status and can be continued in the quote builder.
                  </p>
                  <Button 
                    onClick={handleResumeQuote}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Continue Building Quote
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-gray-200 bg-gray-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-gray-500 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-700">Cannot Resume</h3>
                  <p className="text-sm text-gray-600">
                    This quote cannot be resumed because it&apos;s in {quote.status} status.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* View Details */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <FileText className="h-6 w-6 text-gray-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">View Full Details</h3>
                <p className="text-sm text-gray-600 mb-4">
                  See the complete quote details, history, and status changes.
                </p>
                <Button 
                  variant="outline"
                  onClick={() => router.push(`/quotes/${quote.id}`)}
                >
                  View Quote Details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}