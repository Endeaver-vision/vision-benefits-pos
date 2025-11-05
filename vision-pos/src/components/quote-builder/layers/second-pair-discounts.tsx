'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Gift,
  Percent,
  Glasses,
  Info,
  Star,
  Eye,
  Sun
} from 'lucide-react';
import { useQuoteStore } from '@/store/quote-store';
import { FrameSelection as FrameSelectionType } from '@/types/quote-builder';

interface SecondPairOffer {
  id: string;
  name: string;
  description: string;
  discountPercent: number;
  minPurchase?: number;
  restrictions?: string[];
  validUntil?: Date;
  popular?: boolean;
}

const secondPairOffers: SecondPairOffer[] = [
  {
    id: 'standard-50',
    name: '50% Off Second Pair',
    description: 'Get 50% off your second complete pair of eyeglasses',
    discountPercent: 50,
    restrictions: [
      'Equal or lesser value',
      'Same prescription required',
      'Cannot combine with other offers'
    ],
    popular: true
  },
  {
    id: 'progressive-40',
    name: '40% Off Progressive Upgrade',
    description: 'Upgrade your second pair to progressive lenses with 40% off',
    discountPercent: 40,
    restrictions: [
      'Progressive lenses only',
      'Valid for presbyopia prescriptions',
      'Minimum frame purchase required'
    ]
  },
  {
    id: 'sunglasses-60',
    name: '60% Off Prescription Sunglasses',
    description: 'Perfect for outdoor activities with UV protection',
    discountPercent: 60,
    minPurchase: 200,
    restrictions: [
      'Prescription sunglasses only',
      'Polarized lenses included',
      'Same prescription as primary pair'
    ],
    validUntil: new Date('2024-12-31')
  },
  {
    id: 'computer-30',
    name: '30% Off Computer Glasses',
    description: 'Blue light filtering for digital eye strain relief',
    discountPercent: 30,
    restrictions: [
      'Computer lenses only',
      'Blue light coating included',
      'Office/computer frame styles'
    ]
  }
];

// Mock frame data for second pair
const secondPairFrames = [
  {
    id: 'sp-frame-1',
    brand: 'Ray-Ban',
    model: 'Aviator Classic',
    color: 'Gold/Green',
    price: 189.00,
    category: 'premium' as const,
    style: 'rimless' as const,
    material: 'metal' as const,
    selectedColor: 'Gold',
    selectedSize: 'Medium',
    isPatientOwned: false
  },
  {
    id: 'sp-frame-2',
    brand: 'Oakley',
    model: 'Computer Pro',
    color: 'Black/Blue Light',
    price: 159.00,
    category: 'designer' as const,
    style: 'full-rim' as const,
    material: 'plastic' as const,
    selectedColor: 'Black',
    selectedSize: 'Large',
    isPatientOwned: false
  },
  {
    id: 'sp-frame-3',
    brand: 'Warby Parker',
    model: 'Reader Classic',
    color: 'Tortoise',
    price: 129.00,
    category: 'value' as const,
    style: 'full-rim' as const,
    material: 'plastic' as const,
    selectedColor: 'Tortoise',
    selectedSize: 'Medium',
    isPatientOwned: false
  }
];

interface SecondPairDiscountsProps {
  className?: string;
}

