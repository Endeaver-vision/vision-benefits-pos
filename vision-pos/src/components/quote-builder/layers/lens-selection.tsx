'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SelectionCard } from '@/components/ui/selection-card';
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

  const renderLensTypeCard = (lensType: LensType) => {
    const isSelected = selectedLensType === lensType.id;
    
    return (
      <SelectionCard
        key={lensType.id}
        title={lensType.name}
        description={lensType.description}
        price={lensType.price}
        isSelected={isSelected}
        onClick={() => handleLensTypeSelect(lensType)}
        features={lensType.benefits}
        tags={lensType.bestFor}
        badge={lensType.popular ? { text: 'Most Popular', variant: 'secondary' } : undefined}
      />
    );
  };

  const renderMaterialCard = (material: LensMaterial) => {
    const isSelected = selectedMaterial === material.id;
    const basePrice = lensTypes.find(l => l.id === selectedLensType)?.price || 0;
    const totalPrice = basePrice * material.priceMultiplier;
    
    // Create features array combining properties and benefits
    const propertyFeatures = [
      `Thickness: ${material.thickness}`,
      `Weight: ${material.weight}`,
      `Impact: ${material.impact}`
    ];
    
    const allFeatures = [...propertyFeatures, ...material.benefits.slice(0, 3)];
    
    return (
      <SelectionCard
        key={material.id}
        title={material.name}
        description={material.description}
        price={totalPrice}
        priceLabel={`${material.priceMultiplier}x multiplier`}
        isSelected={isSelected}
        onClick={() => handleMaterialSelect(material)}
        features={allFeatures}
        badge={material.recommended ? { text: 'Recommended', variant: 'secondary' } : undefined}
      />
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-purple/10">
          <Eye className="h-5 w-5 text-brand-purple" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-brand-purple">Lens Selection</h2>
          <p className="text-sm text-muted-foreground">
            Choose lens type and material for optimal vision
          </p>
        </div>
      </div>

      {/* Selection Summary */}
      {(selectedLensType || selectedMaterial) && (
        <Card className="border-brand-teal/30 bg-brand-teal/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Check className="h-5 w-5 text-brand-teal" />
                <div>
                  <h4 className="font-medium text-brand-teal">Lens Configuration</h4>
                  <p className="text-sm text-brand-teal/80">
                    {selectedLensType && lensTypes.find(l => l.id === selectedLensType)?.name}
                    {selectedLensType && selectedMaterial && ' • '}
                    {selectedMaterial && lensMaterials.find(m => m.id === selectedMaterial)?.name}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-brand-teal">
                  {formatPrice(getSelectedLensPrice())}
                </div>
                <div className="text-xs text-brand-teal/70">Total lens cost</div>
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