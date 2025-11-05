'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield,
  Sun,
  Eye,
  Sparkles,
  Check,
  Info,
  Star
} from 'lucide-react';
import { useQuoteStore } from '@/store/quote-store';

interface Enhancement {
  id: string;
  name: string;
  description: string;
  price: number;
  benefits: string[];
  bestFor: string[];
  icon: React.ComponentType<{ className?: string }>;
  category: 'coating' | 'protection' | 'comfort';
  recommended?: boolean;
  popular?: boolean;
  requiredWith?: string[]; // Other enhancements this requires
  incompatibleWith?: string[]; // Enhancements this conflicts with
}

const lensEnhancements: Enhancement[] = [
  {
    id: 'anti-reflective',
    name: 'Anti-Reflective Coating',
    description: 'Reduces glare and reflections for clearer vision',
    price: 89.00,
    benefits: [
      'Eliminates glare from screens',
      'Reduces nighttime driving glare',
      'Clearer vision in bright light',
      'Better appearance (less reflections)',
      'Easier to clean lenses'
    ],
    bestFor: [
      'Computer users',
      'Night driving',
      'Professional appearance',
      'Fluorescent lighting'
    ],
    icon: Sparkles,
    category: 'coating',
    recommended: true,
    popular: true
  },
  {
    id: 'photochromic',
    name: 'Photochromic (Transitions)',
    description: 'Lenses that automatically darken in sunlight',
    price: 129.00,
    benefits: [
      'Automatic light adjustment',
      'UV protection indoors and out',
      'Convenience of 2-in-1 glasses',
      'No need for separate sunglasses',
      'Comfortable in changing light'
    ],
    bestFor: [
      'Frequent outdoor activity',
      'Light sensitivity',
      'Convenience seekers',
      'UV protection'
    ],
    icon: Sun,
    category: 'protection',
    popular: true
  },
  {
    id: 'polarized',
    name: 'Polarized Lenses',
    description: 'Eliminates glare from reflective surfaces',
    price: 159.00,
    benefits: [
      'Eliminates water/road glare',
      'Enhanced color contrast',
      'Reduced eye strain outdoors',
      'Better visibility in bright sun',
      'Safer driving experience'
    ],
    bestFor: [
      'Driving',
      'Water sports',
      'Golf/outdoor sports',
      'Beach activities'
    ],
    icon: Shield,
    category: 'protection',
    incompatibleWith: ['photochromic'] // Can't combine with transitions
  },
  {
    id: 'blue-light',
    name: 'Blue Light Filtering',
    description: 'Filters harmful blue light from digital screens',
    price: 69.00,
    benefits: [
      'Reduces digital eye strain',
      'Better sleep quality',
      'Less eye fatigue',
      'Improved focus',
      'Retinal protection'
    ],
    bestFor: [
      'Heavy computer use',
      'Gaming',
      'Late night screen time',
      'Eye strain symptoms'
    ],
    icon: Eye,
    category: 'comfort',
    recommended: true
  },
  {
    id: 'scratch-resistant',
    name: 'Scratch-Resistant Coating',
    description: 'Protects lenses from everyday wear and damage',
    price: 39.00,
    benefits: [
      'Extends lens lifespan',
      'Maintains clear vision',
      'Reduces replacement costs',
      'Daily wear protection',
      'Easy maintenance'
    ],
    bestFor: [
      'Active lifestyles',
      'Children',
      'Job site workers',
      'Budget protection'
    ],
    icon: Shield,
    category: 'protection'
  },
  {
    id: 'premium-ar',
    name: 'Premium Anti-Reflective',
    description: 'Advanced multi-layer coating with superior performance',
    price: 149.00,
    benefits: [
      'Superior glare elimination',
      'Hydrophobic/oleophobic',
      'Easier cleaning',
      'Longer lasting',
      '2-year warranty'
    ],
    bestFor: [
      'Demanding users',
      'Professional settings',
      'Maximum performance',
      'Long-term value'
    ],
    icon: Star,
    category: 'coating',
    incompatibleWith: ['anti-reflective'] // Upgrades basic AR
  }
];

interface LensEnhancementsProps {
  className?: string;
}

