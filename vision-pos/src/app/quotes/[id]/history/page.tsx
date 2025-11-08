'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QuoteStatusBadge, QuoteStatus } from '@/components/ui/quote-status-badge';
import { 
  ArrowLeft, 
  Clock, 
  User, 
  FileText,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  Activity
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface Quote {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  previousStatus: string | null;
  statusChangedAt: string;
  statusChangedBy: string | null;
  statusReason: string | null;
  buildingCompleted: boolean;
  presentationCompleted: boolean;
  signaturesCompleted: boolean;
  paymentCompleted: boolean;
  fulfillmentCompleted: boolean;
  buildingCompletedAt: string | null;
  draftCreatedAt: string | null;
  presentedAt: string | null;
  signedAt: string | null;
  cancelledAt: string | null;
  expiredAt: string | null;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
  customers: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  customerName: string;
  total: number;
}

interface StatusHistory {
  timestamp: string;
  status: QuoteStatus;
  previousStatus: string | null;
  description: string;
  user?: string;
  reason?: string;
}

export default function QuoteHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const quoteId = params.id as string;

  useEffect(() => {
    fetchQuoteHistory();
  }, [quoteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchQuoteHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/quotes/${quoteId}`);
      const data = await response.json();

      if (response.ok) {
        setQuote(data);
        generateStatusHistory(data);
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

  const generateStatusHistory = (quoteData: Quote) => {
    const history: StatusHistory[] = [];

    // Quote created
    history.push({
      timestamp: quoteData.createdAt,
      status: 'BUILDING' as QuoteStatus,
      previousStatus: null,
      description: 'Quote created and building started',
      user: 'System'
    });

    // Building completed
    if (quoteData.buildingCompletedAt) {
      history.push({
        timestamp: quoteData.buildingCompletedAt,
        status: 'BUILDING' as QuoteStatus,
        previousStatus: 'BUILDING',
        description: 'Quote building phase completed',
        user: 'System'
      });
    }

    // Draft created
    if (quoteData.draftCreatedAt) {
      history.push({
        timestamp: quoteData.draftCreatedAt,
        status: 'DRAFT' as QuoteStatus,
        previousStatus: 'BUILDING',
        description: 'Quote saved as draft',
        user: quoteData.statusChangedBy || 'System'
      });
    }

    // Presented
    if (quoteData.presentedAt) {
      history.push({
        timestamp: quoteData.presentedAt,
        status: 'PRESENTED' as QuoteStatus,
        previousStatus: 'DRAFT',
        description: 'Quote presented to customer',
        user: quoteData.statusChangedBy || 'System'
      });
    }

    // Signed
    if (quoteData.signedAt) {
      history.push({
        timestamp: quoteData.signedAt,
        status: 'SIGNED' as QuoteStatus,
        previousStatus: 'PRESENTED',
        description: 'Quote signed by customer',
        user: 'Customer'
      });
    }

    // Cancelled
    if (quoteData.cancelledAt) {
      history.push({
        timestamp: quoteData.cancelledAt,
        status: 'CANCELLED' as QuoteStatus,
        previousStatus: quoteData.previousStatus,
        description: 'Quote was cancelled',
        user: quoteData.statusChangedBy || 'System',
        reason: quoteData.statusReason || undefined
      });
    }

    // Expired
    if (quoteData.expiredAt) {
      history.push({
        timestamp: quoteData.expiredAt,
        status: 'EXPIRED' as QuoteStatus,
        previousStatus: quoteData.previousStatus,
        description: 'Quote expired automatically',
        user: 'System'
      });
    }

    // Current status change
    if (quoteData.statusChangedAt !== quoteData.createdAt) {
      history.push({
        timestamp: quoteData.statusChangedAt,
        status: quoteData.status,
        previousStatus: quoteData.previousStatus,
        description: `Quote status changed to ${quoteData.status}`,
        user: quoteData.statusChangedBy || 'System',
        reason: quoteData.statusReason || undefined
      });
    }

    // Sort by timestamp (most recent first)
    history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    setStatusHistory(history);
  };

  const getStatusIcon = (status: QuoteStatus) => {
    switch (status) {
      case 'BUILDING':
        return <Clock className="h-4 w-4" />;
      case 'DRAFT':
        return <FileText className="h-4 w-4" />;
      case 'PRESENTED':
        return <Eye className="h-4 w-4" />;
      case 'SIGNED':
        return <CheckCircle className="h-4 w-4" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4" />;
      case 'EXPIRED':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
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
            <h1 className="text-2xl font-bold text-gray-900">Quote History</h1>
            <p className="text-gray-600">Track status changes for {quote.quoteNumber}</p>
          </div>
        </div>
        <QuoteStatusBadge status={quote.status} size="lg" />
      </div>

      {/* Quote Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quote Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Quote Number</label>
                <p className="font-mono text-lg">{quote.quoteNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Customer</label>
                <p className="font-medium">{quote.customerName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Total Amount</label>
                <p className="text-lg font-bold">${quote.total.toFixed(2)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Activity</label>
                <p>{formatDistanceToNow(new Date(quote.lastActivityAt))} ago</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completion Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Building Phase</span>
              {quote.buildingCompleted ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Clock className="h-4 w-4 text-gray-400" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Presentation</span>
              {quote.presentationCompleted ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Clock className="h-4 w-4 text-gray-400" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Signatures</span>
              {quote.signaturesCompleted ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Clock className="h-4 w-4 text-gray-400" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Payment</span>
              {quote.paymentCompleted ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Clock className="h-4 w-4 text-gray-400" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Fulfillment</span>
              {quote.fulfillmentCompleted ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Clock className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status History Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Status History Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {statusHistory.map((event, index) => (
              <div key={index} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center w-8 h-8 bg-white border-2 border-gray-200 rounded-full">
                    {getStatusIcon(event.status)}
                  </div>
                  {index < statusHistory.length - 1 && (
                    <div className="w-px h-8 bg-gray-200 mt-2" />
                  )}
                </div>

                {/* Event details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <QuoteStatusBadge status={event.status} size="sm" />
                    <span className="text-sm text-gray-500">
                      {format(new Date(event.timestamp), 'MMM dd, yyyy • h:mm a')}
                    </span>
                  </div>
                  
                  <h4 className="font-medium text-gray-900 mb-1">
                    {event.description}
                  </h4>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {event.user && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{event.user}</span>
                      </div>
                    )}
                    {event.reason && (
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        <span>Reason: {event.reason}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDistanceToNow(new Date(event.timestamp))} ago</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {statusHistory.length === 0 && (
            <div className="text-center py-8">
              <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No status history available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.push('/quotes')}
        >
          Back to Quotes
        </Button>
        <Button
          onClick={() => router.push(`/quotes/${quote.id}`)}
        >
          View Quote Details
        </Button>
      </div>
    </div>
  );
}