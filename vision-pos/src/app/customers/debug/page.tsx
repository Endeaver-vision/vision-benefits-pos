'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  insuranceCarrier?: string;
  memberId?: string;
  customerNumber?: string;
  accountStatus: string;
  totalSpent: number;
  registrationDate: Date;
}

export default function CustomersDebugPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCustomers() {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 Fetching customers from API...');
        
        const response = await fetch('/api/customers?page=1&limit=20', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        console.log('📊 Response status:', response.status);
        console.log('📊 Response headers:', response.headers);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ API Error:', errorText);
          setError(`API Error (${response.status}): ${errorText}`);
          return;
        }
        
        const result = await response.json();
        console.log('✅ API Result:', result);
        
        if (result.success) {
          setCustomers(result.data || []);
          console.log(`🎉 Successfully loaded ${result.data?.length || 0} customers`);
        } else {
          setError(result.error || 'Unknown API error');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('💥 Fetch error:', errorMessage);
        setError(`Network Error: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    }

    fetchCustomers();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>🔄 Loading Customers...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Fetching customer data from database...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">❌ Error Loading Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
              <p className="text-red-700 font-medium">Error Details:</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
            <div className="text-sm text-gray-600">
              <p><strong>Troubleshooting Steps:</strong></p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Check that the development server is running on port 3000</li>
                <li>Verify the database connection is working</li>
                <li>Check the browser console for additional error messages</li>
                <li>Ensure the API route file is correctly configured</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            👥 Demo Customers Debug Page
          </CardTitle>
          <p className="text-muted-foreground">
            Found {customers.length} customers in the database
          </p>
        </CardHeader>
      </Card>

      {/* Customer List */}
      {customers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">😕</div>
            <h3 className="text-xl font-semibold mb-2">No Customers Found</h3>
            <p className="text-muted-foreground">
              The database appears to be empty or the API is not returning customers.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {customers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">
                        {customer.firstName} {customer.lastName}
                      </h3>
                      {customer.customerNumber && (
                        <Badge variant="outline" className="text-xs">
                          {customer.customerNumber}
                        </Badge>
                      )}
                      <Badge variant={customer.accountStatus === 'ACTIVE' ? 'default' : 'secondary'}>
                        {customer.accountStatus}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <strong>Email:</strong> {customer.email || 'N/A'}
                      </div>
                      <div>
                        <strong>Phone:</strong> {customer.phone || 'N/A'}
                      </div>
                      <div>
                        <strong>Insurance:</strong> {customer.insuranceCarrier || 'Cash Pay'}
                      </div>
                      <div>
                        <strong>Member ID:</strong> {customer.memberId || 'N/A'}
                      </div>
                      <div>
                        <strong>Total Spent:</strong> ${customer.totalSpent?.toFixed(2) || '0.00'}
                      </div>
                      <div>
                        <strong>Member Since:</strong> {new Date(customer.registrationDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Debug Info */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-sm">🔧 Debug Information</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>API Endpoint:</strong> /api/customers
            </div>
            <div>
              <strong>Total Records:</strong> {customers.length}
            </div>
            <div>
              <strong>Last Updated:</strong> {new Date().toLocaleString()}
            </div>
            <div>
              <strong>Status:</strong> <span className="text-green-600">✅ Connected</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}