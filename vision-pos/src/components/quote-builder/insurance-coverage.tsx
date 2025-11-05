'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info,
  DollarSign
} from 'lucide-react';
import { useQuoteStore } from '@/store/quote-store';

interface InsuranceCoverage {
  serviceId: string;
  serviceName: string;
  covered: boolean;
  copayAmount?: number;
  deductibleApplies?: boolean;
  preAuthRequired?: boolean;
  limitations?: string;
  frequencyLimit?: string;
}

// Mock insurance coverage data - would come from API based on insurance carrier
const getInsuranceCoverage = (carrier: string): InsuranceCoverage[] => {
  const baseVSPCoverage: InsuranceCoverage[] = [
    {
      serviceId: 'comprehensive-exam',
      serviceName: 'Comprehensive Eye Examination',
      covered: true,
      copayAmount: 25.00,
      deductibleApplies: false,
      preAuthRequired: false,
      frequencyLimit: 'Once per 12 months'
    },
    {
      serviceId: 'contact-lens-fitting',
      serviceName: 'Contact Lens Fitting & Evaluation',
      covered: false,
      limitations: 'Not covered under standard plan'
    },
    {
      serviceId: 'retinal-imaging',
      serviceName: 'Digital Retinal Imaging',
      covered: false,
      limitations: 'Considered elective unless medically necessary'
    },
    {
      serviceId: 'visual-field-testing',
      serviceName: 'Visual Field Testing',
      covered: true,
      copayAmount: 15.00,
      deductibleApplies: false,
      preAuthRequired: false,
      limitations: 'Covered when medically necessary'
    },
    {
      serviceId: 'oct-scan',
      serviceName: 'OCT (Optical Coherence Tomography)',
      covered: false,
      limitations: 'Requires pre-authorization for medical necessity'
    },
    {
      serviceId: 'dilation',
      serviceName: 'Pupil Dilation',
      covered: true,
      copayAmount: 10.00,
      deductibleApplies: false,
      preAuthRequired: false
    },
    {
      serviceId: 'retinal-photos',
      serviceName: 'Digital Retinal Photography',
      covered: false,
      limitations: 'Not covered - considered screening'
    },
    {
      serviceId: 'oct-macula',
      serviceName: 'OCT Macula Scan',
      covered: false,
      preAuthRequired: true,
      limitations: 'May be covered with pre-authorization for specific conditions'
    },
    {
      serviceId: 'oct-glaucoma',
      serviceName: 'OCT Glaucoma Analysis',
      covered: true,
      copayAmount: 25.00,
      deductibleApplies: false,
      preAuthRequired: false,
      limitations: 'Covered for glaucoma monitoring'
    },
    {
      serviceId: 'visual-field-extended',
      serviceName: 'Extended Visual Field Test',
      covered: true,
      copayAmount: 15.00,
      deductibleApplies: false,
      preAuthRequired: false,
      limitations: 'Covered when medically indicated'
    },
    {
      serviceId: 'corneal-topography',
      serviceName: 'Corneal Topography',
      covered: false,
      limitations: 'Not covered unless pre-authorized for specific medical conditions'
    }
  ];

  const baseEyeMedCoverage: InsuranceCoverage[] = [
    {
      serviceId: 'comprehensive-exam',
      serviceName: 'Comprehensive Eye Examination',
      covered: true,
      copayAmount: 20.00,
      deductibleApplies: false,
      preAuthRequired: false,
      frequencyLimit: 'Once per 24 months'
    },
    {
      serviceId: 'contact-lens-fitting',
      serviceName: 'Contact Lens Fitting & Evaluation',
      covered: true,
      copayAmount: 40.00,
      deductibleApplies: false,
      preAuthRequired: false,
      frequencyLimit: 'Once per 24 months'
    },
    {
      serviceId: 'retinal-imaging',
      serviceName: 'Digital Retinal Imaging',
      covered: false,
      limitations: 'Not covered under routine plan'
    },
    {
      serviceId: 'visual-field-testing',
      serviceName: 'Visual Field Testing',
      covered: true,
      copayAmount: 20.00,
      deductibleApplies: false,
      preAuthRequired: false,
      limitations: 'Covered when medically necessary'
    },
    {
      serviceId: 'oct-scan',
      serviceName: 'OCT (Optical Coherence Tomography)',
      covered: true,
      copayAmount: 35.00,
      deductibleApplies: true,
      preAuthRequired: true,
      limitations: 'Requires pre-authorization'
    }
  ];

  switch (carrier) {
    case 'VSP':
      return baseVSPCoverage;
    case 'EyeMed':
      return baseEyeMedCoverage;
    case 'Spectera':
      return baseVSPCoverage.map(service => ({
        ...service,
        copayAmount: service.copayAmount ? service.copayAmount + 5 : undefined
      }));
    default:
      return [];
  }
};

