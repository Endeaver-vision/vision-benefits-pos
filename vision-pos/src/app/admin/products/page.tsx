/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  Trash2,
  Filter,
  RefreshCw,
  Package,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Download,
  Upload,
  ArrowLeft
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Product {
  id: string;
  name: string;
  sku: string | null;
  manufacturer: string | null;
  basePrice: number;
  tierVsp: string | null;
  tierEyemed: string | null;
  tierSpectera: string | null;
  active: boolean;
  categoryName: string;
  totalInventory: number;
  availableLocations: number;
  inventoryStatus: string;
  createdAt: string;
  updatedAt: string;
  product_categories: {
    id: string;
    name: string;
  };
}

interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  totalCategories: number;
  outOfStock: number;
  lowStock: number;
}

interface Category {
  id: string;
  name: string;
  _count: {
    products: number;
  };
}

interface Location {
  id: string;
  name: string;
  address: string;
}

interface BulkDialogData {
  isOpen: boolean;
  operation: string;
  title: string;
  description: string;
  data?: any;
}

export default function AdminProductList() {
  const router = useRouter();
  
  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  
  // Pagination and sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Bulk operations
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [bulkDialog, setBulkDialog] = useState<BulkDialogData>({
    isOpen: false,
    operation: '',
    title: '',
    description: ''
  });

  // Fetch products with filters
  const fetchProducts = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy,
        sortOrder,
        ...(searchTerm && { search: searchTerm }),
        ...(categoryFilter !== 'ALL' && { categoryId: categoryFilter }),
        ...(locationFilter !== 'ALL' && { locationId: locationFilter }),
        ...(statusFilter !== 'ALL' && { active: statusFilter }),
        ...(priceMin && { priceMin }),
        ...(priceMax && { priceMax })
      });

      const response = await fetch(`/api/admin/products?${params}`);
      const data = await response.json();

      if (response.ok) {
        setProducts(data.products);
        setTotalPages(data.pagination.totalPages);
        setCurrentPage(data.pagination.currentPage);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stats' })
      });
      const data = await response.json();
      
      if (response.ok) {
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  // Fetch reference data
  const fetchReferenceData = async () => {
    try {
      const [categoriesRes, locationsRes] = await Promise.all([
        fetch('/api/admin/products/reference?type=categories'),
        fetch('/api/admin/products/reference?type=locations')
      ]);

      const [categoriesData, locationsData] = await Promise.all([
        categoriesRes.json(),
        locationsRes.json()
      ]);

      if (categoriesRes.ok) setCategories(categoriesData);
      if (locationsRes.ok) setLocations(locationsData);
    } catch (error) {
      console.error('Error fetching reference data:', error);
    }
  };

  // Handle product selection
  const handleProductSelect = (productId: string, isSelected: boolean) => {
    const newSelection = new Set(selectedProducts);
    if (isSelected) {
      newSelection.add(productId);
    } else {
      newSelection.delete(productId);
    }
    setSelectedProducts(newSelection);
  };

  // Handle select all/none
  const handleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)));
    }
  };

  // Handle bulk operations
  const handleBulkOperation = (operation: string) => {
    if (selectedProducts.size === 0) return;

    const operations = {
      activate: {
        title: 'Activate Products',
        description: `Are you sure you want to activate ${selectedProducts.size} selected products?`
      },
      deactivate: {
        title: 'Deactivate Products',
        description: `Are you sure you want to deactivate ${selectedProducts.size} selected products?`
      },
      delete: {
        title: 'Delete Products',
        description: `Are you sure you want to permanently delete ${selectedProducts.size} selected products? This action cannot be undone.`
      }
    };

    const opData = operations[operation as keyof typeof operations];
    if (opData) {
      setBulkDialog({
        isOpen: true,
        operation,
        title: opData.title,
        description: opData.description
      });
    }
  };

  // Execute bulk operation
  const executeBulkOperation = async () => {
    if (!bulkDialog.operation || selectedProducts.size === 0) return;

    try {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk',
          productIds: Array.from(selectedProducts),
          operation: bulkDialog.operation,
          data: bulkDialog.data
        })
      });

      if (response.ok) {
        // Refresh data
        fetchProducts(currentPage);
        fetchStats();
        setSelectedProducts(new Set());
        setBulkDialog({ isOpen: false, operation: '', title: '', description: '' });
      }
    } catch (error) {
      console.error('Error executing bulk operation:', error);
    }
  };

  // Handle sorting
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/products/import-export?type=products');
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `products_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting products:', error);
    }
  };

  // Initialize component
  useEffect(() => {
    fetchProducts();
    fetchStats();
    fetchReferenceData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle filter changes
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      fetchProducts(1);
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, categoryFilter, locationFilter, statusFilter, priceMin, priceMax, sortBy, sortOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/dashboard')}
            className="text-neutral-600 hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="h-6 w-px bg-neutral-300" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
            <p className="text-gray-600 mt-1">Manage your product catalog, inventory, and pricing</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push('/admin/products/import-export')}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button 
            onClick={() => router.push('/admin/products/new')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-green-600">{stats.activeProducts}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Inactive</p>
                  <p className="text-2xl font-bold text-red-600">{stats.inactiveProducts}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Categories</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCategories}</p>
                </div>
                <Filter className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.outOfStock}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Low Stock</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.lowStock}</p>
                </div>
                <DollarSign className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name} ({category._count.products})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Location Filter */}
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Locations</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>

            {/* Price Range */}
            <div className="flex gap-2">
              <Input
                placeholder="Min $"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                type="number"
                step="0.01"
              />
              <Input
                placeholder="Max $"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                type="number"
                step="0.01"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedProducts.size > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="font-medium text-blue-900">
                  {selectedProducts.size} products selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedProducts(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkOperation('activate')}
                >
                  Activate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkOperation('deactivate')}
                >
                  Deactivate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkOperation('delete')}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Products</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchProducts(currentPage);
                fetchStats();
              }}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedProducts.size === products.length && products.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('name')}
                    >
                      Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('basePrice')}
                    >
                      Price {sortBy === 'basePrice' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Inventory</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedProducts.has(product.id)}
                          onCheckedChange={(checked) => 
                            handleProductSelect(product.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-gray-500">
                            {product.availableLocations} locations
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {product.sku || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {product.categoryName}
                        </Badge>
                      </TableCell>
                      <TableCell>{product.manufacturer || 'N/A'}</TableCell>
                      <TableCell className="font-medium">
                        ${product.basePrice.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{product.totalInventory}</span>
                          <Badge 
                            variant={product.inventoryStatus === 'In Stock' ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {product.inventoryStatus}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.active ? 'default' : 'secondary'}>
                          {product.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/admin/products/${product.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => fetchProducts(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-4 text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => fetchProducts(currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Operation Dialog */}
      <Dialog open={bulkDialog.isOpen} onOpenChange={(open) => {
        if (!open) {
          setBulkDialog({ isOpen: false, operation: '', title: '', description: '' });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{bulkDialog.title}</DialogTitle>
            <DialogDescription>
              {bulkDialog.description}
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setBulkDialog({ isOpen: false, operation: '', title: '', description: '' })}
            >
              Cancel
            </Button>
            <Button 
              onClick={executeBulkOperation}
              variant={bulkDialog.operation === 'delete' ? 'destructive' : 'default'}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}