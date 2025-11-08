'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  Trophy,
  Medal,
  Star,
  TrendingUp,
  DollarSign,
  Target,
  Users,
  Calendar,
  Filter,
  Search,
  Award,
  Crown,
  Zap,
  Eye,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';
import AchievementBadgesSystem from '@/components/analytics/AchievementBadgesSystem';
import Sparkline from '@/components/ui/sparkline';

// Define types for leaderboard data
interface StaffMember {
  rank: number;
  staffId: string;
  name: string;
  salesCount: number;
  revenue: number;
  conversionRate: number;
  captureRate: number;
  change: string;
  trend: 'up' | 'down' | 'stable';
  avatar: string;
  achievements: string[];
  sparklineData?: Array<{ value: number }>;
}

// Mock data - in real app this would come from API
const mockLeaderboardData = {
  salesCount: [
    { rank: 1, staffId: '1', name: 'Sarah Johnson', salesCount: 42, revenue: 125000, conversionRate: 78.5, captureRate: 85.2, change: '+5', trend: 'up' as const, avatar: 'SJ', achievements: ['top-seller', 'conversion-master'], sparklineData: [{ value: 35 }, { value: 38 }, { value: 41 }, { value: 42 }] },
    { rank: 2, staffId: '2', name: 'Mike Chen', salesCount: 38, revenue: 118000, conversionRate: 72.1, captureRate: 81.3, change: '+2', trend: 'up' as const, avatar: 'MC', achievements: ['revenue-leader'], sparklineData: [{ value: 32 }, { value: 35 }, { value: 36 }, { value: 38 }] },
    { rank: 3, staffId: '3', name: 'Emily Davis', salesCount: 35, revenue: 102000, conversionRate: 69.8, captureRate: 79.5, change: '-1', trend: 'down' as const, avatar: 'ED', achievements: ['consistent-performer'], sparklineData: [{ value: 36 }, { value: 37 }, { value: 36 }, { value: 35 }] },
    { rank: 4, staffId: '4', name: 'Alex Rodriguez', salesCount: 33, revenue: 95000, conversionRate: 68.2, captureRate: 77.8, change: '+3', trend: 'up' as const, avatar: 'AR', achievements: [], sparklineData: [{ value: 28 }, { value: 30 }, { value: 31 }, { value: 33 }] },
    { rank: 5, staffId: '5', name: 'Jessica Wang', salesCount: 31, revenue: 89000, conversionRate: 66.5, captureRate: 75.2, change: '0', trend: 'stable' as const, avatar: 'JW', achievements: ['team-player'], sparklineData: [{ value: 31 }, { value: 30 }, { value: 31 }, { value: 31 }] },
    { rank: 6, staffId: '6', name: 'David Brown', salesCount: 29, revenue: 82000, conversionRate: 64.8, captureRate: 72.6, change: '-2', trend: 'down' as const, avatar: 'DB', achievements: [], sparklineData: [{ value: 32 }, { value: 31 }, { value: 30 }, { value: 29 }] },
    { rank: 7, staffId: '7', name: 'Lisa Thompson', salesCount: 27, revenue: 78000, conversionRate: 62.3, captureRate: 70.1, change: '+1', trend: 'up' as const, avatar: 'LT', achievements: ['newcomer'], sparklineData: [{ value: 24 }, { value: 25 }, { value: 26 }, { value: 27 }] },
    { rank: 8, staffId: '8', name: 'Robert Wilson', salesCount: 25, revenue: 71000, conversionRate: 60.5, captureRate: 68.4, change: '-3', trend: 'down' as const, avatar: 'RW', achievements: [], sparklineData: [{ value: 28 }, { value: 27 }, { value: 26 }, { value: 25 }] },
  ],
  teams: [
    { rank: 1, teamName: 'Alpha Squad', members: 4, totalSales: 145, totalRevenue: 425000, avgConversion: 74.2, avgCapture: 81.5 },
    { rank: 2, teamName: 'Beta Force', members: 3, totalSales: 112, totalRevenue: 328000, avgConversion: 71.8, avgCapture: 78.9 },
    { rank: 3, teamName: 'Gamma Elite', members: 5, totalSales: 98, totalRevenue: 287000, avgConversion: 68.5, avgCapture: 76.2 },
  ]
};