interface InsuranceCoverageDisplayProps {
  className?: string;
}

export function InsuranceCoverageDisplay({ className }: InsuranceCoverageDisplayProps) {
  const { quote, getSelectedExamServices } = useQuoteStore();
  const selectedServices = getSelectedExamServices();
  
  const { carrier } = quote.insurance;
  const coverageData = getInsuranceCoverage(carrier);

  const getCoverageForService = (serviceId: string) => {
    return coverageData.find(coverage => coverage.serviceId === serviceId);
  };

  const getCoveredServices = () => {
    return selectedServices
      .map(serviceId => getCoverageForService(serviceId))
      .filter(coverage => coverage?.covered);
  };

  const getUncoveredServices = () => {
    return selectedServices
      .map(serviceId => getCoverageForService(serviceId))
      .filter(coverage => coverage && !coverage.covered);
  };

  const getTotalCopays = () => {
    return getCoveredServices().reduce((total, coverage) => {
      return total + (coverage?.copayAmount || 0);
    }, 0);
  };

  if (!carrier) {
    return (
      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          Please select an insurance carrier to view coverage information.
        </AlertDescription>
      </Alert>
    );
  }

  if (selectedServices.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Select exam services to view insurance coverage details.
        </AlertDescription>
      </Alert>
    );
  }

  const coveredServices = getCoveredServices();
  const uncoveredServices = getUncoveredServices();

  return (
    <div className={`space-y-4 ${className}`}>
      
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
          <Shield className="h-4 w-4 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Insurance Coverage</h3>
          <p className="text-sm text-muted-foreground">
            {carrier} plan coverage for selected services
          </p>
        </div>
      </div>

      {/* Coverage Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-semibold text-green-600">
                  {coveredServices.length}
                </div>
                <div className="text-xs text-muted-foreground">
                  Services Covered
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <div className="font-semibold text-red-600">
                  {uncoveredServices.length}
                </div>
                <div className="text-xs text-muted-foreground">
                  Not Covered
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-semibold text-blue-600">
                  ${getTotalCopays().toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Total Copays
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Covered Services */}
      {coveredServices.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Covered Services</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {coveredServices.map((coverage) => (
              <div key={coverage?.serviceId} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <div className="font-medium text-sm">{coverage?.serviceName}</div>
                  <div className="flex items-center space-x-4 mt-1">
                    {coverage?.copayAmount && (
                      <Badge variant="secondary" className="text-xs">
                        ${coverage.copayAmount.toFixed(2)} copay
                      </Badge>
                    )}
                    {coverage?.frequencyLimit && (
                      <span className="text-xs text-muted-foreground">
                        {coverage.frequencyLimit}
                      </span>
                    )}
                    {coverage?.preAuthRequired && (
                      <Badge variant="outline" className="text-xs text-amber-600">
                        Pre-auth required
                      </Badge>
                    )}
                  </div>
                </div>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Uncovered Services */}
      {uncoveredServices.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span>Not Covered</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {uncoveredServices.map((coverage) => (
              <div key={coverage?.serviceId} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <div className="font-medium text-sm">{coverage?.serviceName}</div>
                  {coverage?.limitations && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {coverage.limitations}
                    </div>
                  )}
                  {coverage?.preAuthRequired && (
                    <Badge variant="outline" className="text-xs text-amber-600 mt-1">
                      May require pre-authorization
                    </Badge>
                  )}
                </div>
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Important Notes */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Important:</strong> Coverage details are based on typical {carrier} benefits. 
          Actual coverage may vary by specific plan. Pre-authorization may be required for certain services. 
          Contact your insurance provider to verify benefits before treatment.
        </AlertDescription>
      </Alert>
    </div>
  );
}