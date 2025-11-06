'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gift, Clock, User, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface EligibleCustomer {
  id: string;
  name: string;
  email?: string;
  originalPurchaseDate: string;
  daysAgo: number;
  discountType: 'SAME_DAY_50' | 'THIRTY_DAY_30';
  discountPercent: number;
  originalQuoteId: string;
}

interface SecondPairDashboardWidgetProps {
  locationId?: string;
  maxCustomers?: number;
}

export function SecondPairDashboardWidget({ 
  locationId, 
  maxCustomers = 5 
}: SecondPairDashboardWidgetProps) {
  const [eligibleCustomers, setEligibleCustomers] = useState<EligibleCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchEligibleCustomers = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (locationId) params.append('locationId', locationId);
        params.append('limit', maxCustomers.toString());

        const response = await fetch(`/api/second-pair/eligible-customers?${params}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch eligible customers');
        }

        const data = await response.json();
        setEligibleCustomers(data.customers || []);
      } catch (err) {
        setError('Unable to load second pair opportunities');
        console.error('Second pair eligible customers error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEligibleCustomers();
  }, [locationId, maxCustomers]);

  const fetchEligibleCustomers = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (locationId) params.append('locationId', locationId);
      params.append('limit', maxCustomers.toString());

      const response = await fetch(`/api/second-pair/eligible-customers?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch eligible customers');
      }

      const data = await response.json();
      setEligibleCustomers(data.customers || []);
    } catch (err) {
      setError('Unable to load second pair opportunities');
      console.error('Second pair eligible customers error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDiscountIcon = (discountType: string) => {
    switch (discountType) {
      case 'SAME_DAY_50':
        return <Gift className="h-3 w-3 text-green-600" />;
      case 'THIRTY_DAY_30':
        return <Clock className="h-3 w-3 text-blue-600" />;
      default:
        return <Gift className="h-3 w-3 text-brand-purple" />;
    }
  };

  const getDiscountBadge = (customer: EligibleCustomer) => {
    switch (customer.discountType) {
      case 'SAME_DAY_50':
        return (
          <Badge className="bg-green-600 text-white text-xs">
            50% Off
          </Badge>
        );
      case 'THIRTY_DAY_30':
        return (
          <Badge className="bg-blue-600 text-white text-xs">
            30% Off
          </Badge>
        );
      default:
        return null;
    }
  };

  const handleCreateSecondPair = (customer: EligibleCustomer) => {
    // Store customer info and redirect to quote builder
    sessionStorage.setItem('selectedCustomer', JSON.stringify({
      id: customer.id,
      name: customer.name,
      email: customer.email
    }));
    sessionStorage.setItem('secondPairContext', JSON.stringify({
      originalQuoteId: customer.originalQuoteId,
      discountType: customer.discountType,
      discountPercent: customer.discountPercent
    }));
    
    router.push('/quote-builder?mode=second-pair');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Gift className="h-5 w-5 text-green-600" />
            <span>Second Pair Opportunities</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Gift className="h-5 w-5 text-green-600" />
            <span>Second Pair Opportunities</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-neutral-500">
            <p className="text-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchEligibleCustomers}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Gift className="h-5 w-5 text-green-600" />
            <span>Second Pair Opportunities</span>
          </div>
          {eligibleCustomers.length > 0 && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {eligibleCustomers.length} eligible
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {eligibleCustomers.length === 0 ? (
          <div className="text-center py-4 text-neutral-500">
            <Gift className="h-8 w-8 mx-auto mb-2 text-neutral-300" />
            <p className="text-sm">No second pair opportunities right now</p>
            <p className="text-xs text-neutral-400 mt-1">
              Customers become eligible after purchasing eyeglasses
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {eligibleCustomers.map((customer) => (
              <div
                key={customer.id}
                className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 hover:border-green-300 hover:bg-green-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-brand-purple/10 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-brand-purple" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <div className="font-medium text-sm text-neutral-900">
                        {customer.name}
                      </div>
                      {getDiscountBadge(customer)}
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-neutral-600">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {customer.daysAgo === 0 
                            ? 'Today' 
                            : `${customer.daysAgo} days ago`
                          }
                        </span>
                      </div>
                      {customer.email && (
                        <span className="truncate max-w-[120px]">
                          {customer.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <Button
                  size="sm"
                  onClick={() => handleCreateSecondPair(customer)}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs"
                >
                  {getDiscountIcon(customer.discountType)}
                  <span className="ml-1">Create Quote</span>
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            ))}
            
            {eligibleCustomers.length >= maxCustomers && (
              <div className="text-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/second-pair')}
                  className="text-xs text-brand-purple hover:text-brand-purple/80"
                >
                  View All Opportunities
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for smaller dashboard areas
export function SecondPairQuickAction({ locationId }: { locationId?: string }) {
  const [eligibleCount, setEligibleCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const params = new URLSearchParams();
        if (locationId) params.append('locationId', locationId);
        
        const response = await fetch(`/api/second-pair/eligible-count?${params}`);
        if (response.ok) {
          const data = await response.json();
          setEligibleCount(data.count || 0);
        }
      } catch (err) {
        console.error('Failed to fetch eligible count:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCount();
  }, [locationId]);

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="text-lg flex items-center space-x-2">
          <Gift className="h-5 w-5 text-green-600" />
          <span>Second Pair Sales</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          {loading ? (
            'Checking opportunities...'
          ) : eligibleCount > 0 ? (
            `${eligibleCount} customers eligible for second pair discounts`
          ) : (
            'No current second pair opportunities'
          )}
        </p>
        <Button 
          className="w-full bg-green-600 hover:bg-green-700" 
          disabled={loading || eligibleCount === 0}
          onClick={() => router.push('/second-pair')}
        >
          <Gift className="h-4 w-4 mr-2" />
          {loading ? 'Loading...' : `View Opportunities ${eligibleCount > 0 ? `(${eligibleCount})` : ''}`}
        </Button>
      </CardContent>
    </Card>
  );
}

export default SecondPairDashboardWidget;