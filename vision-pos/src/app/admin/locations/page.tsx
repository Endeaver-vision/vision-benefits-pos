'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Building,
  Phone,
  Mail,
  Globe,
  Users,
  ShoppingBag,
  Package,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  CheckCircle,
  RefreshCw,
  Settings,
  ArrowLeft
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';

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
  _count: {
    users: number;
    quotes: number;
    transactions: number;
    inventory: number;
  };
}

interface LocationStats {
  total: number;
  active: number;
  inactive: number;
}

export default function LocationManagementPage() {
  const router = useRouter();
  
  const [locations, setLocations] = useState<Location[]>([]);
  const [stats, setStats] = useState<LocationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLocations, setTotalLocations] = useState(0);
  
  // Modals and Actions
  const [bulkActionDialog, setBulkActionDialog] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);

  // Fetch locations data
  const fetchLocations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(activeFilter && activeFilter !== 'all' && { active: activeFilter }),
      });

      const response = await fetch(`/api/admin/locations?${params}`);
      const data = await response.json();

      if (data.success) {
        setLocations(data.data.locations);
        setStats(data.data.stats);
        setTotalPages(data.data.pagination.pages);
        setTotalLocations(data.data.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [currentPage, searchTerm, activeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle location selection
  const toggleLocationSelection = (locationId: string) => {
    setSelectedLocations(prev =>
      prev.includes(locationId)
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  const selectAllLocations = () => {
    setSelectedLocations(
      selectedLocations.length === locations.length
        ? []
        : locations.map(location => location.id)
    );
  };

  // Handle bulk actions
  const handleBulkAction = async (action: string) => {
    if (selectedLocations.length === 0) return;

    try {
      setActionLoading(true);
      const response = await fetch('/api/admin/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          locationIds: selectedLocations,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setActionResult(`${action} completed successfully`);
        fetchLocations();
        setSelectedLocations([]);
      } else {
        setActionResult(`Action failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
      setActionResult('Action failed');
    } finally {
      setActionLoading(false);
      setBulkActionDialog(null);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setActiveFilter('all');
    setCurrentPage(1);
  };

  if (loading && locations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/dashboard')}
            className="text-neutral-600 hover:text-green-600"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="h-6 w-px bg-neutral-300" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Location Management</h1>
            <p className="text-gray-600">Manage business locations and settings</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => router.push('/admin/locations/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Building className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Locations</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Locations</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Staff</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {locations.reduce((sum, loc) => sum + loc._count.users, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={activeFilter} onValueChange={setActiveFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={resetFilters}>
                Reset
              </Button>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedLocations.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-800">
                {selectedLocations.length} location(s) selected
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBulkActionDialog('activate')}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Activate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBulkActionDialog('deactivate')}
                >
                  <Building className="h-4 w-4 mr-1" />
                  Deactivate
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setBulkActionDialog('delete')}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Locations Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Locations ({totalLocations})</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedLocations.length === locations.length && locations.length > 0}
                    onCheckedChange={selectAllLocations}
                  />
                </TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedLocations.includes(location.id)}
                      onCheckedChange={() => toggleLocationSelection(location.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium">{location.name}</p>
                        <p className="text-sm text-gray-500">{location.address}</p>
                        {location.timezone && (
                          <p className="text-xs text-gray-400">Timezone: {location.timezone}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {location.phone && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span>{location.phone}</span>
                        </div>
                      )}
                      {location.email && (
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-gray-400" />
                          <span>{location.email}</span>
                        </div>
                      )}
                      {location.website && (
                        <div className="flex items-center gap-1 text-sm">
                          <Globe className="h-3 w-3 text-gray-400" />
                          <span className="truncate max-w-32">{location.website}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={location.active ? 'default' : 'secondary'}>
                      {location.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{location._count.users}</span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-1">
                        <ShoppingBag className="h-3 w-3 text-gray-400" />
                        <span>{location._count.quotes} quotes</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3 text-gray-400" />
                        <span>{location._count.inventory} inventory</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-500">
                      {new Date(location.createdAt).toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => router.push(`/admin/locations/${location.id}`)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Location
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/admin/locations/${location.id}/settings`)}>
                          <Settings className="h-4 w-4 mr-2" />
                          Location Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setBulkActionDialog(location.active ? 'deactivate' : 'activate')}
                        >
                          {location.active ? (
                            <>
                              <Building className="h-4 w-4 mr-2" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Action Confirmation Dialog */}
      <Dialog open={!!bulkActionDialog} onOpenChange={() => setBulkActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirm {bulkActionDialog === 'activate' ? 'Location Activation' :
                      bulkActionDialog === 'deactivate' ? 'Location Deactivation' :
                      'Location Deletion'}
            </DialogTitle>
            <DialogDescription>
              {bulkActionDialog === 'activate' && 
                'This will activate the selected locations, making them available for operations.'
              }
              {bulkActionDialog === 'deactivate' && 
                'This will deactivate the selected locations, preventing new operations.'
              }
              {bulkActionDialog === 'delete' && 
                'This will permanently delete the selected locations. This action cannot be undone and is only allowed for locations with no associated data.'
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={bulkActionDialog === 'delete' ? 'destructive' : 'default'}
              onClick={() => bulkActionDialog && handleBulkAction(bulkActionDialog)}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Result */}
      {actionResult && (
        <div className="fixed bottom-4 right-4 max-w-sm">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-800">{actionResult}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setActionResult(null)}
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