export function LensEnhancements({ className }: LensEnhancementsProps) {
  const { quote, updateEyeglasses } = useQuoteStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const selectedEnhancements = quote.eyeglasses.enhancements || [];

  const handleEnhancementToggle = (enhancementId: string, isChecked: boolean) => {
    const enhancement = lensEnhancements.find(e => e.id === enhancementId);
    if (!enhancement) return;

    let newEnhancements = [...selectedEnhancements];

    if (isChecked) {
      // Add enhancement
      newEnhancements.push(enhancementId);

      // Handle incompatibilities
      if (enhancement.incompatibleWith) {
        newEnhancements = newEnhancements.filter(id => 
          !enhancement.incompatibleWith!.includes(id)
        );
      }

      // Handle requirements
      if (enhancement.requiredWith) {
        enhancement.requiredWith.forEach(requiredId => {
          if (!newEnhancements.includes(requiredId)) {
            newEnhancements.push(requiredId);
          }
        });
      }
    } else {
      // Remove enhancement
      newEnhancements = newEnhancements.filter(id => id !== enhancementId);

      // Remove any enhancements that require this one
      const dependentEnhancements = lensEnhancements.filter(e => 
        e.requiredWith?.includes(enhancementId)
      );
      dependentEnhancements.forEach(dep => {
        newEnhancements = newEnhancements.filter(id => id !== dep.id);
      });
    }

    updateEyeglasses({
      enhancements: newEnhancements
    });
  };

  const isEnhancementSelected = (enhancementId: string) => {
    return selectedEnhancements.includes(enhancementId);
  };

  const isEnhancementDisabled = (enhancement: Enhancement) => {
    // Check if any selected enhancement is incompatible
    return selectedEnhancements.some(selectedId => {
      const selectedEnhancement = lensEnhancements.find(e => e.id === selectedId);
      return selectedEnhancement?.incompatibleWith?.includes(enhancement.id);
    });
  };

  const getFilteredEnhancements = () => {
    if (selectedCategory === 'all') return lensEnhancements;
    return lensEnhancements.filter(e => e.category === selectedCategory);
  };

  const getTotalEnhancementPrice = () => {
    return selectedEnhancements.reduce((total, enhancementId) => {
      const enhancement = lensEnhancements.find(e => e.id === enhancementId);
      return total + (enhancement?.price || 0);
    }, 0);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const renderEnhancementCard = (enhancement: Enhancement) => {
    const isSelected = isEnhancementSelected(enhancement.id);
    const isDisabled = isEnhancementDisabled(enhancement);
    const Icon = enhancement.icon;
    
    return (
      <Card 
        key={enhancement.id}
        className={`transition-all duration-200 ${
          isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
        } ${isDisabled ? 'opacity-50' : 'hover:shadow-md cursor-pointer'}`}
      >
        <CardContent className="p-6">
          {/* Header with checkbox */}
          <div className="flex items-start space-x-4 mb-4">
            <Checkbox
              id={enhancement.id}
              checked={isSelected}
              disabled={isDisabled}
              onCheckedChange={(checked) => 
                handleEnhancementToggle(enhancement.id, checked as boolean)
              }
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    isSelected ? 'bg-primary text-white' : 'bg-gray-100'
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{enhancement.name}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      {enhancement.recommended && (
                        <Badge variant="secondary" className="text-xs">Recommended</Badge>
                      )}
                      {enhancement.popular && (
                        <Badge variant="outline" className="text-xs">Popular</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatPrice(enhancement.price)}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {enhancement.category}
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground mb-3">
                {enhancement.description}
              </p>

              {/* Benefits - show top 3 */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium">Key Benefits:</h4>
                <ul className="space-y-1">
                  {enhancement.benefits.slice(0, 3).map((benefit, index) => (
                    <li key={index} className="text-xs flex items-center space-x-2">
                      <Check className="h-3 w-3 text-green-600" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Best for tags */}
              <div className="mt-3">
                <h4 className="text-xs font-medium mb-2">Best for:</h4>
                <div className="flex flex-wrap gap-1">
                  {enhancement.bestFor.slice(0, 3).map((use, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {use}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Compatibility warnings */}
              {isDisabled && (
                <Alert className="mt-3 border-yellow-200 bg-yellow-50">
                  <Info className="h-3 w-3 text-yellow-600" />
                  <AlertDescription className="text-xs text-yellow-800">
                    Not compatible with current selections
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Lens Enhancements</h2>
          <p className="text-sm text-muted-foreground">
            Add protective coatings and features to optimize your lenses
          </p>
        </div>
      </div>

      {/* Selection Summary */}
      {selectedEnhancements.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Check className="h-5 w-5 text-green-600" />
                <div>
                  <h4 className="font-medium text-green-900">
                    {selectedEnhancements.length} Enhancement{selectedEnhancements.length !== 1 ? 's' : ''} Selected
                  </h4>
                  <p className="text-sm text-green-700">
                    {selectedEnhancements.map(id => {
                      const enhancement = lensEnhancements.find(e => e.id === id);
                      return enhancement?.name;
                    }).join(', ')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-green-900">
                  {formatPrice(getTotalEnhancementPrice())}
                </div>
                <div className="text-xs text-green-600">Total enhancements</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Filter */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium">Filter by category:</span>
        <div className="flex space-x-2">
          {[
            { id: 'all', label: 'All' },
            { id: 'coating', label: 'Coatings' },
            { id: 'protection', label: 'Protection' },
            { id: 'comfort', label: 'Comfort' }
          ].map(category => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Enhancement Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {getFilteredEnhancements().map(renderEnhancementCard)}
      </div>

      {/* Recommendations */}
      {selectedEnhancements.length === 0 && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Recommendation:</strong> Most patients benefit from anti-reflective coating 
            for reduced glare and clearer vision. If you use computers frequently, consider 
            adding blue light filtering for enhanced comfort.
          </AlertDescription>
        </Alert>
      )}

      {/* Popular packages */}
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="p-4">
          <h4 className="font-semibold text-purple-900 mb-2">Popular Packages</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-purple-800">Basic Protection</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  updateEyeglasses({
                    enhancements: ['anti-reflective', 'scratch-resistant']
                  });
                }}
              >
                AR + Scratch Resistant - {formatPrice(128.00)}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-purple-800">Computer User</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  updateEyeglasses({
                    enhancements: ['anti-reflective', 'blue-light', 'scratch-resistant']
                  });
                }}
              >
                AR + Blue Light + Scratch - {formatPrice(197.00)}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-purple-800">Premium Package</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  updateEyeglasses({
                    enhancements: ['premium-ar', 'photochromic', 'blue-light']
                  });
                }}
              >
                Premium AR + Transitions + Blue Light - {formatPrice(347.00)}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}