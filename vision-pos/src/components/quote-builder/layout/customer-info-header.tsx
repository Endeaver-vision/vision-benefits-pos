'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';
import { SecondPairBadge } from '@/components/quote-builder/second-pair-badge';

// Master Plan Design System - Customer Info Header
// Shows selected customer info in center panel

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  insuranceCarrier?: string;
  memberId?: string;
}

export interface CustomerInfoHeaderProps {
  customer: Customer;
  onChangeCustomer: () => void;
  locationId?: string;
}

export function CustomerInfoHeader({ 
  customer, 
  onChangeCustomer,
  locationId 
}: CustomerInfoHeaderProps) {
  
  return (
    <Card className="border-brand-purple/20 bg-primary-purple-light">
      <CardContent className="p-card">
        <div className="flex items-center justify-between">
          
          {/* Customer Info */}
          <div className="flex items-center space-x-4">
            <div className="h-10 w-10 bg-brand-purple/10 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-brand-purple" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h3 className="heading-card text-brand-purple">
                  {customer.firstName} {customer.lastName}
                </h3>
                {/* Second Pair Badge */}
                <SecondPairBadge 
                  customerId={customer.id}
                  locationId={locationId}
                />
              </div>
              <div className="flex items-center space-x-4 text-sm text-neutral-600">
                {customer.email && <span>📧 {customer.email}</span>}
                {customer.phone && <span>📞 {customer.phone}</span>}
              </div>
              {customer.insuranceCarrier && (
                <div className="mt-1 flex items-center space-x-2">
                  <Badge 
                    variant="outline" 
                    className="text-xs border-brand-purple/30 text-brand-purple bg-white/50"
                  >
                    {customer.insuranceCarrier}
                  </Badge>
                  {customer.memberId && (
                    <span className="text-xs text-neutral-600">
                      ID: {customer.memberId}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Change Customer Button */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={onChangeCustomer}
            className="border-brand-purple/30 text-brand-purple hover:bg-brand-purple hover:text-white"
          >
            Change Customer
          </Button>
          
        </div>
      </CardContent>
    </Card>
  );
}

export default CustomerInfoHeader;