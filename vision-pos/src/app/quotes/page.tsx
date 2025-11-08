'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  QuoteStatusBadge, 
  QuoteStatus, 
  getAllQuoteStatuses,
  canResumeQuote,
  canCancelQuote 
} from '@/components/ui/quote-status-badge';
import { 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  XCircle, 
  Calendar,
  RefreshCw,
  FileText,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

interface Quote {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  customerName: string;
  itemCount: number;
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
  statusChangedAt: string;
  customers: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    companyName: string;
  };
}

interface QuoteStats {
  statusStats: Record<string, number>;
  totalValue: number;
  recentQuotes: number;
  expiringQuotes: number;
}

interface CancelDialogData {
  isOpen: boolean;
  quote: Quote | null;
  reason: string;
}

export default function QuoteDashboard() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [stats, setStats] = useState<QuoteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [cancelDialog, setCancelDialog] = useState<CancelDialogData>({
    isOpen: false,
    quote: null,
    reason: ''
  });

  const cancelReasons = [
    'Customer changed mind',
    'Insurance issues',
    'Budget constraints',
    'Found better option elsewhere',
    'Timing issues',
    'Product unavailable',
    'Other'
  ];

  // Fetch quotes with filters
  const fetchQuotes = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(statusFilter !== 'ALL' && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/quotes?${params}`);
      const data = await response.json();

      if (response.ok) {
        setQuotes(data.quotes);
        setTotalPages(data.pagination.totalPages);
        setCurrentPage(data.pagination.currentPage);
      }
    } catch (error) {
      console.error('Error fetching quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stats' })
      });
      const data = await response.json();
      
      if (response.ok) {
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  // Resume draft quote
  const handleResumeQuote = (quote: Quote) => {
    router.push(`/quote-builder/resume/${quote.id}`);
  };

  // Open cancel dialog
  const handleCancelQuote = (quote: Quote) => {
    setCancelDialog({
      isOpen: true,
      quote,
      reason: ''
    });
  };

  // Execute quote cancellation
  const executeCancelQuote = async () => {
    if (!cancelDialog.quote || !cancelDialog.reason) return;

    try {
      const response = await fetch(`/api/quotes/${cancelDialog.quote.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANCELLED',
          reason: cancelDialog.reason
        })
      });

      if (response.ok) {
        // Refresh quotes list
        fetchQuotes(currentPage);
        fetchStats();
        
        // Close dialog
        setCancelDialog({
          isOpen: false,
          quote: null,
          reason: ''
        });
      }
    } catch (error) {
      console.error('Error cancelling quote:', error);
    }
  };

  // View quote details
  const handleViewQuote = (quote: Quote) => {
    router.push(`/quotes/${quote.id}`);
  };

  useEffect(() => {
    fetchQuotes();
    fetchStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      fetchQuotes(1);
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quote Management</h1>
          <p className="text-gray-600 mt-1">Manage quotes, track status, and monitor sales pipeline</p>
        </div>
        <Button 
          onClick={() => router.push('/quote-builder/new')}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Quote
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${stats.totalValue.toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Quotes</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Object.values(stats.statusStats).reduce((a, b) => a + b, 0)}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Recent (7 days)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.recentQuotes}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.expiringQuotes}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Filter Pills */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === 'ALL' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('ALL')}
          className="h-8"
        >
          All Quotes {stats && `(${Object.values(stats.statusStats).reduce((a, b) => a + b, 0)})`}
        </Button>
        {getAllQuoteStatuses().map(({ value, label }) => (
          <Button
            key={value}
            variant={statusFilter === value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(value)}
            className="h-8"
          >
            {label} {stats && stats.statusStats[value] && `(${stats.statusStats[value]})`}
          </Button>
        ))}
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search quotes by number, customer name, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                fetchQuotes(currentPage);
                fetchStats();
              }}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quotes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Quotes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-mono text-sm">
                        {quote.quoteNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{quote.customerName}</div>
                          <div className="text-sm text-gray-500">
                            {quote.customers.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <QuoteStatusBadge status={quote.status} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {quote.itemCount} items
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        ${quote.total.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {format(new Date(quote.createdAt), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewQuote(quote)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {canResumeQuote(quote.status) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResumeQuote(quote)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {canCancelQuote(quote.status) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelQuote(quote)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => fetchQuotes(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-4 text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => fetchQuotes(currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Quote Dialog */}
      <Dialog open={cancelDialog.isOpen} onOpenChange={(open) => {
        if (!open) {
          setCancelDialog({
            isOpen: false,
            quote: null,
            reason: ''
          });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Quote</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel quote {cancelDialog.quote?.quoteNumber}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason for cancellation *</label>
              <Select value={cancelDialog.reason} onValueChange={(value) => 
                setCancelDialog(prev => ({ ...prev, reason: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {cancelReasons.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCancelDialog({
                isOpen: false,
                quote: null,
                reason: ''
              })}
            >
              Keep Quote
            </Button>
            <Button 
              variant="destructive"
              onClick={executeCancelQuote}
              disabled={!cancelDialog.reason}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}