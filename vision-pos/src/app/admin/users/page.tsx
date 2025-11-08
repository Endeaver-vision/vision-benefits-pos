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
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  UserX, 
  UserCheck, 
  Key,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  CheckCircle,
  RefreshCw,
  Activity,
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

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  locationId: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  locations: {
    id: string;
    name: string;
  };
  _count: {
    quotes: number;
    transactions: number;
  };
}

interface Location {
  id: string;
  name: string;
}

interface UserStats {
  total: number;
  active: number;
  roles: Array<{ role: string; _count: { id: number } }>;
  locations: Array<{ locationId: string; _count: { id: number } }>;
}

export default function UserManagementPage() {
  const router = useRouter();
  
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  
  // Modals and Actions
  const [bulkActionDialog, setBulkActionDialog] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);

  const roles = [
    { value: 'ADMIN', label: 'Administrator' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'SALES_ASSOCIATE', label: 'Sales Associate' },
    { value: 'TECHNICIAN', label: 'Technician' },
  ];

  // Fetch users data
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(roleFilter && roleFilter !== 'all' && { role: roleFilter }),
        ...(locationFilter && locationFilter !== 'all' && { locationId: locationFilter }),
        ...(activeFilter && activeFilter !== 'all' && { active: activeFilter }),
      });

      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();

      if (data.success) {
        setUsers(data.data.users);
        setStats(data.data.stats);
        setTotalPages(data.data.pagination.pages);
        setTotalUsers(data.data.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch locations
  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations');
      const data = await response.json();
      if (data.success) {
        setLocations(data.data);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm, roleFilter, locationFilter, activeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchLocations();
  }, []);

  // Handle user selection
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    setSelectedUsers(
      selectedUsers.length === users.length
        ? []
        : users.map(user => user.id)
    );
  };

  // Handle bulk actions
  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) return;

    try {
      setActionLoading(true);
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userIds: selectedUsers,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setActionResult(`${action} completed successfully`);
        fetchUsers();
        setSelectedUsers([]);
        
        // Show passwords for reset action
        if (action === 'resetPassword' && data.data.results) {
          const passwordResults = data.data.results
            .filter(r => r.newPassword)
            .map(r => `${r.id}: ${r.newPassword}`)
            .join('\\n');
          
          if (passwordResults) {
            alert(`New passwords:\\n${passwordResults}`);
          }
        }
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
    setRoleFilter('all');
    setLocationFilter('all');
    setActiveFilter('all');
    setCurrentPage(1);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-800';
      case 'SALES_ASSOCIATE':
        return 'bg-green-100 text-green-800';
      case 'TECHNICIAN':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && users.length === 0) {
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
            className="text-neutral-600 hover:text-purple-600"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="h-6 w-px bg-neutral-300" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">Manage system users, roles, and permissions</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/users/activity')}
          >
            <Activity className="h-4 w-4 mr-2" />
            Activity Logs
          </Button>
          <Button onClick={() => router.push('/admin/users/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <UserCheck className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <UserX className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Inactive Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total - stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Key className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Admins</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.roles.find(r => r.role === 'ADMIN')?._count.id || 0}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label>Role</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {roles.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Location</Label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {locations.map(location => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
      {selectedUsers.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-800">
                {selectedUsers.length} user(s) selected
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBulkActionDialog('activate')}
                >
                  <UserCheck className="h-4 w-4 mr-1" />
                  Activate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBulkActionDialog('deactivate')}
                >
                  <UserX className="h-4 w-4 mr-1" />
                  Deactivate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBulkActionDialog('resetPassword')}
                >
                  <Key className="h-4 w-4 mr-1" />
                  Reset Password
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

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Users ({totalUsers})</CardTitle>
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
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onCheckedChange={selectAllUsers}
                  />
                </TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => toggleUserSelection(user.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.firstName} {user.lastName}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeColor(user.role)}>
                      {roles.find(r => r.value === user.role)?.label || user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.locations.name}</TableCell>
                  <TableCell>
                    <Badge variant={user.active ? 'default' : 'secondary'}>
                      {user.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{user._count.quotes} quotes</div>
                      <div>{user._count.transactions} sales</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-500">
                      {user.lastLoginAt 
                        ? new Date(user.lastLoginAt).toLocaleDateString()
                        : 'Never'
                      }
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
                        <DropdownMenuItem onClick={() => router.push(`/admin/users/${user.id}`)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit User
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/admin/users/activity?userId=${user.id}`)}>
                          <Activity className="h-4 w-4 mr-2" />
                          View Activity
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setBulkActionDialog('resetPassword')}>
                          <Key className="h-4 w-4 mr-2" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setBulkActionDialog(user.active ? 'deactivate' : 'activate')}
                        >
                          {user.active ? (
                            <>
                              <UserX className="h-4 w-4 mr-2" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4 mr-2" />
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
              Confirm {bulkActionDialog === 'resetPassword' ? 'Password Reset' : 
                      bulkActionDialog === 'activate' ? 'User Activation' :
                      bulkActionDialog === 'deactivate' ? 'User Deactivation' :
                      'User Deletion'}
            </DialogTitle>
            <DialogDescription>
              {bulkActionDialog === 'resetPassword' && 
                'This will reset passwords for selected users and generate new temporary passwords.'
              }
              {bulkActionDialog === 'activate' && 
                'This will activate the selected users, allowing them to log in.'
              }
              {bulkActionDialog === 'deactivate' && 
                'This will deactivate the selected users, preventing them from logging in.'
              }
              {bulkActionDialog === 'delete' && 
                'This will permanently delete the selected users. This action cannot be undone.'
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