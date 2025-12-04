'use client';

import { useState } from 'react';
import { UserPlus, DollarSign, Search, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface CustomerNotFoundProps {
  searchTerm: string;
  onCreateCustomer: (customerData: NewCustomerData) => void;
  onProceedAsCash: () => void;
  onSearchAgain: () => void;
}

export interface NewCustomerData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dateOfBirth?: string;
}

export function CustomerNotFound({
  searchTerm,
  onCreateCustomer,
  onProceedAsCash,
  onSearchAgain,
}: CustomerNotFoundProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<NewCustomerData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    dateOfBirth: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof NewCustomerData, string>>>({});

  // Try to pre-fill from search term
  useState(() => {
    const parts = searchTerm.trim().split(' ');
    if (parts.length >= 2) {
      setFormData(prev => ({
        ...prev,
        firstName: parts[0],
        lastName: parts.slice(1).join(' '),
      }));
    } else if (searchTerm.includes('@')) {
      setFormData(prev => ({
        ...prev,
        email: searchTerm,
      }));
    } else if (/^\d/.test(searchTerm)) {
      setFormData(prev => ({
        ...prev,
        phone: searchTerm,
      }));
    }
  });

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof NewCustomerData, string>> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.phone.trim() && !formData.email.trim()) {
      newErrors.phone = 'Phone or email is required';
      newErrors.email = 'Phone or email is required';
    }
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onCreateCustomer(formData);
    }
  };

  if (showForm) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create New Customer
          </CardTitle>
          <CardDescription>
            Enter the customer&apos;s information to create their profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, firstName: e.target.value }))
                  }
                  placeholder="John"
                  className={errors.firstName ? 'border-destructive' : ''}
                />
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, lastName: e.target.value }))
                  }
                  placeholder="Smith"
                  className={errors.lastName ? 'border-destructive' : ''}
                />
                {errors.lastName && (
                  <p className="text-xs text-destructive">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="(555) 123-4567"
                className={errors.phone ? 'border-destructive' : ''}
              />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="john.smith@email.com"
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth (Optional)</Label>
              <Input
                id="dob"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, dateOfBirth: e.target.value }))
                }
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Back
              </Button>
              <Button type="submit">
                Create Customer
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
          <Search className="h-6 w-6 text-muted-foreground" />
        </div>
        <CardTitle>Customer Not Found</CardTitle>
        <CardDescription>
          No customer found matching &quot;{searchTerm}&quot;
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          Would you like to create a new customer or proceed without a customer profile?
        </p>

        <div className="grid gap-3">
          {/* Option 1: Create Customer */}
          <button
            onClick={() => setShowForm(true)}
            className="w-full p-4 text-left rounded-lg border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Create New Customer</p>
                <p className="text-sm text-muted-foreground">
                  Enter customer information and optionally scan their insurance card
                </p>
              </div>
            </div>
          </button>

          {/* Option 2: Proceed as Cash */}
          <button
            onClick={onProceedAsCash}
            className="w-full p-4 text-left rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-muted">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Proceed as Cash Patient</p>
                <p className="text-sm text-muted-foreground">
                  Create a quick sale without linking to a customer profile
                </p>
              </div>
            </div>
          </button>
        </div>

        <div className="pt-4 text-center">
          <Button variant="link" onClick={onSearchAgain}>
            <Search className="h-4 w-4 mr-2" />
            Search Again
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
