'use client';

import React from 'react';
import { 
  User, 
  Eye, 
  Glasses, 
  CheckCircle,
  Lock,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Master Plan Design System - Left Navigation Panel
// 160px fixed width, vertical step navigation

export type QuoteLayer = 'customer' | 'exam-services' | 'eyeglasses' | 'contacts' | 'review' | 'finalize';

export type LayerStatus = 'locked' | 'available' | 'current' | 'complete';

export interface LayerStep {
  id: QuoteLayer;
  title: string;
  description: string;
  icon: LucideIcon;
  status: LayerStatus;
}

export interface QuoteNavPanelProps {
  currentLayer: QuoteLayer;
  onLayerChange: (layer: QuoteLayer) => void;
  getLayerStatus: (layer: QuoteLayer) => LayerStatus;
}

export function QuoteNavPanel({ 
  onLayerChange, 
  getLayerStatus 
}: QuoteNavPanelProps) {
  
  const steps: LayerStep[] = [
    {
      id: 'customer',
      title: 'Customer',
      description: 'Select customer',
      icon: User,
      status: getLayerStatus('customer')
    },
    {
      id: 'exam-services',
      title: 'Exam',
      description: 'Eye exam services',
      icon: Eye,
      status: getLayerStatus('exam-services')
    },
    {
      id: 'eyeglasses',
      title: 'Eyeglasses',
      description: 'Frames & lenses',
      icon: Glasses,
      status: getLayerStatus('eyeglasses')
    },
    {
      id: 'contacts',
      title: 'Contacts',
      description: 'Contact lenses',
      icon: Eye,
      status: getLayerStatus('contacts')
    },
    {
      id: 'review',
      title: 'Review',
      description: 'Review quote',
      icon: CheckCircle,
      status: getLayerStatus('review')
    },
    {
      id: 'finalize',
      title: 'Finalize',
      description: 'Complete quote',
      icon: CheckCircle,
      status: getLayerStatus('finalize')
    }
  ];

  const getStepClasses = (step: LayerStep) => {
    const baseClasses = "p-3 rounded-lg border transition-all duration-200 relative group";
    
    switch (step.status) {
      case 'locked':
        return cn(baseClasses, 
          'bg-neutral-50 border-neutral-200 cursor-not-allowed opacity-60 text-neutral-400'
        );
      case 'complete':
        return cn(baseClasses,
          'bg-emerald-50 border-emerald-200 cursor-pointer hover:bg-emerald-100',
          'text-emerald-700'
        );
      case 'current':
        return cn(baseClasses,
          'bg-blue-600 border-blue-600 cursor-pointer text-white',
          'shadow-md'
        );
      case 'available':
      default:
        return cn(baseClasses,
          'bg-white border-neutral-200 cursor-pointer hover:border-blue-300 hover:bg-blue-50',
          'text-neutral-900'
        );
    }
  };

  const getStatusIcon = (step: LayerStep) => {
    const IconComponent = step.icon;
    const iconClasses = "h-4 w-4 flex-shrink-0";
    
    switch (step.status) {
      case 'locked':
        return <Lock className={cn(iconClasses, "text-neutral-400")} />;
      case 'complete':
        return <CheckCircle className={cn(iconClasses, "text-emerald-600")} />;
      case 'current':
        return <IconComponent className={cn(iconClasses, "text-white")} />;
      default:
        return <IconComponent className={cn(iconClasses, "text-neutral-600 group-hover:text-blue-600")} />;
    }
  };

  const handleStepClick = (step: LayerStep) => {
    if (step.status === 'locked') return;
    onLayerChange(step.id);
  };

  return (
    <div className="nav-panel bg-neutral-50 border-r border-neutral-200 p-4 space-y-3">
      
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-neutral-700 text-center">QUOTE STEPS</h2>
      </div>
      
      {/* Step Navigation */}
      <div className="space-y-2">
        {steps.map((step) => (
          <div
            key={step.id}
            className={getStepClasses(step)}
            onClick={() => handleStepClick(step)}
          >
            {/* Step Content */}
            <div className="flex items-center space-x-3">
              {getStatusIcon(step)}
              <div className="flex-1 min-w-0">
                <div className={cn(
                  "font-medium text-sm transition-colors duration-200",
                  step.status === 'current' ? 'text-white' :
                  step.status === 'complete' ? 'text-emerald-700' :
                  step.status === 'locked' ? 'text-neutral-400' :
                  'text-neutral-900 group-hover:text-blue-700'
                )}>
                  {step.title}
                </div>
                <div className={cn(
                  "text-xs transition-colors duration-200",
                  step.status === 'current' ? 'text-white/80' :
                  step.status === 'complete' ? 'text-emerald-600' :
                  step.status === 'locked' ? 'text-neutral-400' :
                  'text-neutral-500 group-hover:text-blue-600'
                )}>
                  {step.description}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Simplified Progress Summary */}
      <div className="mt-4 pt-4 border-t border-neutral-200">
        <div className="text-center">
          <div className="flex items-center space-x-1 mb-2">
            {steps.map((step) => (
              <div
                key={step.id}
                className={cn(
                  "flex-1 h-2 rounded-full transition-all duration-300",
                  step.status === 'complete' ? 'bg-emerald-500' :
                  step.status === 'current' ? 'bg-blue-600' :
                  'bg-neutral-200'
                )}
              />
            ))}
          </div>
          <div className="text-xs text-neutral-600">
            {steps.filter(s => s.status === 'complete').length} of {steps.length} complete
          </div>
        </div>
      </div>
      
    </div>
  );
}

export default QuoteNavPanel;