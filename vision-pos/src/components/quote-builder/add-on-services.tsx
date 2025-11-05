'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ChevronDown, 
  ChevronRight,
  Camera, 
  Eye, 
  Scan, 
  Clock, 
  Shield, 
  Plus,
  Info
} from 'lucide-react';
import { useQuoteStore } from '@/store/quote-store';

interface AddOnService {
  id: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  basePrice: number;
  duration: number; // in minutes
  category: 'imaging' | 'testing' | 'enhancement' | 'specialty';
  icon: React.ComponentType<{ className?: string }>;
  insuranceCovered: boolean;
  copayAmount?: number;
  requiresPreauth?: boolean;
  benefits: string[];
}

const addOnServicesList: AddOnService[] = [
  {
    id: 'dilation',
    name: 'Pupil Dilation',
    shortDescription: 'Enhanced retinal examination',
    fullDescription: 'Dilating eye drops allow for comprehensive examination of the retina, optic nerve, and blood vessels for early detection of eye diseases.',
    basePrice: 35.00,
    duration: 20,
    category: 'enhancement',
    icon: Eye,
    insuranceCovered: true,
    copayAmount: 10.00,
    benefits: [
      'Better view of retinal periphery',
      'Enhanced disease detection',
      'More thorough examination'
    ]
  },
  {
    id: 'retinal-photos',
    name: 'Digital Retinal Photography',
    shortDescription: 'Document and monitor eye health',
    fullDescription: 'High-resolution digital photographs of your retina to create a baseline for future comparisons and monitor changes over time.',
    basePrice: 65.00,
    duration: 10,
    category: 'imaging',
    icon: Camera,
    insuranceCovered: false,
    benefits: [
      'Permanent record of eye health',
      'Early disease detection',
      'Track changes over time',
      'Enhanced patient education'
    ]
  },
  {
    id: 'oct-macula',
    name: 'OCT Macula Scan',
    shortDescription: '3D imaging of central retina',
    fullDescription: 'Optical Coherence Tomography provides detailed cross-sectional images of the macula to detect macular degeneration, diabetic retinopathy, and other conditions.',
    basePrice: 125.00,
    duration: 15,
    category: 'imaging',
    icon: Scan,
    insuranceCovered: false,
    requiresPreauth: true,
    benefits: [
      'Detect macular degeneration early',
      'Monitor diabetic eye disease',
      'Detailed retinal layer analysis',
      'Precise measurements'
    ]
  },
  {
    id: 'oct-glaucoma',
    name: 'OCT Glaucoma Analysis',
    shortDescription: 'Optic nerve and nerve fiber analysis',
    fullDescription: 'Specialized OCT scan focused on the optic nerve head and retinal nerve fiber layer to detect and monitor glaucoma progression.',
    basePrice: 125.00,
    duration: 15,
    category: 'testing',
    icon: Scan,
    insuranceCovered: true,
    copayAmount: 25.00,
    benefits: [
      'Early glaucoma detection',
      'Monitor disease progression',
      'Quantitative analysis',
      'Treatment guidance'
    ]
  },
  {
    id: 'visual-field-extended',
    name: 'Extended Visual Field Test',
    shortDescription: 'Comprehensive peripheral vision testing',
    fullDescription: 'Advanced visual field testing with multiple test patterns to detect subtle visual field defects and monitor progression.',
    basePrice: 75.00,
    duration: 25,
    category: 'testing',
    icon: Scan,
    insuranceCovered: true,
    copayAmount: 15.00,
    benefits: [
      'Detect neurological conditions',
      'Monitor glaucoma progression',
      'Comprehensive field mapping',
      'Multiple test strategies'
    ]
  },
  {
    id: 'corneal-topography',
    name: 'Corneal Topography',
    shortDescription: 'Detailed corneal surface mapping',
    fullDescription: 'Advanced imaging of the corneal surface to detect astigmatism, keratoconus, and optimize contact lens fitting.',
    basePrice: 95.00,
    duration: 10,
    category: 'specialty',
    icon: Scan,
    insuranceCovered: false,
    benefits: [
      'Precise astigmatism measurement',
      'Detect corneal irregularities',
      'Optimize contact lens fit',
      'Surgical planning'
    ]
  }
];

interface AddOnServicesProps {
  className?: string;
}

