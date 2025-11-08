/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  Save, 
  Package, 
  DollarSign, 
  MapPin,
  Warehouse,
  AlertCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Category {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
  address: string;
}

interface LocationData {
  locationId: string;
  available: boolean;
  priceOverride?: number;
}

interface InventoryData {
  locationId: string;
  currentStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  costPrice?: number;
  maxStock?: number;
}

interface ProductFormData {
  name: string;
  sku: string;
  categoryId: string;
  manufacturer: string;
  basePrice: number;
  tierVsp: string;
  tierEyemed: string;
  tierSpectera: string;
  active: boolean;
  description: string;
  locations: LocationData[];
  inventory: InventoryData[];
}

export default function AddProductPage() {
  const router = useRouter();
  
  // Reference data
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    sku: '',
    categoryId: '',
    manufacturer: '',
    basePrice: 0,
    tierVsp: '',
    tierEyemed: '',
    tierSpectera: '',
    active: true,
    description: '',
    locations: [],
    inventory: []
  });
  
  // Form validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Load reference data
  useEffect(() => {
    fetchReferenceData();
  }, []);

  const fetchReferenceData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, locationsRes] = await Promise.all([
        fetch('/api/admin/products/reference?type=categories'),
        fetch('/api/admin/products/reference?type=locations')
      ]);

      const [categoriesData, locationsData] = await Promise.all([
        categoriesRes.json(),
        locationsRes.json()
      ]);

      if (categoriesRes.ok) setCategories(categoriesData);
      if (locationsRes.ok) {
        setLocations(locationsData);
        // Initialize location data for all locations
        const locationData: LocationData[] = locationsData.map((loc: Location) => ({
          locationId: loc.id,
          available: false,
          priceOverride: undefined
        }));
        
        const inventoryData: InventoryData[] = locationsData.map((loc: Location) => ({
          locationId: loc.id,
          currentStock: 0,
          reorderPoint: 5,
          reorderQuantity: 20,
          costPrice: undefined,
          maxStock: undefined
        }));

        setFormData(prev => ({
          ...prev,
          locations: locationData,
          inventory: inventoryData
        }));
      }
    } catch (error) {
      console.error('Error fetching reference data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle form field changes
  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle location availability change
  const handleLocationChange = (locationId: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      locations: prev.locations.map(loc => 
        loc.locationId === locationId 
          ? { ...loc, [field]: value }
          : loc
      )
    }));
  };

  // Handle inventory change
  const handleInventoryChange = (locationId: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      inventory: prev.inventory.map(inv => 
        inv.locationId === locationId 
          ? { ...inv, [field]: value }
          : inv
      )
    }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Category is required';
    }

    if (formData.basePrice <= 0) {
      newErrors.basePrice = 'Base price must be greater than 0';
    }

    // Validate SKU format if provided
    if (formData.sku && !/^[A-Za-z0-9\-_]+$/.test(formData.sku)) {
      newErrors.sku = 'SKU must contain only letters, numbers, hyphens, and underscores';
    }

    // Check if at least one location is selected
    const selectedLocations = formData.locations.filter(loc => loc.available);
    if (selectedLocations.length === 0) {
      newErrors.locations = 'At least one location must be selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      
      // Filter data for selected locations only
      const activeLocations = formData.locations.filter(loc => loc.available);
      const activeInventory = formData.inventory.filter(inv => 
        activeLocations.some(loc => loc.locationId === inv.locationId)
      );

      const productData = {
        ...formData,
        locations: activeLocations,
        inventory: activeInventory,
        basePrice: parseFloat(formData.basePrice.toString())
      };

      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });

      if (response.ok) {
        router.push('/admin/products');
      } else {
        const errorData = await response.json();
        setErrors({ submit: errorData.error || 'Failed to create product' });
      }
    } catch (error) {
      console.error('Error creating product:', error);
      setErrors({ submit: 'Network error occurred' });
    } finally {
      setSaving(false);
    }
  };

  const tierOptions = [
    { value: '', label: 'Not Applicable' },
    { value: 'TIER_1', label: 'Tier 1' },
    { value: 'TIER_2', label: 'Tier 2' },
    { value: 'TIER_3', label: 'Tier 3' },
    { value: 'PREMIUM', label: 'Premium' }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-96">
          <Package className="h-8 w-8 animate-pulse text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
          <p className="text-gray-600">Create a new product with pricing, inventory, and location settings</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  placeholder="Enter product name"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => handleFieldChange('sku', e.target.value)}
                  placeholder="Enter SKU (optional)"
                  className={errors.sku ? 'border-red-500' : ''}
                />
                {errors.sku && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.sku}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select 
                  value={formData.categoryId} 
                  onValueChange={(value) => handleFieldChange('categoryId', value)}
                >
                  <SelectTrigger className={errors.categoryId ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.categoryId && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.categoryId}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) => handleFieldChange('manufacturer', e.target.value)}
                  placeholder="Enter manufacturer"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Enter product description"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => handleFieldChange('active', checked)}
              />
              <Label htmlFor="active">Active (available for sale)</Label>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing & Tiers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="basePrice">Base Price *</Label>
                <Input
                  id="basePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.basePrice || ''}
                  onChange={(e) => handleFieldChange('basePrice', e.target.value)}
                  placeholder="0.00"
                  className={errors.basePrice ? 'border-red-500' : ''}
                />
                {errors.basePrice && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.basePrice}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tierVsp">VSP Tier</Label>
                <Select 
                  value={formData.tierVsp} 
                  onValueChange={(value) => handleFieldChange('tierVsp', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select VSP tier" />
                  </SelectTrigger>
                  <SelectContent>
                    {tierOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tierEyemed">EyeMed Tier</Label>
                <Select 
                  value={formData.tierEyemed} 
                  onValueChange={(value) => handleFieldChange('tierEyemed', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select EyeMed tier" />
                  </SelectTrigger>
                  <SelectContent>
                    {tierOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tierSpectera">Spectera Tier</Label>
                <Select 
                  value={formData.tierSpectera} 
                  onValueChange={(value) => handleFieldChange('tierSpectera', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Spectera tier" />
                  </SelectTrigger>
                  <SelectContent>
                    {tierOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location Availability */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location Availability
            </CardTitle>
          </CardHeader>
          <CardContent>
            {errors.locations && (
              <p className="text-sm text-red-500 flex items-center gap-1 mb-4">
                <AlertCircle className="h-3 w-3" />
                {errors.locations}
              </p>
            )}
            <div className="space-y-4">
              {locations.map((location) => {
                const locationData = formData.locations.find(l => l.locationId === location.id);
                return (
                  <div key={location.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={locationData?.available || false}
                          onCheckedChange={(checked) => 
                            handleLocationChange(location.id, 'available', checked)
                          }
                        />
                        <div>
                          <h4 className="font-medium">{location.name}</h4>
                          <p className="text-sm text-gray-500">{location.address}</p>
                        </div>
                      </div>
                    </div>
                    
                    {locationData?.available && (
                      <div className="ml-6 mt-3">
                        <div className="space-y-2">
                          <Label>Price Override (optional)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={locationData.priceOverride || ''}
                            onChange={(e) => 
                              handleLocationChange(
                                location.id, 
                                'priceOverride', 
                                e.target.value ? parseFloat(e.target.value) : undefined
                              )
                            }
                            placeholder={`Default: $${formData.basePrice.toFixed(2)}`}
                            className="max-w-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Inventory Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="h-5 w-5" />
              Inventory Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {locations.map((location) => {
                const locationAvailable = formData.locations.find(l => l.locationId === location.id)?.available;
                const inventoryData = formData.inventory.find(i => i.locationId === location.id);
                
                if (!locationAvailable) return null;

                return (
                  <div key={location.id} className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Warehouse className="h-4 w-4" />
                      {location.name}
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      <div className="space-y-2">
                        <Label>Current Stock</Label>
                        <Input
                          type="number"
                          min="0"
                          value={inventoryData?.currentStock || 0}
                          onChange={(e) => 
                            handleInventoryChange(location.id, 'currentStock', parseInt(e.target.value) || 0)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Reorder Point</Label>
                        <Input
                          type="number"
                          min="0"
                          value={inventoryData?.reorderPoint || 5}
                          onChange={(e) => 
                            handleInventoryChange(location.id, 'reorderPoint', parseInt(e.target.value) || 5)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Reorder Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={inventoryData?.reorderQuantity || 20}
                          onChange={(e) => 
                            handleInventoryChange(location.id, 'reorderQuantity', parseInt(e.target.value) || 20)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Cost Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={inventoryData?.costPrice || ''}
                          onChange={(e) => 
                            handleInventoryChange(
                              location.id, 
                              'costPrice', 
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          placeholder="0.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Max Stock</Label>
                        <Input
                          type="number"
                          min="1"
                          value={inventoryData?.maxStock || ''}
                          onChange={(e) => 
                            handleInventoryChange(
                              location.id, 
                              'maxStock', 
                              e.target.value ? parseInt(e.target.value) : undefined
                            )
                          }
                          placeholder="No limit"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <Card>
          <CardContent className="p-6">
            {errors.submit && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.submit}
                </p>
              </div>
            )}
            
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? (
                  <>
                    <Package className="h-4 w-4 mr-2 animate-spin" />
                    Creating Product...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Product
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}