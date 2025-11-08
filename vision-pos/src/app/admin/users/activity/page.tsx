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
  Activity, 
  ArrowLeft, 
  Filter, 
  Download,
  Users,
  TrendingUp,
  Clock,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRouter, useSearchParams } from 'next/navigation';

interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  entity?: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  locationId?: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  location?: {
    id: string;
    name: string;
  };
}

interface ActivitySummary {
  reportType: string;
  summary: {
    totalActivities: number;
    salesActivities: number;
    quoteActivities: number;
  };
  actionSummary: Array<{ action: string; _count: { id: number } }>;
  topUsers: Array<{
    userId: string;
    _count: { id: number };
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
    };
  }>;
  hourlyActivity?: Array<{ hour: string; count: number }>;
}

export default function UserActivityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Filters
  const [selectedUserId, setSelectedUserId] = useState(userId || '');
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState('daily');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  const [users, setUsers] = useState<Array<{ id: string; firstName: string; lastName: string; email: string }>>([]);

  const actionTypes = [
    { value: 'QUOTE_CREATED', label: 'Quote Created', color: 'bg-blue-100 text-blue-800' },
    { value: 'QUOTE_UPDATED', label: 'Quote Updated', color: 'bg-blue-100 text-blue-800' },
    { value: 'QUOTE_SIGNED', label: 'Quote Signed', color: 'bg-green-100 text-green-800' },
    { value: 'SALE_COMPLETED', label: 'Sale Completed', color: 'bg-green-100 text-green-800' },
    { value: 'TRANSACTION_CREATED', label: 'Transaction Created', color: 'bg-green-100 text-green-800' },
    { value: 'USER_CREATED', label: 'User Created', color: 'bg-purple-100 text-purple-800' },
    { value: 'USER_UPDATED', label: 'User Updated', color: 'bg-purple-100 text-purple-800' },
    { value: 'PASSWORD_RESET', label: 'Password Reset', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'LOGIN', label: 'User Login', color: 'bg-gray-100 text-gray-800' },
    { value: 'LOGOUT', label: 'User Logout', color: 'bg-gray-100 text-gray-800' },
  ];

  // Fetch activity logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(selectedUserId && { userId: selectedUserId }),
        ...(actionFilter && { action: actionFilter }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });

      const response = await fetch(`/api/admin/users/activity?${params}`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.data.logs);
        setTotalPages(data.data.pagination.pages);
        setTotalLogs(data.data.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch activity summary
  const fetchSummary = async () => {
    try {
      setSummaryLoading(true);
      const params = new URLSearchParams({
        reportType,
        ...(selectedUserId && { userId: selectedUserId }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });

      const response = await fetch(`/api/admin/users/activity?${params}`);
      const data = await response.json();

      if (data.success) {
        setSummary(data.data);
      }
    } catch (error) {
      console.error('Error fetching activity summary:', error);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Fetch users for filter dropdown
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users?limit=100');
      const data = await response.json();
      if (data.success) {
        setUsers(data.data.users.map((user: { id: string; firstName: string; lastName: string; email: string }) => ({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        })));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentPage, selectedUserId, actionFilter, startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchSummary();
  }, [reportType, selectedUserId, startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchUsers();
  }, []);

  // Reset filters
  const resetFilters = () => {
    setSelectedUserId('');
    setActionFilter('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const getActionBadgeColor = (action: string) => {
    const actionType = actionTypes.find(a => a.value === action);
    return actionType?.color || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const parseDetails = (details: string | null | undefined) => {
    if (!details) return null;
    try {
      return JSON.parse(details);
    } catch {
      return details;
    }
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
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
          <h1 className="text-2xl font-bold text-gray-900">User Activity Logs</h1>
          <p className="text-gray-600">Monitor user actions and system activity</p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Activities</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.summary.totalActivities}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Sales Activities</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.summary.salesActivities}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Quote Activities</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.summary.quoteActivities}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.topUsers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Activities Summary */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Activities ({reportType})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {summary.actionSummary.slice(0, 5).map((action, index) => (
                  <div key={action.action} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-medium flex items-center justify-center">
                        {index + 1}
                      </span>
                      <Badge className={getActionBadgeColor(action.action)}>
                        {actionTypes.find(a => a.value === action.action)?.label || action.action}
                      </Badge>
                    </div>
                    <span className="font-medium">{action._count.id}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Most Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {summary.topUsers.slice(0, 5).map((userActivity, index) => (
                  <div key={userActivity.userId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-green-100 text-green-800 text-xs font-medium flex items-center justify-center">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">
                          {userActivity.user?.firstName} {userActivity.user?.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{userActivity.user?.email}</p>
                      </div>
                    </div>
                    <span className="font-medium">{userActivity._count.id} activities</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Today</SelectItem>
                  <SelectItem value="weekly">This Week</SelectItem>
                  <SelectItem value="monthly">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All users</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Action</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All actions</SelectItem>
                  {actionTypes.map(action => (
                    <SelectItem key={action.value} value={action.value}>
                      {action.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
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

      {/* Activity Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Activity Logs ({totalLogs})</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={summaryLoading}>
                {summaryLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const details = parseDetails(log.details);
                
                return (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{formatDate(log.createdAt)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{log.user.firstName} {log.user.lastName}</p>
                        <p className="text-xs text-gray-500">{log.user.role}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getActionBadgeColor(log.action)}>
                        {actionTypes.find(a => a.value === log.action)?.label || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {log.entity && (
                          <p className="font-medium">{log.entity}</p>
                        )}
                        {log.entityId && (
                          <p className="text-gray-500 font-mono text-xs">{log.entityId}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        {details && typeof details === 'object' ? (
                          <div className="text-xs space-y-1">
                            {Object.entries(details).map(([key, value]) => (
                              <div key={key} className="flex gap-1">
                                <span className="font-medium">{key}:</span>
                                <span className="text-gray-600">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-600">{String(details || '-')}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{log.location?.name || '-'}</span>
                    </TableCell>
                  </TableRow>
                );
              })}
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
    </div>
  );
}