const mockPeriodOptions = [
  { value: 'this-week', label: 'This Week' },
  { value: 'this-month', label: 'This Month' },
  { value: 'this-quarter', label: 'This Quarter' },
  { value: 'this-year', label: 'This Year' },
  { value: 'last-30-days', label: 'Last 30 Days' },
  { value: 'last-90-days', label: 'Last 90 Days' },
];

export default function LeaderboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('this-month');
  const [selectedMetric, setSelectedMetric] = useState('salesCount');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('individual');

  // Filter leaderboard data based on search
  const filteredLeaderboard: StaffMember[] = mockLeaderboardData.salesCount.filter(staff =>
    staff.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort leaderboard based on selected metric
  const sortedLeaderboard: StaffMember[] = [...filteredLeaderboard].sort((a, b) => {
    switch (selectedMetric) {
      case 'revenue':
        return b.revenue - a.revenue;
      case 'conversionRate':
        return b.conversionRate - a.conversionRate;
      case 'captureRate':
        return b.captureRate - a.captureRate;
      default:
        return b.salesCount - a.salesCount;
    }
  }).map((staff, index) => ({ ...staff, rank: index + 1 }));

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-2xl font-bold text-gray-400">#{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-500';
    if (rank === 3) return 'bg-gradient-to-r from-amber-400 to-amber-600';
    return 'bg-gradient-to-r from-blue-400 to-blue-600';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
    return <div className="h-4 w-4 rounded-full bg-gray-300"></div>;
  };

  const getAchievementBadge = (achievement: string) => {
    const badges = {
      'top-seller': { icon: <Trophy className="h-3 w-3" />, label: 'Top Seller', color: 'bg-yellow-100 text-yellow-800' },
      'conversion-master': { icon: <Target className="h-3 w-3" />, label: 'Conversion Master', color: 'bg-green-100 text-green-800' },
      'revenue-leader': { icon: <DollarSign className="h-3 w-3" />, label: 'Revenue Leader', color: 'bg-blue-100 text-blue-800' },
      'consistent-performer': { icon: <Star className="h-3 w-3" />, label: 'Consistent', color: 'bg-purple-100 text-purple-800' },
      'team-player': { icon: <Users className="h-3 w-3" />, label: 'Team Player', color: 'bg-orange-100 text-orange-800' },
      'newcomer': { icon: <Zap className="h-3 w-3" />, label: 'Newcomer', color: 'bg-pink-100 text-pink-800' },
    };
    
    const badge = badges[achievement as keyof typeof badges];
    if (!badge) return null;
    
    return (
      <Badge className={`text-xs ${badge.color} flex items-center gap-1`}>
        {badge.icon}
        {badge.label}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Staff Leaderboards
          </h1>
          <p className="text-gray-600 mt-2">
            Track performance, celebrate achievements, and drive healthy competition
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/analytics/leaderboards/my-performance">
            <Button variant="outline" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              My Performance
            </Button>
          </Link>
          <Button className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            View Analytics Dashboard
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search staff members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-48">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mockPeriodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salesCount">Sales Count</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="conversionRate">Conversion Rate</SelectItem>
                  <SelectItem value="captureRate">Capture Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="individual">Individual Performance</TabsTrigger>
          <TabsTrigger value="teams">Team Performance</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        {/* Individual Leaderboard */}
        <TabsContent value="individual" className="space-y-6">
          {/* Top 3 Podium */}
          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                Top Performers
              </CardTitle>
              <CardDescription>This month&apos;s champions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {sortedLeaderboard.slice(0, 3).map((staff, index) => (
                  <div
                    key={staff.staffId}
                    className={`text-center p-6 rounded-lg border-2 transform transition-all hover:scale-105 ${
                      index === 0 
                        ? 'bg-gradient-to-br from-yellow-100 to-yellow-200 border-yellow-300 shadow-lg' 
                        : index === 1
                        ? 'bg-gradient-to-br from-gray-100 to-gray-200 border-gray-300 shadow-md'
                        : 'bg-gradient-to-br from-amber-100 to-amber-200 border-amber-300 shadow-md'
                    }`}
                  >
                    {/* Rank Icon */}
                    <div className="flex justify-center mb-4">
                      {getRankIcon(staff.rank)}
                    </div>
                    
                    {/* Avatar */}
                    <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center text-white font-bold text-lg ${getRankBadgeColor(staff.rank)}`}>
                      {staff.avatar}
                    </div>
                    
                    {/* Name and Rank */}
                    <h3 className="font-bold text-lg text-gray-900 mb-1">{staff.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">Rank #{staff.rank}</p>
                    
                    {/* Key Metrics */}
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span>Sales:</span>
                        <span className="font-semibold">{staff.salesCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Revenue:</span>
                        <span className="font-semibold">{formatCurrency(staff.revenue)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Conversion:</span>
                        <span className="font-semibold">{formatPercentage(staff.conversionRate)}</span>
                      </div>
                    </div>
                    
                    {/* Achievements */}
                    <div className="flex flex-wrap gap-1 justify-center">
                      {staff.achievements.map((achievement) => 
                        getAchievementBadge(achievement)
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Full Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Full Leaderboard</span>
                <Badge variant="secondary">{sortedLeaderboard.length} members</Badge>
              </CardTitle>
              <CardDescription>
                Ranked by {selectedMetric.replace(/([A-Z])/g, ' $1').toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sortedLeaderboard.map((staff) => (
                  <Link key={staff.staffId} href={`/analytics/leaderboards/staff/${staff.staffId}`}>
                    <div className={`p-4 rounded-lg border hover:shadow-lg transition-all cursor-pointer ${
                      staff.rank <= 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200' : 'bg-white border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {/* Rank */}
                          <div className="flex items-center space-x-2">
                            {staff.rank <= 3 ? getRankIcon(staff.rank) : (
                              <span className="text-lg font-bold text-gray-500 min-w-[2rem]">#{staff.rank}</span>
                            )}
                          </div>
                          
                          {/* Avatar */}
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${getRankBadgeColor(staff.rank)}`}>
                            {staff.avatar}
                          </div>
                          
                          {/* Name and Change */}
                          <div>
                            <h4 className="font-semibold text-gray-900">{staff.name}</h4>
                            <div className="flex items-center space-x-2">
                              {getTrendIcon(staff.trend)}
                              <span className={`text-sm font-medium ${
                                staff.trend === 'up' ? 'text-green-600' : 
                                staff.trend === 'down' ? 'text-red-600' : 
                                'text-gray-600'
                              }`}>
                                {staff.change !== '0' && (staff.trend === 'up' ? '+' : '')}{staff.change} positions
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Metrics */}
                        <div className="flex items-center space-x-8 text-right">
                          <div>
                            <p className="text-sm text-gray-600">Sales</p>
                            <p className="font-bold text-lg">{staff.salesCount}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Revenue</p>
                            <p className="font-bold text-lg">{formatCurrency(staff.revenue)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Conversion</p>
                            <p className="font-bold text-lg">{formatPercentage(staff.conversionRate)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Capture</p>
                            <p className="font-bold text-lg">{formatPercentage(staff.captureRate)}</p>
                          </div>
                          
                          {/* Sparkline */}
                          <div className="w-24">
                            <p className="text-sm text-gray-600 mb-1">Trend</p>
                            <Sparkline 
                              data={staff.sparklineData || []} 
                              color={staff.trend === 'up' ? '#10b981' : staff.trend === 'down' ? '#ef4444' : '#6b7280'}
                              height={30}
                            />
                          </div>
                        </div>
                        
                        {/* Achievements */}
                        <div className="flex flex-col items-end space-y-1">
                          {staff.achievements.slice(0, 2).map((achievement) => 
                            getAchievementBadge(achievement)
                          )}
                          {staff.achievements.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{staff.achievements.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Leaderboard */}
        <TabsContent value="teams" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Performance
              </CardTitle>
              <CardDescription>
                Competition between teams and departments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockLeaderboardData.teams.map((team) => (
                  <div key={team.teamName} className={`p-6 rounded-lg border ${
                    team.rank === 1 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200' : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {team.rank <= 3 ? getRankIcon(team.rank) : (
                            <span className="text-xl font-bold text-gray-500">#{team.rank}</span>
                          )}
                        </div>
                        
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">{team.teamName}</h3>
                          <p className="text-sm text-gray-600">{team.members} members</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-8 text-right">
                        <div>
                          <p className="text-sm text-gray-600">Total Sales</p>
                          <p className="font-bold text-xl">{team.totalSales}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Revenue</p>
                          <p className="font-bold text-xl">{formatCurrency(team.totalRevenue)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Avg Conversion</p>
                          <p className="font-bold text-xl">{formatPercentage(team.avgConversion)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Avg Capture</p>
                          <p className="font-bold text-xl">{formatPercentage(team.avgCapture)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-6">
          <AchievementBadgesSystem />
        </TabsContent>
      </Tabs>
    </div>
  );
}