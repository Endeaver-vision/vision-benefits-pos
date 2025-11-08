'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  Trash2,
  Building,
  Phone,
  Mail,
  Globe,
  Percent,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { z } from 'zod';

interface Location {
  id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  taxRate?: number;
  timezone: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const locationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  website: z.string().url('Invalid URL format').optional().or(z.literal('')),
  taxRate: z.number().min(0, 'Tax rate must be positive').max(1, 'Tax rate cannot exceed 100%').optional(),
  timezone: z.string().min(1, 'Timezone is required'),
});

type LocationFormData = z.infer<typeof locationSchema>;

export default function LocationSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const locationId = params.id as string;

  const [location, setLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState<LocationFormData>({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    taxRate: 0,
    timezone: 'America/Los_Angeles',
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveResult, setSaveResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Common US timezones
  const timezones = [
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  ];

  // Fetch location data
  const fetchLocation = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/locations?id=${locationId}`);
      const data = await response.json();

      if (data.success && data.data.locations.length > 0) {
        const loc = data.data.locations[0];
        setLocation(loc);
        setFormData({
          name: loc.name,
          address: loc.address,
          phone: loc.phone || '',
          email: loc.email || '',
          website: loc.website || '',
          taxRate: loc.taxRate || 0,
          timezone: loc.timezone,
        });
      }
    } catch (error) {
      console.error('Error fetching location:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (locationId) {
      fetchLocation();
    }
  }, [locationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle form input changes
  const handleInputChange = (field: keyof LocationFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  // Validate and save location
  const handleSave = async () => {
    try {
      setSaving(true);
      setErrors({});

      // Validate form data
      const validatedData = locationSchema.parse(formData);

      const response = await fetch(`/api/admin/locations?id=${locationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validatedData),
      });

      const data = await response.json();

      if (data.success) {
        setLocation(data.data.location);
        setSaveResult({
          type: 'success',
          message: 'Location settings saved successfully',
        });
      } else {
        setSaveResult({
          type: 'error',
          message: data.error || 'Failed to save location settings',
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        setSaveResult({
          type: 'error',
          message: 'Failed to save location settings',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  // Handle logo upload
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingLogo(true);

      const formData = new FormData();
      formData.append('logo', file);
      formData.append('locationId', locationId);

      const response = await fetch('/api/admin/locations/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setLocation(prev => prev ? { ...prev, logo: data.data.logoPath } : null);
        setSaveResult({
          type: 'success',
          message: 'Logo uploaded successfully',
        });
      } else {
        setSaveResult({
          type: 'error',
          message: data.error || 'Failed to upload logo',
        });
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      setSaveResult({
        type: 'error',
        message: 'Failed to upload logo',
      });
    } finally {
      setUploadingLogo(false);
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // Handle logo removal
  const handleLogoRemove = async () => {
    try {
      const response = await fetch(`/api/admin/locations/upload?locationId=${locationId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setLocation(prev => prev ? { ...prev, logo: null } : null);
        setSaveResult({
          type: 'success',
          message: 'Logo removed successfully',
        });
      } else {
        setSaveResult({
          type: 'error',
          message: data.error || 'Failed to remove logo',
        });
      }
    } catch (error) {
      console.error('Error removing logo:', error);
      setSaveResult({
        type: 'error',
        message: 'Failed to remove logo',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!location) {
    return (
      <div className="p-6">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Location Not Found</h2>
          <p className="text-gray-600 mb-4">The requested location could not be found.</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
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
          <h1 className="text-2xl font-bold text-gray-900">Location Settings</h1>
          <p className="text-gray-600">Configure {location.name} settings and branding</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Location Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className={errors.address ? 'border-red-500' : ''}
                />
                {errors.address && (
                  <p className="text-sm text-red-600 mt-1">{errors.address}</p>
                )}
              </div>

              <div>
                <Label htmlFor="timezone">Timezone *</Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(value) => handleInputChange('timezone', value)}
                >
                  <SelectTrigger className={errors.timezone ? 'border-red-500' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map(tz => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.timezone && (
                  <p className="text-sm text-red-600 mt-1">{errors.timezone}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && (
                  <p className="text-sm text-red-600 mt-1">{errors.phone}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="contact@location.com"
                    className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <Label htmlFor="website">Website</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://www.location.com"
                    className={`pl-10 ${errors.website ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.website && (
                  <p className="text-sm text-red-600 mt-1">{errors.website}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Business Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Business Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.taxRate ? formData.taxRate * 100 : 0}
                  onChange={(e) => handleInputChange('taxRate', parseFloat(e.target.value) / 100 || 0)}
                  placeholder="8.25"
                  className={errors.taxRate ? 'border-red-500' : ''}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Enter the tax rate as a percentage (e.g., 8.25 for 8.25%)
                </p>
                {errors.taxRate && (
                  <p className="text-sm text-red-600 mt-1">{errors.taxRate}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Logo and Branding */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Logo & Branding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Logo */}
              {location.logo ? (
                <div className="space-y-3">
                  <Label>Current Logo</Label>
                  <div className="border rounded-lg p-4 bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={location.logo}
                      alt="Location Logo"
                      className="max-w-full h-auto max-h-32 mx-auto"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogoRemove}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Logo
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600">No logo uploaded</p>
                </div>
              )}

              {/* Upload Logo */}
              <div>
                <Label htmlFor="logo">Upload New Logo</Label>
                <div className="mt-2">
                  <input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-medium
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100
                      file:cursor-pointer cursor-pointer
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                {uploadingLogo && (
                  <div className="flex items-center gap-2 mt-2 text-blue-600">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Uploading...</span>
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Accepted formats: JPEG, PNG, WebP. Maximum size: 5MB.
                </p>
              </div>

              {/* Location Info Summary */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium text-gray-900 mb-2">Location Summary</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>Created: {new Date(location.createdAt).toLocaleDateString()}</div>
                  <div>Last Updated: {new Date(location.updatedAt).toLocaleDateString()}</div>
                  <div>Status: {location.active ? 'Active' : 'Inactive'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-4 pt-6 border-t">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>

      {/* Save Result */}
      {saveResult && (
        <div className="fixed bottom-4 right-4 max-w-sm">
          <Card className={`border-2 ${saveResult.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                {saveResult.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={`text-sm ${saveResult.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                  {saveResult.message}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSaveResult(null)}
                >
                  ×
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}