'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Eye,
  Zap,
  Shield,
  Star,
  Check,
  Info,
  ArrowRight
} from 'lucide-react';
import { useQuoteStore } from '@/store/quote-store';

interface LensType {
  id: string;
  name: string;
  description: string;
  price: number;
  benefits: string[];
  bestFor: string[];
  icon: React.ComponentType<{ className?: string }>;
  popular?: boolean;
}

interface LensMaterial {
  id: string;
  name: string;
  description: string;
  priceMultiplier: number; // Multiplier for base lens price
  benefits: string[];
  thickness: 'thin' | 'medium' | 'thick';
  weight: 'light' | 'medium' | 'heavy';
  impact: 'standard' | 'high' | 'highest';
  icon: React.ComponentType<{ className?: string }>;
  recommended?: boolean;
}

const lensTypes: LensType[] = [
  {
    id: 'single-vision',
    name: 'Single Vision',
    description: 'Clear vision at one distance - either near or far',
    price: 99.00,
    benefits: [
      'Most affordable option',
      'Widest field of vision',
      'Quick adaptation',
      'Minimal distortion'
    ],
    bestFor: [
      'Reading only',
      'Distance only',
      'Computer work',
      'First-time wearers'
    ],
    icon: Eye,
    popular: true
  },
  {
    id: 'progressive',
    name: 'Progressive (No-line)',
    description: 'Seamless vision at all distances without visible lines',
    price: 299.00,
    benefits: [
      'Natural vision transition',
      'No visible lines',
      'All distances covered',
      'Cosmetically appealing'
    ],
    bestFor: [
      'Presbyopia correction',
      'Active lifestyles',
      'Professional appearance',
      'Computer and reading'
    ],
    icon: Zap,
    popular: true
  },
  {
    id: 'bifocal',
    name: 'Bifocal',
    description: 'Two distinct vision zones for distance and near',
    price: 179.00,
    benefits: [
      'Clear distance vision',
      'Clear near vision',
      'Cost-effective',
      'Easy to adapt'
    ],
    bestFor: [
      'Presbyopia correction',
      'Budget-conscious patients',
      'Simple vision needs',
      'Reading and distance'
    ],
    icon: Eye
  },
  {
    id: 'computer',
    name: 'Computer/Office',
    description: 'Optimized for intermediate and near distances',
    price: 189.00,
    benefits: [
      'Reduced eye strain',
      'Enhanced computer focus',
      'Improved posture',
      'Blue light filtering'
    ],
    bestFor: [
      'Office workers',
      'Computer users',
      'Reduced neck strain',
      'Extended screen time'
    ],
    icon: Shield
  }
];

const lensMaterials: LensMaterial[] = [
  {
    id: 'plastic',
    name: 'Standard Plastic (CR-39)',
    description: 'Basic plastic material with good optical clarity',
    priceMultiplier: 1.0,
    benefits: [
      'Most affordable',
      'Good optical quality',
      'Easy to tint',
      'Scratch resistant coating available'
    ],
    thickness: 'thick',
    weight: 'heavy',
    impact: 'standard',
    icon: Eye
  },
  {
    id: 'polycarbonate',
    name: 'Polycarbonate',
    description: 'Impact-resistant plastic ideal for active lifestyles',
    priceMultiplier: 1.5,
    benefits: [
      '10x more impact resistant',
      'Built-in UV protection',
      'Lightweight',
      'Thinner than plastic'
    ],
    thickness: 'medium',
    weight: 'light',
    impact: 'highest',
    icon: Shield,
    recommended: true
  },
  {
    id: 'trivex',
    name: 'Trivex',
    description: 'Premium material combining clarity and impact resistance',
    priceMultiplier: 1.8,
    benefits: [
      'Superior optical clarity',
      'Impact resistant',
      'Lightweight',
      'UV protection'
    ],
    thickness: 'medium',
    weight: 'light',
    impact: 'highest',
    icon: Star
  },
  {
    id: 'high-index',
    name: 'High-Index 1.67',
    description: 'Ultra-thin material for strong prescriptions',
    priceMultiplier: 2.2,
    benefits: [
      'Thinnest possible',
      'Lightweight',
      'Better appearance',
      'UV protection'
    ],
    thickness: 'thin',
    weight: 'light',
    impact: 'high',
    icon: Zap
  }
];

interface LensSelectionProps {
  className?: string;
}

