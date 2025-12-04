'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  DollarSign,
  Percent,
  Glasses,
  AlertCircle,
  Clock,
  Calendar,
  Eye,
  Sun,
  Check,
  Minus,
  Plus
} from 'lucide-react';
import { useQuoteStore } from '@/store/quote-store';
import { useQuotePricingContext } from '@/contexts/quote-pricing-context';

interface SecondPairDiscountsProps {
  className?: string;
}

type DiscountType = 'same-day' | 'within-30-days' | 'none';

export function SecondPairDiscounts({ className }: SecondPairDiscountsProps) {
  const { quote, updateEyeglasses } = useQuoteStore();
  const { updateSecondPair } = useQuotePricingContext();

  const [isSecondPairEnabled, setIsSecondPairEnabled] = useState(false);
  const [discountType, setDiscountType] = useState<DiscountType>('same-day');

  // Second pair pricing inputs
  const [framePrice, setFramePrice] = useState<number>(0);
  const [lensPrice, setLensPrice] = useState<number>(0);
  const [coatingPrice, setCoatingPrice] = useState<number>(0);
  const [frameName, setFrameName] = useState<string>('');

  // Calculate discount percentage
  const discountPercent = discountType === 'same-day' ? 50 : discountType === 'within-30-days' ? 30 : 0;

  // Calculate totals
  const subtotal = framePrice + lensPrice + coatingPrice;
  const discountAmount = subtotal * (discountPercent / 100);
  const totalDue = subtotal - discountAmount;

  // Update the pricing context when values change
  useEffect(() => {
    if (isSecondPairEnabled && subtotal > 0) {
      updateSecondPair({
        enabled: true,
        frameName: frameName || 'Second Pair',
        framePrice,
        lensPrice,
        coatingPrice,
        discountType,
        discountPercent,
        subtotal,
        discountAmount,
        totalDue
      });
    } else {
      updateSecondPair({
        enabled: false,
        frameName: '',
        framePrice: 0,
        lensPrice: 0,
        coatingPrice: 0,
        discountType: 'none',
        discountPercent: 0,
        subtotal: 0,
        discountAmount: 0,
        totalDue: 0
      });
    }
  }, [isSecondPairEnabled, frameName, framePrice, lensPrice, coatingPrice, discountType]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  return (
    <div className={`space-y-6 ${className}`}>

      {/* Header with Cash Warning */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100">
            <DollarSign className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Second Pair (Cash Only)</h2>
            <p className="text-sm text-muted-foreground">
              Additional pair at discounted cash price
            </p>
          </div>
        </div>
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
          <DollarSign className="h-3 w-3 mr-1" />
          Cash Only
        </Badge>
      </div>

      {/* Important Notice */}
      <Alert className="border-amber-300 bg-amber-50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Important:</strong> Second pair purchases are <strong>cash only</strong> and not covered by insurance.
          Discount is at staff discretion based on timing of purchase.
        </AlertDescription>
      </Alert>

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
          {/* Discount Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base">
                <Percent className="h-5 w-5" />
                <span>Select Discount</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Same Day - 50% */}
              <div
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  discountType === 'same-day'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setDiscountType('same-day')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      discountType === 'same-day' ? 'border-green-500 bg-green-500' : 'border-gray-300'
                    }`}>
                      {discountType === 'same-day' && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-green-600" />
                        <span className="font-semibold">Same Day Purchase</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Patient purchases second pair today
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">50%</div>
                    <div className="text-xs text-muted-foreground">off</div>
                  </div>
                </div>
              </div>

              {/* Within 30 Days - 30% */}
              <div
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  discountType === 'within-30-days'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setDiscountType('within-30-days')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      discountType === 'within-30-days' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                    }`}>
                      {discountType === 'within-30-days' && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold">Within 30 Days</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Patient returns within 30 days to purchase
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">30%</div>
                    <div className="text-xs text-muted-foreground">off</div>
                  </div>
                </div>
              </div>

              {/* No Discount */}
              <div
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  discountType === 'none'
                    ? 'border-gray-500 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setDiscountType('none')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      discountType === 'none' ? 'border-gray-500 bg-gray-500' : 'border-gray-300'
                    }`}>
                      {discountType === 'none' && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div>
                      <span className="font-semibold">No Discount</span>
                      <p className="text-sm text-muted-foreground">
                        Full price (no timing discount applied)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-500">0%</div>
                    <div className="text-xs text-muted-foreground">off</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Inputs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base">
                <Glasses className="h-5 w-5" />
                <span>Second Pair Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Frame Name */}
              <div className="space-y-2">
                <Label htmlFor="frame-name">Frame Name (optional)</Label>
                <Input
                  id="frame-name"
                  placeholder="e.g., Ray-Ban Aviator"
                  value={frameName}
                  onChange={(e) => setFrameName(e.target.value)}
                />
              </div>

              {/* Price Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Frame Price */}
                <div className="space-y-2">
                  <Label htmlFor="frame-price">Frame Price</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="frame-price"
                      type="number"
                      min="0"
                      step="0.01"
                      className="pl-8"
                      value={framePrice || ''}
                      onChange={(e) => setFramePrice(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Lens Price */}
                <div className="space-y-2">
                  <Label htmlFor="lens-price">Lens Price</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="lens-price"
                      type="number"
                      min="0"
                      step="0.01"
                      className="pl-8"
                      value={lensPrice || ''}
                      onChange={(e) => setLensPrice(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Coating Price */}
                <div className="space-y-2">
                  <Label htmlFor="coating-price">Coating/Add-ons</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="coating-price"
                      type="number"
                      min="0"
                      step="0.01"
                      className="pl-8"
                      value={coatingPrice || ''}
                      onChange={(e) => setCoatingPrice(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Price Summary */}
          {subtotal > 0 && (
            <Card className={`border-2 ${
              discountType === 'same-day' ? 'border-green-300 bg-green-50' :
              discountType === 'within-30-days' ? 'border-blue-300 bg-blue-50' :
              'border-gray-300 bg-gray-50'
            }`}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Frame</span>
                    <span>{formatPrice(framePrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Lenses</span>
                    <span>{formatPrice(lensPrice)}</span>
                  </div>
                  {coatingPrice > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Coatings/Add-ons</span>
                      <span>{formatPrice(coatingPrice)}</span>
                    </div>
                  )}

                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                  </div>

                  {discountPercent > 0 && (
                    <div className={`flex justify-between text-sm ${
                      discountType === 'same-day' ? 'text-green-700' : 'text-blue-700'
                    }`}>
                      <span className="flex items-center space-x-1">
                        <Percent className="h-3 w-3" />
                        <span>
                          {discountType === 'same-day' ? 'Same Day' : '30 Day'} Discount ({discountPercent}%)
                        </span>
                      </span>
                      <span>-{formatPrice(discountAmount)}</span>
                    </div>
                  )}

                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold text-lg">Total Due (Cash)</span>
                        <div className="flex items-center space-x-1 text-xs text-amber-600">
                          <DollarSign className="h-3 w-3" />
                          <span>Not covered by insurance</span>
                        </div>
                      </div>
                      <span className="text-2xl font-bold">{formatPrice(totalDue)}</span>
                    </div>
                  </div>

                  {discountPercent > 0 && (
                    <div className={`text-center text-sm font-medium py-2 rounded ${
                      discountType === 'same-day' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      Patient saves {formatPrice(discountAmount)} with {discountType === 'same-day' ? 'same day' : '30 day'} discount!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Second Pair Ideas */}
          <Card className="border-purple-200 bg-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-purple-900 text-base">
                <Glasses className="h-5 w-5" />
                <span>Popular Second Pair Uses</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start space-x-3">
                <Eye className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <h5 className="font-medium text-purple-900">Computer Glasses</h5>
                  <p className="text-sm text-purple-700">Blue light filtering for office work</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Sun className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <h5 className="font-medium text-purple-900">Prescription Sunglasses</h5>
                  <p className="text-sm text-purple-700">UV protection outdoors</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Glasses className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <h5 className="font-medium text-purple-900">Backup Pair</h5>
                  <p className="text-sm text-purple-700">Never be without glasses</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
