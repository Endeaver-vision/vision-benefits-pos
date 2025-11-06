'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  Eye, 
  Glasses, 
  AlertTriangle,
  AlertCircle,
  FileText,
  CreditCard,
  CheckCircle,
  Clock,
  Shield,
  RefreshCw,
  ShoppingCart
} from 'lucide-react';
import { useQuoteStore, useQuoteSelectors } from '@/store/quote-store';
import { cn } from '@/lib/utils';

// Master Plan Design System - Live Pricing Sidebar with Zustand Integration
// 280px fixed width, real-time pricing updates, validation warnings

export interface PricingSidebarProps {
  customerName?: string;
  onGenerateQuote?: () => void;
  onProceedToCheckout?: () => void;
}

export function PricingSidebar({ 
  customerName = '',
  onGenerateQuote,
  onProceedToCheckout
}: PricingSidebarProps) {
  
  // Zustand store integration
  const {
    quote,
    autoSave,
    getSelectedExamServices,
    getExamServicesPricing,
    saveQuote
  } = useQuoteStore();
  
  const {
    getTotalEyeglassesCost,
    getTotalContactsCost,
    isExamLayerComplete,
    getExamLayerValidation,
    needsSaving,
    lastSavedTime
  } = useQuoteSelectors();
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Get current layer pricing and validation
  const examPricing = getExamServicesPricing();
  const examValidation = getExamLayerValidation();
  const selectedExamServices = getSelectedExamServices();
  
  // Calculate totals
  const eyeglassesTotal = getTotalEyeglassesCost();
  const contactsTotal = getTotalContactsCost();

  // Build items list from store data
  const buildItemsList = () => {
    const items = [];
    
    // Exam services
    if (selectedExamServices.length > 0) {
      items.push({
        id: 'exam-services',
        name: 'Eye Examination',
        price: examPricing.subtotal,
        category: 'exam' as const,
        details: `${selectedExamServices.length} service${selectedExamServices.length > 1 ? 's' : ''}`
      });
    }
    
    // Eyeglasses
    if (quote.eyeglasses.frame || quote.eyeglasses.lenses.type) {
      items.push({
        id: 'eyeglasses',
        name: 'Eyeglasses',
        price: eyeglassesTotal,
        category: 'frame' as const,
        details: quote.eyeglasses.frame ? 
          `${quote.eyeglasses.frame.brand} ${quote.eyeglasses.frame.model}` : 
          'Frame and lenses'
      });
    }
    
    // Contact lenses
    if (quote.contacts.brand && quote.contacts.type) {
      items.push({
        id: 'contacts',
        name: 'Contact Lenses',
        price: contactsTotal,
        category: 'contact' as const,
        details: `${quote.contacts.brand} ${quote.contacts.type}`
      });
    }
    
    return items;
  };

  const items = buildItemsList();
  const hasItems = items.length > 0;
  
  // Get validation warnings
  const getValidationWarnings = () => {
    const warnings = [];
    
    // Exam layer warnings
    if (selectedExamServices.length > 0) {
      if (!examValidation.isValid) {
        warnings.push(...examValidation.errors.map(error => ({ type: 'error', message: error })));
      }
      warnings.push(...examValidation.warnings.map(warning => ({ type: 'warning', message: warning })));
    }
    
    // Insurance verification
    if (quote.insurance.carrier && !quote.insurance.memberId) {
      warnings.push({ 
        type: 'warning', 
        message: 'Insurance member ID missing - verification pending' 
      });
    }
    
    // Auto-save status
    if (needsSaving()) {
      warnings.push({ 
        type: 'info', 
        message: 'Quote has unsaved changes' 
      });
    }
    
    return warnings;
  };

  const validationWarnings = getValidationWarnings();

  const handleSaveQuote = async () => {
    try {
      await saveQuote();
    } catch (error) {
      console.error('Failed to save quote:', error);
    }
  };

  return (
    <div className="sidebar-panel bg-gradient-to-b from-white to-neutral-50/50 border-l border-neutral-200 p-6 space-y-6 overflow-y-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-brand-purple/10">
            <DollarSign className="h-5 w-5 text-brand-purple" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-brand-purple">Price Summary</h2>
            <p className="text-xs text-neutral-600">Live pricing updates</p>
          </div>
        </div>
        
        {/* Auto-save indicator */}
        <div className="flex items-center space-x-2 text-xs">
          {autoSave.enabled && (
            <div className={cn(
              "flex items-center space-x-1 px-2 py-1 rounded-full",
              needsSaving() ? 'bg-warning-amber/10 text-warning-amber' : 'bg-brand-teal/10 text-brand-teal'
            )}>
              {needsSaving() ? (
                <Clock className="h-3 w-3" />
              ) : (
                <CheckCircle className="h-3 w-3" />
              )}
              <span className="font-medium">
                {formatTime(lastSavedTime())}
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Customer Context */}
      {customerName && (
        <div className="p-3 bg-brand-purple/5 rounded-brand-md border border-brand-purple/20">
          <div className="text-sm text-neutral-600">Quote for:</div>
          <div className="font-medium text-brand-purple">{customerName}</div>
          {quote.insurance.carrier && (
            <div className="text-xs text-neutral-500 mt-1">
              {quote.insurance.carrier} Insurance
            </div>
          )}
        </div>
      )}
      
      {/* Selected Items */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="h-5 w-5 rounded-sm bg-gradient-to-br from-brand-purple to-brand-teal flex items-center justify-center">
            <ShoppingCart className="h-3 w-3 text-white" />
          </div>
          <div className="flex-1 flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wide">Selected Items</h3>
            {hasItems && (
              <div className="px-2 py-1 rounded-full bg-brand-purple/10 text-brand-purple text-xs font-bold">
                {items.length} item{items.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
        
        {!hasItems ? (
          <div className="text-center py-8 space-y-3">
            <div className="p-4 rounded-full bg-neutral-100 mx-auto w-fit">
              <Eye className="h-8 w-8 text-neutral-400" />
            </div>
            <p className="text-sm text-neutral-500 font-medium">No items selected</p>
            <p className="text-xs text-neutral-400">Start with an eye exam</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg border border-neutral-200 hover:border-neutral-300 hover:shadow-sm transition-all duration-200 overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className={cn(
                        "p-2 rounded-lg flex-shrink-0",
                        item.category === 'exam' && 'bg-blue-100',
                        item.category === 'frame' && 'bg-purple-100',
                        item.category === 'contact' && 'bg-teal-100'
                      )}>
                        {item.category === 'exam' && <Eye className="h-4 w-4 text-blue-600" />}
                        {item.category === 'frame' && <Glasses className="h-4 w-4 text-purple-600" />}
                        {item.category === 'contact' && <Eye className="h-4 w-4 text-teal-600" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold text-neutral-900 leading-snug">{item.name}</h4>
                        {item.details && (
                          <p className="text-xs text-neutral-600 mt-1 leading-relaxed truncate">{item.details}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-3 flex-shrink-0">
                      <span className="text-lg font-bold text-brand-purple">{formatPrice(item.price)}</span>
                    </div>
                  </div>
                  
                  {/* Insurance coverage indicator */}
                  {item.category === 'exam' && quote.insurance.carrier && examPricing.insuranceApplied > 0 && (
                    <div className="p-3 bg-gradient-to-r from-brand-teal/10 to-brand-teal/5 rounded-lg border border-brand-teal/20">
                      <div className="flex items-center space-x-2 text-brand-teal">
                        <Shield className="h-4 w-4" />
                        <span className="text-sm font-medium">Insurance Applied</span>
                        <span className="text-sm font-bold">-{formatPrice(examPricing.insuranceApplied)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Pricing Breakdown */}
      {hasItems && (
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="h-5 w-5 rounded-sm bg-gradient-to-br from-brand-purple to-brand-teal flex items-center justify-center">
              <DollarSign className="h-3 w-3 text-white" />
            </div>
            <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wide">Price Breakdown</h3>
          </div>
          
          <div className="bg-white rounded-lg border border-neutral-200 p-4 space-y-4">
            {/* Subtotal */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-neutral-600 font-medium">Subtotal</span>
              <span className="text-sm font-bold text-neutral-900">
                {formatPrice(items.reduce((sum, item) => sum + item.price, 0))}
              </span>
            </div>
            
            {/* Insurance coverage */}
            {quote.insurance.carrier && examPricing.insuranceApplied > 0 && (
              <div className="flex justify-between items-center p-3 bg-brand-teal/10 rounded-lg border border-brand-teal/20">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-brand-teal" />
                  <span className="text-sm font-medium text-brand-teal">Insurance Coverage</span>
                </div>
                <span className="text-sm font-bold text-brand-teal">
                  -{formatPrice(examPricing.insuranceApplied)}
                </span>
              </div>
            )}
            
            {/* Tax (if applicable) */}
            {quote.pricing.subtotal > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600 font-medium">Tax (8%)</span>
                <span className="text-sm font-bold text-neutral-900">
                  {formatPrice(quote.pricing.subtotal * 0.08)}
                </span>
              </div>
            )}
            
            <div className="border-t border-neutral-200 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-neutral-900">Patient Pays</span>
                <span className="text-xl font-bold text-brand-purple">
                  {formatPrice(examPricing.patientResponsibility || items.reduce((sum, item) => sum + item.price, 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Validation Warnings */}
      {validationWarnings.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="h-5 w-5 rounded-sm bg-gradient-to-br from-warning-amber to-error-red flex items-center justify-center">
              <AlertTriangle className="h-3 w-3 text-white" />
            </div>
            <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wide">Alerts</h3>
          </div>
          
          <div className="space-y-2">
            {validationWarnings.map((warning, index) => (
              <div 
                key={index}
                className={cn(
                  "flex items-start space-x-3 p-3 rounded-lg border transition-colors",
                  warning.type === 'error' && "bg-error-red/5 border-error-red/20 text-error-red",
                  warning.type === 'warning' && "bg-warning-amber/5 border-warning-amber/20 text-warning-amber",
                  warning.type === 'info' && "bg-brand-teal/5 border-brand-teal/20 text-brand-teal"
                )}
              >
                <div className={cn(
                  "p-1 rounded-md flex-shrink-0",
                  warning.type === 'error' && "bg-error-red/10",
                  warning.type === 'warning' && "bg-warning-amber/10",
                  warning.type === 'info' && "bg-brand-teal/10"
                )}>
                  {warning.type === 'error' && <AlertCircle className="h-3 w-3" />}
                  {warning.type === 'warning' && <AlertTriangle className="h-3 w-3" />}
                  {warning.type === 'info' && <CheckCircle className="h-3 w-3" />}
                </div>
                <span className="text-xs font-medium leading-relaxed">{warning.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="space-y-3">
        
        {/* Save Quote */}
        {needsSaving() && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full border-brand-purple/30 text-brand-purple hover:bg-brand-purple/5"
            onClick={handleSaveQuote}
            disabled={!hasItems}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        )}
        
        {/* Generate Quote */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full border-neutral-300 text-neutral-700 hover:bg-neutral-50"
          onClick={onGenerateQuote}
          disabled={!hasItems || !isExamLayerComplete()}
        >
          <FileText className="h-4 w-4 mr-2" />
          Generate Quote
        </Button>
        
        {/* Proceed to Checkout */}
        <Button 
          className="w-full bg-gradient-to-r from-brand-purple to-brand-teal hover:from-brand-purple/90 hover:to-brand-teal/90 text-white font-semibold py-3 shadow-lg"
          onClick={onProceedToCheckout}
          disabled={!hasItems || !isExamLayerComplete() || validationWarnings.some(w => w.type === 'error')}
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Proceed to Checkout
        </Button>
        
      </div>
      
      {/* Exam Duration Info */}
      {selectedExamServices.length > 0 && examValidation.totalDuration > 0 && (
        <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-neutral-200">
          <div className="flex items-center justify-center space-x-2 text-xs">
            <Clock className="h-3 w-3 text-brand-purple" />
            <span className="text-neutral-600 font-medium">
              Estimated appointment time: 
            </span>
            <span className="text-brand-purple font-bold">
              {examValidation.totalDuration} minutes
            </span>
          </div>
        </div>
      )}
      
      {/* Auto-save Status */}
      <div className="text-xs text-neutral-500 text-center">
        {autoSave.enabled ? (
          <div className="flex items-center justify-center space-x-1">
            <CheckCircle className="h-3 w-3" />
            <span>Auto-save enabled</span>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-1">
            <AlertTriangle className="h-3 w-3 text-warning-amber" />
            <span>Auto-save disabled</span>
          </div>
        )}
      </div>
      
    </div>
  );
}

export default PricingSidebar;