export function SecondPairDiscounts({ className }: SecondPairDiscountsProps) {
  const { quote, updateEyeglasses } = useQuoteStore();
  const [selectedOffer, setSelectedOffer] = useState<string>('');
  const [isSecondPairEnabled, setIsSecondPairEnabled] = useState(false);
  const [selectedSecondFrame, setSelectedSecondFrame] = useState<FrameSelectionType | null>(null);

  const handleOfferSelect = (offerId: string) => {
    setSelectedOffer(offerId);
    const offer = secondPairOffers.find(o => o.id === offerId);
    
    if (offer) {
      updateEyeglasses({
        secondPair: {
          frame: selectedSecondFrame,
          lenses: { ...quote.eyeglasses.lenses }, // Copy primary lens settings
          discount: offer.discountPercent
        }
      });
    }
  };

  const handleSecondFrameSelect = (frame: FrameSelectionType) => {
    setSelectedSecondFrame(frame);
    
    if (selectedOffer) {
      const offer = secondPairOffers.find(o => o.id === selectedOffer);
      updateEyeglasses({
        secondPair: {
          frame: frame,
          lenses: { ...quote.eyeglasses.lenses },
          discount: offer?.discountPercent || 0
        }
      });
    }
  };

  const calculateSecondPairSavings = () => {
    if (!selectedSecondFrame || !selectedOffer) return 0;
    
    const offer = secondPairOffers.find(o => o.id === selectedOffer);
    if (!offer) return 0;

    const framePrice = selectedSecondFrame.price || 0;
    const lensPrice = 299; // Mock lens price
    const totalPrice = framePrice + lensPrice;
    
    return totalPrice * (offer.discountPercent / 100);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const renderOfferCard = (offer: SecondPairOffer) => {
    const isSelected = selectedOffer === offer.id;
    
    return (
      <Card 
        key={offer.id}
        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
          isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
        }`}
        onClick={() => handleOfferSelect(offer.id)}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                <Percent className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">{offer.name}</h3>
                {offer.popular && (
                  <Badge variant="secondary" className="text-xs mt-1">Popular Choice</Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {offer.discountPercent}%
              </div>
              <div className="text-xs text-muted-foreground">savings</div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-4">{offer.description}</p>

          {offer.restrictions && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Offer Details:</h4>
              <ul className="space-y-1">
                {offer.restrictions.map((restriction, index) => (
                  <li key={index} className="text-xs flex items-center space-x-2">
                    <Info className="h-3 w-3 text-blue-600" />
                    <span>{restriction}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {offer.validUntil && (
            <div className="mt-3 text-xs text-orange-600">
              Valid until: {offer.validUntil.toLocaleDateString()}
            </div>
          )}

          <div className="mt-4 pt-4 border-t">
            <Button 
              variant={isSelected ? "default" : "outline"} 
              size="sm" 
              className="w-full"
            >
              {isSelected ? 'Selected' : 'Choose This Offer'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSecondFrameCard = (frame: FrameSelectionType) => {
    const isSelected = selectedSecondFrame?.id === frame.id;
    
    return (
      <Card 
        key={frame.id}
        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
          isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
        }`}
        onClick={() => handleSecondFrameSelect(frame)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-semibold text-sm">{frame.brand}</h4>
              <p className="text-xs text-muted-foreground">{frame.model}</p>
            </div>
            <div className="text-right">
              <div className="font-semibold">{formatPrice(frame.price || 0)}</div>
              <Badge variant="outline" className="text-xs mt-1 capitalize">
                {frame.category}
              </Badge>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
            <span className="capitalize">{frame.style}</span>
            <span className="capitalize">{frame.material}</span>
            <span>{frame.selectedColor}</span>
          </div>

          <div className="mt-3">
            <Button 
              variant={isSelected ? "default" : "outline"} 
              size="sm" 
              className="w-full"
            >
              {isSelected ? 'Selected' : 'Select Frame'}
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
          <Gift className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Second Pair Offers</h2>
          <p className="text-sm text-muted-foreground">
            Save on a second pair of glasses for different needs
          </p>
        </div>
      </div>

      {/* Enable Second Pair Toggle */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Label htmlFor="second-pair-toggle" className="text-base font-medium">
                Add Second Pair
              </Label>
              <p className="text-sm text-muted-foreground">
                Perfect for computer work, reading, or sunglasses
              </p>
            </div>
            <Switch
              id="second-pair-toggle"
              checked={isSecondPairEnabled}
              onCheckedChange={setIsSecondPairEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {isSecondPairEnabled && (
        <>
          {/* Offer Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Choose Your Discount</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {secondPairOffers.map(renderOfferCard)}
            </div>
          </div>

          {/* Frame Selection for Second Pair */}
          {selectedOffer && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Select Second Pair Frame</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {secondPairFrames.map(renderSecondFrameCard)}
              </div>
            </div>
          )}

          {/* Second Pair Summary */}
          {selectedSecondFrame && selectedOffer && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Glasses className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-green-900">Second Pair Added</h4>
                      <p className="text-sm text-green-700">
                        {selectedSecondFrame.brand} {selectedSecondFrame.model} • {selectedOffer}% off
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-900">
                      Save {formatPrice(calculateSecondPairSavings())}
                    </div>
                    <div className="text-xs text-green-600">
                      {secondPairOffers.find(o => o.id === selectedOffer)?.discountPercent}% discount applied
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Benefits Info */}
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Why a second pair?</strong> Having backup glasses ensures you&apos;re never without 
              vision correction. Specialized pairs for computer work, reading, or sunglasses 
              can improve comfort and protect your eyes in different environments.
            </AlertDescription>
          </Alert>

          {/* Popular Combinations */}
          <Card className="border-purple-200 bg-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-purple-900">
                <Star className="h-5 w-5" />
                <span>Popular Second Pair Ideas</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-3">
                <Eye className="h-4 w-4 text-purple-600" />
                <div>
                  <h5 className="font-medium text-purple-900">Computer Glasses</h5>
                  <p className="text-sm text-purple-700">Blue light filtering for office work</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Sun className="h-4 w-4 text-purple-600" />
                <div>
                  <h5 className="font-medium text-purple-900">Prescription Sunglasses</h5>
                  <p className="text-sm text-purple-700">UV protection for outdoor activities</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Glasses className="h-4 w-4 text-purple-600" />
                <div>
                  <h5 className="font-medium text-purple-900">Reading Glasses</h5>
                  <p className="text-sm text-purple-700">Specialized for close-up work</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}