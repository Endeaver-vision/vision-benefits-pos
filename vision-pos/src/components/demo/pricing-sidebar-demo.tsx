'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PricingSidebar } from '@/components/quote-builder/layout/pricing-sidebar';
import { useQuoteStore } from '@/store/quote-store';

// Demo component to test the enhanced PricingSidebar with live Zustand integration
export function PricingSidebarDemo() {
  const { 
    quote,
    updateExamServices,
    updateInsurance,
    updateEyeglasses,
    updateContacts,
    resetQuote
  } = useQuoteStore();

  const [customerName] = useState('John Smith');

  // Mock exam services
  const examServices = [
    { id: 'comprehensive-exam', name: 'Comprehensive Exam' },
    { id: 'contact-lens-fitting', name: 'Contact Lens Fitting' },
    { id: 'retinal-imaging', name: 'Retinal Imaging' },
    { id: 'visual-field-testing', name: 'Visual Field Testing' },
    { id: 'oct-scan', name: 'OCT Scan' }
  ];

  const handleAddExamService = (serviceId: string) => {
    const currentServices = quote.exam.selectedServices;
    if (!currentServices.includes(serviceId)) {
      updateExamServices([...currentServices, serviceId]);
    }
  };

  const handleRemoveExamService = (serviceId: string) => {
    const currentServices = quote.exam.selectedServices;
    updateExamServices(currentServices.filter(id => id !== serviceId));
  };

  const handleSetInsurance = (carrier: 'VSP' | 'EyeMed' | '') => {
    updateInsurance({ 
      carrier, 
      memberId: carrier ? '123456789' : '',
      planName: carrier ? `${carrier} Standard` : ''
    });
  };

  const handleAddEyeglasses = () => {
    updateEyeglasses({
      frame: {
        id: 'frame-1',
        brand: 'Ray-Ban',
        model: 'RB5154',
        price: 180,
        category: 'designer'
      },
      lenses: {
        type: 'progressive',
        material: 'polycarbonate'
      }
    });
  };

  const handleAddContacts = () => {
    updateContacts({
      brand: 'Acuvue',
      type: 'daily',
      parameters: {
        rightEye: { power: -2.50 },
        leftEye: { power: -2.25 }
      }
    });
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Demo Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-brand-purple mb-2">
            Live Pricing Sidebar Demo
          </h1>
          <p className="text-neutral-600">
            Phase 1.4 - Real-time Zustand store integration with validation
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Demo Controls */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Reset Button */}
            <Card>
              <CardHeader>
                <CardTitle>Quote Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  variant="outline" 
                  onClick={resetQuote}
                  className="w-full"
                >
                  Reset Quote
                </Button>
              </CardContent>
            </Card>

            {/* Exam Services */}
            <Card>
              <CardHeader>
                <CardTitle>Exam Services</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {examServices.map((service) => {
                    const isSelected = quote.exam.selectedServices.includes(service.id);
                    return (
                      <Button
                        key={service.id}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className={isSelected ? "bg-brand-purple" : ""}
                        onClick={() => 
                          isSelected 
                            ? handleRemoveExamService(service.id)
                            : handleAddExamService(service.id)
                        }
                      >
                        {isSelected ? '✓ ' : '+ '}{service.name}
                      </Button>
                    );
                  })}
                </div>
                <div className="text-sm text-neutral-600">
                  Selected: {quote.exam.selectedServices.length} services
                </div>
              </CardContent>
            </Card>

            {/* Insurance */}
            <Card>
              <CardHeader>
                <CardTitle>Insurance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Button
                    variant={quote.insurance.carrier === 'VSP' ? "default" : "outline"}
                    size="sm"
                    className={quote.insurance.carrier === 'VSP' ? "bg-brand-purple" : ""}
                    onClick={() => handleSetInsurance('VSP')}
                  >
                    VSP
                  </Button>
                  <Button
                    variant={quote.insurance.carrier === 'EyeMed' ? "default" : "outline"}
                    size="sm"
                    className={quote.insurance.carrier === 'EyeMed' ? "bg-brand-purple" : ""}
                    onClick={() => handleSetInsurance('EyeMed')}
                  >
                    EyeMed
                  </Button>
                  <Button
                    variant={!quote.insurance.carrier ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSetInsurance('')}
                  >
                    None
                  </Button>
                </div>
                <div className="text-sm text-neutral-600">
                  Current: {quote.insurance.carrier || 'No insurance'}
                </div>
              </CardContent>
            </Card>

            {/* Products */}
            <Card>
              <CardHeader>
                <CardTitle>Products</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Button
                    variant={quote.eyeglasses.frame ? "default" : "outline"}
                    size="sm"
                    className={quote.eyeglasses.frame ? "bg-brand-purple" : ""}
                    onClick={handleAddEyeglasses}
                  >
                    {quote.eyeglasses.frame ? '✓ Eyeglasses Added' : '+ Add Eyeglasses'}
                  </Button>
                  <Button
                    variant={quote.contacts.brand ? "default" : "outline"}
                    size="sm"
                    className={quote.contacts.brand ? "bg-brand-purple" : ""}
                    onClick={handleAddContacts}
                  >
                    {quote.contacts.brand ? '✓ Contacts Added' : '+ Add Contacts'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Current Store State */}
            <Card>
              <CardHeader>
                <CardTitle>Store State (Debug)</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-neutral-100 p-3 rounded overflow-auto max-h-64">
                  {JSON.stringify({
                    examServices: quote.exam.selectedServices,
                    insurance: quote.insurance.carrier,
                    eyeglasses: quote.eyeglasses.frame?.brand,
                    contacts: quote.contacts.brand
                  }, null, 2)}
                </pre>
              </CardContent>
            </Card>

          </div>

          {/* Live Pricing Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <PricingSidebar 
                customerName={customerName}
                onGenerateQuote={() => alert('Generate Quote clicked!')}
                onProceedToCheckout={() => alert('Proceed to Checkout clicked!')}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default PricingSidebarDemo;