export function AddOnServices({ className }: AddOnServicesProps) {
  const { 
    getSelectedExamServices,
    updateExamServices
  } = useQuoteStore();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['imaging']));
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());

  const selectedServices = getSelectedExamServices();
  const selectedAddOns: string[] = selectedServices.filter((id: string) => 
    addOnServicesList.some((service: AddOnService) => service.id === id)
  );

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleServiceDetails = (serviceId: string) => {
    const newExpanded = new Set(expandedServices);
    if (newExpanded.has(serviceId)) {
      newExpanded.delete(serviceId);
    } else {
      newExpanded.add(serviceId);
    }
    setExpandedServices(newExpanded);
  };

  const handleServiceToggle = (serviceId: string, checked: boolean) => {
    const currentServices = selectedServices;
    
    if (checked) {
      if (!currentServices.includes(serviceId)) {
        updateExamServices([...currentServices, serviceId]);
      }
    } else {
      updateExamServices(currentServices.filter((id: string) => id !== serviceId));
    }
  };

  const getCategoryServices = (category: string) => {
    return addOnServicesList.filter((service: AddOnService) => service.category === category);
  };

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'imaging':
        return 'Advanced Imaging';
      case 'testing':
        return 'Specialized Testing';
      case 'enhancement':
        return 'Exam Enhancements';
      case 'specialty':
        return 'Specialty Services';
      default:
        return 'Services';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'imaging':
        return <Camera className="h-5 w-5" />;
      case 'testing':
        return <Scan className="h-5 w-5" />;
      case 'enhancement':
        return <Plus className="h-5 w-5" />;
      case 'specialty':
        return <Shield className="h-5 w-5" />;
      default:
        return <Eye className="h-5 w-5" />;
    }
  };

  const getTotalAddOnCost = () => {
    return selectedAddOns.reduce((total: number, serviceId: string) => {
      const service = addOnServicesList.find((s: AddOnService) => s.id === serviceId);
      return total + (service?.basePrice || 0);
    }, 0);
  };

  const renderServiceCard = (service: AddOnService) => {
    const isSelected = selectedServices.includes(service.id);
    const isExpanded = expandedServices.has(service.id);
    const Icon = service.icon;

    return (
      <Card 
        key={service.id} 
        className={`transition-all duration-200 ${
          isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-md'
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => handleServiceToggle(service.id, !!checked)}
                className="mt-1"
              />
            </div>
            
            <div className="flex-grow min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Icon className="h-5 w-5 text-primary flex-shrink-0" />
                  <h4 className="font-medium text-sm leading-tight">{service.name}</h4>
                  {service.requiresPreauth && (
                    <Badge variant="outline" className="text-xs">Pre-auth</Badge>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleServiceDetails(service.id)}
                  className="h-6 w-6 p-0"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground mb-3">
                {service.shortDescription}
              </p>
              
              {isExpanded && (
                <div className="space-y-3 mb-3 p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs leading-relaxed">
                    {service.fullDescription}
                  </p>
                  
                  <div>
                    <h5 className="text-xs font-medium mb-2">Benefits:</h5>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {service.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>+{service.duration} min</span>
                  </div>
                  {service.insuranceCovered && (
                    <div className="flex items-center space-x-1 text-green-600">
                      <Shield className="h-3 w-3" />
                      <span>Covered</span>
                    </div>
                  )}
                </div>
                
                <div className="text-right">
                  <div className="font-semibold text-sm">
                    ${service.basePrice.toFixed(2)}
                  </div>
                  {service.insuranceCovered && service.copayAmount && (
                    <div className="text-xs text-green-600">
                      ${service.copayAmount.toFixed(2)} copay
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
            <Plus className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Add-On Services</h3>
            <p className="text-sm text-muted-foreground">
              Enhance your examination with additional testing
            </p>
          </div>
        </div>
        
        {selectedAddOns.length > 0 && (
          <div className="text-right">
            <div className="font-semibold text-sm">
              +${getTotalAddOnCost().toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              {selectedAddOns.length} add-on{selectedAddOns.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {(['imaging', 'testing', 'enhancement', 'specialty'] as const).map((category) => {
          const categoryServices = getCategoryServices(category);
          const isExpanded = expandedCategories.has(category);
          
          if (categoryServices.length === 0) return null;
          
          return (
            <div key={category} className="space-y-3">
              <Button
                variant="ghost"
                onClick={() => toggleCategory(category)}
                className="w-full justify-between p-3 h-auto"
              >
                <div className="flex items-center space-x-3">
                  {getCategoryIcon(category)}
                  <span className="font-medium">{getCategoryTitle(category)}</span>
                  <Badge variant="outline" className="text-xs">
                    {categoryServices.length}
                  </Badge>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
              
              {isExpanded && (
                <div className="grid gap-3 pl-4">
                  {categoryServices.map(renderServiceCard)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Information Note */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h4 className="font-medium text-blue-900">
                Recommended Add-Ons
              </h4>
              <p className="text-sm text-blue-700">
                These additional services can provide valuable insights into your eye health and 
                help detect conditions early when they&apos;re most treatable. Your eye care provider 
                will recommend the best options based on your individual needs and risk factors.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}