export function LensSelection({ className }: LensSelectionProps) {
  const { quote, updateEyeglasses } = useQuoteStore();
  const [activeTab, setActiveTab] = useState('type');
  
  const selectedLensType = quote.eyeglasses.lenses.type;
  const selectedMaterial = quote.eyeglasses.lenses.material;

  const handleLensTypeSelect = (lensType: LensType) => {
    updateEyeglasses({
      lenses: {
        ...quote.eyeglasses.lenses,
        type: lensType.id as 'single-vision' | 'progressive' | 'bifocal' | 'computer' | ''
      }
    });
  };

  const handleMaterialSelect = (material: LensMaterial) => {
    updateEyeglasses({
      lenses: {
        ...quote.eyeglasses.lenses,
        material: material.id as 'plastic' | 'polycarbonate' | 'high-index' | 'trivex' | ''
      }
    });
  };

  const getSelectedLensPrice = () => {
    const lensType = lensTypes.find(l => l.id === selectedLensType);
    const material = lensMaterials.find(m => m.id === selectedMaterial);
    
    if (!lensType || !material) return 0;
    
    return lensType.price * material.priceMultiplier;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const getThicknessIcon = (thickness: string) => {
    switch (thickness) {
      case 'thin': return '▬';
      case 'medium': return '▬▬';
      case 'thick': return '▬▬▬';
      default: return '▬';
    }
  };

  const getWeightIcon = (weight: string) => {
    switch (weight) {
      case 'light': return '🪶';
      case 'medium': return '⚖️';
      case 'heavy': return '🔸';
      default: return '⚖️';
    }
  };

  const renderLensTypeCard = (lensType: LensType) => {
    const isSelected = selectedLensType === lensType.id;
    const Icon = lensType.icon;
    
    return (
      <Card 
        key={lensType.id}
        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
          isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
        }`}
        onClick={() => handleLensTypeSelect(lensType)}
      >
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">{lensType.name}</h3>
                {lensType.popular && (
                  <Badge variant="secondary" className="text-xs mt-1">Most Popular</Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-lg">{formatPrice(lensType.price)}</div>
              <div className="text-xs text-muted-foreground">starting at</div>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-4">{lensType.description}</p>

          {/* Benefits */}
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium mb-2">Benefits:</h4>
              <ul className="space-y-1">
                {lensType.benefits.map((benefit, index) => (
                  <li key={index} className="text-xs flex items-center space-x-2">
                    <Check className="h-3 w-3 text-green-600" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Best for:</h4>
              <div className="flex flex-wrap gap-1">
                {lensType.bestFor.map((use, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {use}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Selection Button */}
          <div className="mt-4 pt-4 border-t">
            <Button 
              variant={isSelected ? "default" : "outline"} 
              size="sm" 
              className="w-full"
            >
              {isSelected ? 'Selected' : 'Select This Type'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderMaterialCard = (material: LensMaterial) => {
    const isSelected = selectedMaterial === material.id;
    const Icon = material.icon;
    const basePrice = lensTypes.find(l => l.id === selectedLensType)?.price || 0;
    const totalPrice = basePrice * material.priceMultiplier;
    
    return (
      <Card 
        key={material.id}
        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
          isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
        }`}
        onClick={() => handleMaterialSelect(material)}
      >
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{material.name}</h3>
                {material.recommended && (
                  <Badge variant="secondary" className="text-xs mt-1">Recommended</Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">{formatPrice(totalPrice)}</div>
              <div className="text-xs text-muted-foreground">
                {material.priceMultiplier}x multiplier
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground mb-4">{material.description}</p>

          {/* Properties */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <div className="text-lg mb-1">{getThicknessIcon(material.thickness)}</div>
              <div className="text-xs font-medium">Thickness</div>
              <div className="text-xs text-muted-foreground capitalize">{material.thickness}</div>
            </div>
            <div className="text-center">
              <div className="text-lg mb-1">{getWeightIcon(material.weight)}</div>
              <div className="text-xs font-medium">Weight</div>
              <div className="text-xs text-muted-foreground capitalize">{material.weight}</div>
            </div>
            <div className="text-center">
              <div className="text-lg mb-1">🛡️</div>
              <div className="text-xs font-medium">Impact</div>
              <div className="text-xs text-muted-foreground capitalize">{material.impact}</div>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Key Benefits:</h4>
            <ul className="space-y-1">
              {material.benefits.slice(0, 3).map((benefit, index) => (
                <li key={index} className="text-xs flex items-center space-x-2">
                  <Check className="h-3 w-3 text-green-600" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Selection Button */}
          <div className="mt-4 pt-4 border-t">
            <Button 
              variant={isSelected ? "default" : "outline"} 
              size="sm" 
              className="w-full"
            >
              {isSelected ? 'Selected' : 'Select Material'}
            </Button>
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
          <Eye className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Lens Selection</h2>
          <p className="text-sm text-muted-foreground">
            Choose lens type and material for optimal vision
          </p>
        </div>
      </div>

      {/* Selection Summary */}
      {(selectedLensType || selectedMaterial) && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Check className="h-5 w-5 text-green-600" />
                <div>
                  <h4 className="font-medium text-green-900">Lens Configuration</h4>
                  <p className="text-sm text-green-700">
                    {selectedLensType && lensTypes.find(l => l.id === selectedLensType)?.name}
                    {selectedLensType && selectedMaterial && ' • '}
                    {selectedMaterial && lensMaterials.find(m => m.id === selectedMaterial)?.name}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-green-900">
                  {formatPrice(getSelectedLensPrice())}
                </div>
                <div className="text-xs text-green-600">Total lens cost</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lens Selection Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="type" className="flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span>Lens Type</span>
            {selectedLensType && <Check className="h-3 w-3 text-green-600" />}
          </TabsTrigger>
          <TabsTrigger value="material" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Material</span>
            {selectedMaterial && <Check className="h-3 w-3 text-green-600" />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="type" className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Choose Your Lens Type</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select the lens type that best matches your vision needs and lifestyle.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {lensTypes.map(renderLensTypeCard)}
          </div>

          {selectedLensType && (
            <div className="flex justify-center">
              <Button onClick={() => setActiveTab('material')} className="flex items-center space-x-2">
                <span>Continue to Material Selection</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="material" className="space-y-6">
          {!selectedLensType ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Please select a lens type first to choose the appropriate material.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-2">Choose Your Lens Material</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select the material that provides the best combination of durability, 
                  weight, and thickness for your prescription.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {lensMaterials.map(renderMaterialCard)}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Material Recommendation */}
      {selectedLensType && !selectedMaterial && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Recommendation:</strong> For most patients, we recommend polycarbonate 
            material for its excellent impact resistance and built-in UV protection, 
            especially for active lifestyles or children.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}