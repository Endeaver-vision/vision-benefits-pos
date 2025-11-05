'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Shield,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Eye,
  Glasses,
  Calendar,
  Phone,
  X,
  Loader2
} from 'lucide-react';
import { useQuoteStore } from '@/store/quote-store';

interface InsuranceBenefit {
  type: 'frame' | 'lens' | 'enhancement' | 'exam';
  allowance: number;
  copay?: number;
  frequency: 'annual' | 'biennial';
  lastUsed?: Date;
  remainingBenefit: number;
}

interface InsuranceVerification {
  memberId: string;
  verified: boolean;
  verificationDate: Date;
  benefits: InsuranceBenefit[];
  eligibilityStatus: 'active' | 'inactive' | 'pending' | 'expired';
  effectiveDate: Date;
  terminationDate?: Date;
  networkStatus: 'in-network' | 'out-of-network';
}

interface InsuranceIntegrationProps {
  className?: string;
}

export function InsuranceIntegration({ className }: InsuranceIntegrationProps) {
  const { quote, updateInsurance, updatePricing } = useQuoteStore();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verification, setVerification] = useState<InsuranceVerification | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);

  // Mock insurance data for demonstration
  const mockInsuranceData: Record<string, InsuranceVerification> = {
    'VSP123456789': {
      memberId: 'VSP123456789',
      verified: true,
      verificationDate: new Date(),
      eligibilityStatus: 'active',
      effectiveDate: new Date('2024-01-01'),
      networkStatus: 'in-network',
      benefits: [
        {
          type: 'exam',
          allowance: 0,
          copay: 25,
          frequency: 'annual',
          remainingBenefit: 0
        },
        {
          type: 'frame',
          allowance: 200,
          frequency: 'biennial',
          remainingBenefit: 200
        },
        {
          type: 'lens',
          allowance: 150,
          frequency: 'biennial',
          remainingBenefit: 150
        },
        {
          type: 'enhancement',
          allowance: 50,
          frequency: 'biennial',
          remainingBenefit: 50
        }
      ]
    },
    'EYEMED987654321': {
      memberId: 'EYEMED987654321',
      verified: true,
      verificationDate: new Date(),
      eligibilityStatus: 'active',
      effectiveDate: new Date('2024-01-01'),
      networkStatus: 'in-network',
      benefits: [
        {
          type: 'exam',
          allowance: 0,
          copay: 15,
          frequency: 'annual',
          remainingBenefit: 0
        },
        {
          type: 'frame',
          allowance: 180,
          frequency: 'annual',
          remainingBenefit: 180
        },
        {
          type: 'lens',
          allowance: 120,
          frequency: 'annual',
          remainingBenefit: 120
        },
        {
          type: 'enhancement',
          allowance: 75,
          frequency: 'annual',
          remainingBenefit: 75
        }
      ]
    }
  };

  const handleVerifyInsurance = async () => {
    if (!quote.insurance.memberId) return;

    setIsVerifying(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockData = mockInsuranceData[quote.insurance.memberId];
    if (mockData) {
      setVerification(mockData);
      calculateInsuranceCoverage(mockData);
    } else {
      setVerification({
        memberId: quote.insurance.memberId,
        verified: false,
        verificationDate: new Date(),
        eligibilityStatus: 'inactive',
        effectiveDate: new Date(),
        networkStatus: 'out-of-network',
        benefits: []
      });
    }
    
    setIsVerifying(false);
  };

  const calculateInsuranceCoverage = (verification: InsuranceVerification) => {
    if (!verification.verified || verification.eligibilityStatus !== 'active') {
      updatePricing({
        insurance: {
          examCoverage: 0,
          frameCoverage: 0,
          lensCoverage: 0,
          contactCoverage: 0,
          totalCoverage: 0
        }
      });
      return;
    }

    const benefits = verification.benefits;
    
    // Calculate frame coverage
    const frameBenefit = benefits.find(b => b.type === 'frame');
    const framePrice = quote.eyeglasses.frame?.price || 0;
    const frameCoverage = frameBenefit ? Math.min(framePrice, frameBenefit.remainingBenefit) : 0;

    // Calculate lens coverage
    const lensBenefit = benefits.find(b => b.type === 'lens');
    const lensPrice = getCurrentLensPrice();
    const lensCoverage = lensBenefit ? Math.min(lensPrice, lensBenefit.remainingBenefit) : 0;

    // Calculate enhancement coverage
    const enhancementBenefit = benefits.find(b => b.type === 'enhancement');
    const enhancementPrice = getCurrentEnhancementPrice();
    const enhancementCoverage = enhancementBenefit ? 
      Math.min(enhancementPrice, enhancementBenefit.remainingBenefit) : 0;

    // Calculate exam coverage
    const examBenefit = benefits.find(b => b.type === 'exam');
    const examCoverage = examBenefit?.copay || 0;

    const totalCoverage = frameCoverage + lensCoverage + enhancementCoverage;

    updatePricing({
      insurance: {
        examCoverage,
        frameCoverage,
        lensCoverage: lensCoverage + enhancementCoverage,
        contactCoverage: 0,
        totalCoverage
      }
    });
  };

  const getCurrentLensPrice = () => {
    // This would normally calculate based on current lens selection
    // For now, return a mock value
    return 299; // Base progressive lens price
  };

  const getCurrentEnhancementPrice = () => {
    // This would normally calculate based on current enhancement selections
    // For now, return a mock value
    return quote.eyeglasses.enhancements?.length * 89 || 0;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const renderBenefitCard = (benefit: InsuranceBenefit) => {
    const getIcon = () => {
      switch (benefit.type) {
        case 'exam': return Eye;
        case 'frame': return Glasses;
        case 'lens': return Eye;
        case 'enhancement': return Shield;
        default: return DollarSign;
      }
    };

    const Icon = getIcon();

    return (
      <div key={benefit.type} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h4 className="font-medium capitalize">{benefit.type}</h4>
            <p className="text-xs text-muted-foreground">
              {benefit.frequency} benefit
            </p>
          </div>
        </div>
        <div className="text-right">
          {benefit.copay ? (
            <>
              <div className="font-semibold">{formatPrice(benefit.copay)}</div>
              <div className="text-xs text-muted-foreground">copay</div>
            </>
          ) : (
            <>
              <div className="font-semibold">{formatPrice(benefit.remainingBenefit)}</div>
              <div className="text-xs text-muted-foreground">
                of {formatPrice(benefit.allowance)} remaining
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Insurance Benefits</h2>
          <p className="text-sm text-muted-foreground">
            Verify coverage and apply benefits to your order
          </p>
        </div>
      </div>

      {/* Insurance Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Insurance Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="carrier">Insurance Carrier</Label>
              <Input
                id="carrier"
                value={quote.insurance.carrier}
                onChange={(e) => updateInsurance({ carrier: e.target.value as 'VSP' | 'EyeMed' | 'Spectera' | '' })}
                placeholder="Select carrier..."
              />
            </div>
            <div>
              <Label htmlFor="memberId">Member ID</Label>
              <Input
                id="memberId"
                value={quote.insurance.memberId}
                onChange={(e) => updateInsurance({ memberId: e.target.value })}
                placeholder="Enter member ID..."
              />
            </div>
          </div>
          
          {quote.insurance.memberId && (
            <Button 
              onClick={handleVerifyInsurance}
              disabled={isVerifying}
              className="w-full"
            >
              {isVerifying ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {isVerifying ? 'Verifying Benefits...' : 'Verify Insurance Benefits'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Verification Results */}
      {verification && (
        <Card className={verification.verified ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {verification.verified ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <X className="h-6 w-6 text-red-600" />
                )}
                <div>
                  <h3 className="font-semibold">
                    {verification.verified ? 'Insurance Verified' : 'Verification Failed'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Member ID: {verification.memberId}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge 
                  variant={verification.eligibilityStatus === 'active' ? 'default' : 'destructive'}
                >
                  {verification.eligibilityStatus}
                </Badge>
                <div className="text-xs text-muted-foreground mt-1">
                  {verification.networkStatus}
                </div>
              </div>
            </div>

            {verification.verified && verification.eligibilityStatus === 'active' && (
              <div className="space-y-4">
                <h4 className="font-medium">Available Benefits:</h4>
                <div className="space-y-3">
                  {verification.benefits.map(renderBenefitCard)}
                </div>

                {/* Coverage Summary */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Coverage Applied to Current Order:</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Frame Coverage:</span>
                      <span className="font-medium text-green-600">
                        -{formatPrice(quote.pricing.insurance.frameCoverage)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Lens & Enhancement Coverage:</span>
                      <span className="font-medium text-green-600">
                        -{formatPrice(quote.pricing.insurance.lensCoverage)}
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>Total Insurance Savings:</span>
                      <span className="text-green-600">
                        -{formatPrice(quote.pricing.insurance.totalCoverage)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!verification.verified && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Unable to verify insurance benefits. Please contact your insurance provider 
                  or proceed without insurance verification.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual Benefits Entry */}
      {verification && !verification.verified && (
        <Card>
          <CardHeader>
            <CardTitle>Manual Benefits Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              If you know your benefits, you can enter them manually:
            </p>
            <Button 
              variant="outline" 
              onClick={() => setShowManualEntry(!showManualEntry)}
            >
              {showManualEntry ? 'Hide' : 'Show'} Manual Entry
            </Button>
            
            {showManualEntry && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="frameAllowance">Frame Allowance</Label>
                    <Input
                      id="frameAllowance"
                      type="number"
                      placeholder="0.00"
                      onChange={(e) => updateInsurance({ allowanceFrame: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lensAllowance">Lens Allowance</Label>
                    <Input
                      id="lensAllowance"
                      type="number"
                      placeholder="0.00"
                      onChange={(e) => updateInsurance({ allowanceLens: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
                <Button onClick={() => {
                  // Apply manual benefits
                  const frameCoverage = Math.min(
                    quote.eyeglasses.frame?.price || 0,
                    quote.insurance.allowanceFrame || 0
                  );
                  const lensCoverage = Math.min(
                    getCurrentLensPrice() + getCurrentEnhancementPrice(),
                    quote.insurance.allowanceLens || 0
                  );
                  
                  updatePricing({
                    insurance: {
                      ...quote.pricing.insurance,
                      frameCoverage,
                      lensCoverage,
                      totalCoverage: frameCoverage + lensCoverage
                    }
                  });
                }}>
                  Apply Manual Benefits
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Out of Network Notice */}
      {verification && verification.verified && verification.networkStatus === 'out-of-network' && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Out-of-Network Provider:</strong> Your insurance may require you to 
            submit claims for reimbursement. Contact your insurance provider for details 
            on out-of-network benefits and reimbursement procedures.
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Actions */}
      <div className="flex space-x-4">
        <Button variant="outline" className="flex items-center space-x-2">
          <Phone className="h-4 w-4" />
          <span>Contact Insurance</span>
        </Button>
        <Button variant="outline" className="flex items-center space-x-2">
          <Calendar className="h-4 w-4" />
          <span>Check Benefit Year</span>
        </Button>
      </div>
    </div>
  );
}