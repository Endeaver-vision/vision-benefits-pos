'use client';

import React from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Master Plan Design System - Selection Card Component
// Based on VISION_POS_MASTER_PLAN.md Section 5 UI/UX Specifications

export interface SelectionCardProps {
  // Core identification
  id?: string;
  title: string;
  description?: string;
  
  // Pricing
  price?: number;
  priceLabel?: string; // e.g., "starting at", "per pair", etc.
  originalPrice?: number; // For showing discounts
  
  // Visual elements
  icon?: LucideIcon;
  image?: string;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  
  // Content sections
  benefits?: string[];
  features?: string[];
  tags?: string[]; // e.g., "Best for: Reading, Computer work"
  
  // Interactive state
  isSelected?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  
  // Actions
  onSelect?: () => void;
  onClick?: () => void;
  
  // Styling
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
  
  // Accessibility
  'aria-label'?: string;
}

export function SelectionCard({
  title,
  description,
  price,
  priceLabel = 'starting at',
  originalPrice,
  icon: Icon,
  image,
  badge,
  benefits = [],
  features = [],
  tags = [],
  isSelected = false,
  isDisabled = false,
  isLoading = false,
  onSelect,
  onClick,
  className,
  variant = 'default',
  'aria-label': ariaLabel,
}: SelectionCardProps) {
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const handleClick = () => {
    if (isDisabled || isLoading) return;
    
    if (onSelect) {
      onSelect();
    } else if (onClick) {
      onClick();
    }
  };

  const getCardClasses = () => {
    const baseClasses = cn(
      'cursor-pointer transition-all duration-200',
      'border shadow-brand-sm rounded-brand-md p-card',
      // Master Plan interactive states
      {
        // Default state
        'border-neutral-200 bg-white hover:border-brand-purple hover:bg-primary-purple-light': 
          !isSelected && !isDisabled,
        
        // Selected state - Master Plan purple accent
        'border-brand-purple bg-brand-purple text-white shadow-brand-md': isSelected,
        
        // Disabled state
        'border-neutral-200 bg-neutral-50 text-neutral-400 cursor-not-allowed': isDisabled,
        
        // Loading state
        'opacity-60 cursor-wait': isLoading,
      },
      className
    );
    
    return baseClasses;
  };

  const getContentSpacing = () => {
    switch (variant) {
      case 'compact':
        return 'space-y-2';
      case 'detailed':
        return 'space-y-4';
      default:
        return 'space-y-3';
    }
  };

  return (
    <Card 
      className={getCardClasses()}
      onClick={handleClick}
      aria-label={ariaLabel || `${isSelected ? 'Selected' : 'Select'} ${title}`}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <CardContent className={cn('p-0', getContentSpacing())}>
        
        {/* Header Section */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1">
            
            {/* Icon or Image */}
            {Icon && (
              <div className={cn(
                'p-2 rounded-lg flex-shrink-0',
                isSelected 
                  ? 'bg-white/20 text-white' 
                  : 'bg-neutral-50 text-brand-purple'
              )}>
                <Icon className="h-5 w-5" />
              </div>
            )}
            
            {image && (
              <div className="relative w-12 h-12 flex-shrink-0">
                <Image 
                  src={image} 
                  alt={title}
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
            )}
            
            {/* Title and Badge */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className={cn(
                  'font-semibold truncate heading-card',
                  isSelected ? 'text-white' : 'text-neutral-900'
                )}>
                  {title}
                </h3>
                
                {badge && (
                  <Badge 
                    variant={badge.variant || 'secondary'} 
                    className={cn(
                      'text-xs flex-shrink-0',
                      isSelected && 'bg-white/20 text-white border-white/30'
                    )}
                  >
                    {badge.text}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {/* Price Section */}
          {price !== undefined && (
            <div className="text-right flex-shrink-0 ml-3">
              <div className={cn(
                'font-semibold text-lg text-price-display',
                isSelected ? 'text-white' : 'text-price'
              )}>
                {formatPrice(price)}
              </div>
              
              {originalPrice && originalPrice > price && (
                <div className={cn(
                  'text-xs line-through',
                  isSelected ? 'text-white/70' : 'text-neutral-400'
                )}>
                  {formatPrice(originalPrice)}
                </div>
              )}
              
              {priceLabel && (
                <div className={cn(
                  'text-xs text-hint',
                  isSelected ? 'text-white/70' : 'text-neutral-600'
                )}>
                  {priceLabel}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Description */}
        {description && variant !== 'compact' && (
          <p className={cn(
            'text-sm',
            isSelected ? 'text-white/90' : 'text-neutral-600'
          )}>
            {description}
          </p>
        )}
        
        {/* Benefits Section */}
        {benefits.length > 0 && variant === 'detailed' && (
          <div>
            <h4 className={cn(
              'text-sm font-medium mb-2',
              isSelected ? 'text-white' : 'text-neutral-900'
            )}>
              Benefits:
            </h4>
            <ul className="space-y-1">
              {benefits.map((benefit, index) => (
                <li key={index} className="text-xs flex items-center space-x-2">
                  <Check className={cn(
                    'h-3 w-3 flex-shrink-0',
                    isSelected ? 'text-white' : 'text-success-green'
                  )} />
                  <span className={isSelected ? 'text-white/90' : 'text-neutral-700'}>
                    {benefit}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Features Section */}
        {features.length > 0 && variant === 'detailed' && (
          <div>
            <h4 className={cn(
              'text-sm font-medium mb-2',
              isSelected ? 'text-white' : 'text-neutral-900'
            )}>
              Features:
            </h4>
            <div className="flex flex-wrap gap-1">
              {features.map((feature, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className={cn(
                    'text-xs',
                    isSelected 
                      ? 'border-white/30 text-white bg-white/10' 
                      : 'border-neutral-200 text-neutral-700'
                  )}
                >
                  {feature}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Tags Section */}
        {tags.length > 0 && variant !== 'compact' && (
          <div>
            <h4 className={cn(
              'text-sm font-medium mb-2',
              isSelected ? 'text-white' : 'text-neutral-600'
            )}>
              Best for:
            </h4>
            <div className="flex flex-wrap gap-1">
              {tags.map((tag, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className={cn(
                    'text-xs',
                    isSelected 
                      ? 'border-white/30 text-white bg-white/10' 
                      : 'border-neutral-300 text-neutral-600'
                  )}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Selection Button - Master Plan Pattern */}
        {variant !== 'compact' && (
          <div className="pt-4 border-t border-opacity-20">
            <Button 
              variant={isSelected ? "secondary" : "outline"} 
              size="sm" 
              className={cn(
                'w-full button-label',
                isSelected && 'bg-white/20 text-white border-white/30 hover:bg-white/30'
              )}
              disabled={isDisabled || isLoading}
            >
              {isLoading ? 'Loading...' : (isSelected ? 'Selected' : 'Select')}
              {isSelected && <Check className="h-3 w-3 ml-2" />}
            </Button>
          </div>
        )}
        
      </CardContent>
    </Card>
  );
}

// Export default for easier importing
export default SelectionCard;