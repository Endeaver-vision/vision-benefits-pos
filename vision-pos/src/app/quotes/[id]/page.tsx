/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QuoteStatusBadge, QuoteStatus, canResumeQuote } from '@/components/ui/quote-status-badge';
import { 
  ArrowLeft, 
  FileText, 
  User, 
  RefreshCw,
  AlertCircle,
  Edit,
  History,
  Eye,
  Clock
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
  discount: number;
  insuranceDiscount: number;
  total: number;
  patientResponsibility: number;
  createdAt: string;
  updatedAt: string;
  statusChangedAt: string;
  lastActivityAt: string;
  customers: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  customerName: string;
}

export default function QuoteDetailsPage() {
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
    router.push(`/quote-builder/resume/${quote.id}`);
  };

  const handleViewHistory = () => {
    if (!quote) return;
    router.push(`/quotes/${quote.id}/history`);
  };

  const renderServiceItems = (services: any[], title: string) => {
    if (!services || services.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="font-medium text-gray-900">{title}</h4>
        <div className="space-y-2">
          {services.map((service: any, index: number) => (
            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">{service.name || service.description || 'Service Item'}</p>
                {service.details && (
                  <p className="text-sm text-gray-600">{service.details}</p>
                )}
              </div>
              <div className="text-right">
                {service.price && (
                  <p className="font-medium">${service.price.toFixed(2)}</p>
                )}
                {service.quantity && (
                  <p className="text-sm text-gray-600">Qty: {service.quantity}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
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
            <h1 className="text-2xl font-bold text-gray-900">{quote.quoteNumber}</h1>
            <p className="text-gray-600">Quote Details</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <QuoteStatusBadge status={quote.status} size="lg" />
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewHistory}
          >
            <History className="h-4 w-4 mr-2" />
            History
          </Button>
        </div>
      </div>

      {/* Quote Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Quote Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
              <p>{format(new Date(quote.createdAt), 'MMM dd, yyyy • h:mm a')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Last Updated</label>
              <p>{format(new Date(quote.updatedAt), 'MMM dd, yyyy • h:mm a')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Last Activity</label>
              <p>{format(new Date(quote.lastActivityAt), 'MMM dd, yyyy • h:mm a')}</p>
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

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>${quote.subtotal.toFixed(2)}</span>
            </div>
            {quote.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-${quote.discount.toFixed(2)}</span>
              </div>
            )}
            {quote.insuranceDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Insurance Discount</span>
                <span>-${quote.insuranceDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Tax</span>
              <span>${quote.tax.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${quote.total.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-between text-blue-600 font-medium">
              <span>Patient Responsibility</span>
              <span>${quote.patientResponsibility.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Services and Products */}
      <Card>
        <CardHeader>
          <CardTitle>Services and Products</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderServiceItems(quote.examServices, 'Exam Services')}
          {renderServiceItems(quote.eyeglasses, 'Eyeglasses')}
          {renderServiceItems(quote.contacts, 'Contact Lenses')}
          
          {(!quote.examServices?.length && !quote.eyeglasses?.length && !quote.contacts?.length) && (
            <div className="text-center py-8">
              <Eye className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No services or products added yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Patient Information */}
      {quote.patientInfo && Object.keys(quote.patientInfo).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(quote.patientInfo).map(([key, value]) => (
                <div key={key}>
                  <label className="text-sm font-medium text-gray-500 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  <p className="text-sm">{String(value)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insurance Information */}
      {quote.insuranceInfo && Object.keys(quote.insuranceInfo).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Insurance Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(quote.insuranceInfo).map(([key, value]) => (
                <div key={key}>
                  <label className="text-sm font-medium text-gray-500 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  <p className="text-sm">{String(value)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.push('/quotes')}
        >
          Back to Quotes
        </Button>
        
        {canResumeQuote(quote.status) && (
          <Button
            onClick={handleResumeQuote}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Edit className="h-4 w-4 mr-2" />
            Resume Quote
          </Button>
        )}
        
        <Button
          variant="outline"
          onClick={handleViewHistory}
        >
          <Clock className="h-4 w-4 mr-2" />
          View History
        </Button>
      </div>
    </div>
  );
}