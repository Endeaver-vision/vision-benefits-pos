'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy,
  Star,
  Medal,
  Award,
  Crown,
  Target,
  DollarSign,
  Users,
  Zap,
  CheckCircle2,
  BarChart3,
  Flame,
  Shield,
  Rocket,
  Heart,
  Gift,
  Sparkles,
  Clock,
  Layers
} from 'lucide-react';

// Achievement Types and Definitions
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'sales' | 'revenue' | 'conversion' | 'consistency' | 'teamwork' | 'milestone' | 'special';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  points: number;
  requirement: {
    type: 'count' | 'percentage' | 'streak' | 'total' | 'rank' | 'timeframe';
    value: number;
    period?: string;
  };
  progress?: {
    current: number;
    target: number;
  };
  unlockedAt?: Date;
  isUnlocked: boolean;
  isNew?: boolean;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

// Mock Achievement Data
const mockAchievements: Achievement[] = [
  // Sales Achievements
  {
    id: 'first-sale',
    name: 'First Steps',
    description: 'Complete your first sale',
    icon: <CheckCircle2 className="h-6 w-6" />,
    category: 'sales',
    tier: 'bronze',
    points: 10,
    requirement: { type: 'count', value: 1 },
    progress: { current: 42, target: 1 },
    unlockedAt: new Date('2024-10-01'),
    isUnlocked: true,
    rarity: 'common'
  },
  {
    id: 'sales-rookie',
    name: 'Sales Rookie',
    description: 'Complete 10 sales in a month',
    icon: <Star className="h-6 w-6" />,
    category: 'sales',
    tier: 'bronze',
    points: 25,
    requirement: { type: 'count', value: 10, period: 'month' },
    progress: { current: 42, target: 10 },
    unlockedAt: new Date('2024-10-05'),
    isUnlocked: true,
    rarity: 'common'
  },
  {
    id: 'sales-pro',
    name: 'Sales Professional',
    description: 'Complete 25 sales in a month',
    icon: <Medal className="h-6 w-6" />,
    category: 'sales',
    tier: 'silver',
    points: 50,
    requirement: { type: 'count', value: 25, period: 'month' },
    progress: { current: 42, target: 25 },
    unlockedAt: new Date('2024-10-15'),
    isUnlocked: true,
    rarity: 'uncommon'
  },
  {
    id: 'sales-master',
    name: 'Sales Master',
    description: 'Complete 40+ sales in a month',
    icon: <Trophy className="h-6 w-6" />,
    category: 'sales',
    tier: 'gold',
    points: 100,
    requirement: { type: 'count', value: 40, period: 'month' },
    progress: { current: 42, target: 40 },
    unlockedAt: new Date('2024-11-02'),
    isUnlocked: true,
    isNew: true,
    rarity: 'rare'
  },
  {
    id: 'sales-legend',
    name: 'Sales Legend',
    description: 'Complete 50+ sales in a month',
    icon: <Crown className="h-6 w-6" />,
    category: 'sales',
    tier: 'platinum',
    points: 200,
    requirement: { type: 'count', value: 50, period: 'month' },
    progress: { current: 42, target: 50 },
    isUnlocked: false,
    rarity: 'epic'
  },

  // Revenue Achievements
  {
    id: 'revenue-starter',
    name: 'Revenue Starter',
    description: 'Generate $50,000 in monthly revenue',
    icon: <DollarSign className="h-6 w-6" />,
    category: 'revenue',
    tier: 'bronze',
    points: 30,
    requirement: { type: 'total', value: 50000, period: 'month' },
    progress: { current: 125000, target: 50000 },
    unlockedAt: new Date('2024-10-08'),
    isUnlocked: true,
    rarity: 'common'
  },
  {
    id: 'revenue-champion',
    name: 'Revenue Champion',
    description: 'Generate $100,000+ in monthly revenue',
    icon: <Award className="h-6 w-6" />,
    category: 'revenue',
    tier: 'gold',
    points: 150,
    requirement: { type: 'total', value: 100000, period: 'month' },
    progress: { current: 125000, target: 100000 },
    unlockedAt: new Date('2024-10-20'),
    isUnlocked: true,
    rarity: 'rare'
  },

  // Conversion Achievements
  {
    id: 'conversion-ace',
    name: 'Conversion Ace',
    description: 'Achieve 75%+ conversion rate',
    icon: <Target className="h-6 w-6" />,
    category: 'conversion',
    tier: 'silver',
    points: 75,
    requirement: { type: 'percentage', value: 75 },
    progress: { current: 78.5, target: 75 },
    unlockedAt: new Date('2024-10-25'),
    isUnlocked: true,
    rarity: 'uncommon'
  },
  {
    id: 'conversion-master',
    name: 'Conversion Master',
    description: 'Maintain 80%+ conversion for a week',
    icon: <Flame className="h-6 w-6" />,
    category: 'conversion',
    tier: 'gold',
    points: 125,
    requirement: { type: 'streak', value: 7, period: 'week' },
    progress: { current: 5, target: 7 },
    isUnlocked: false,
    rarity: 'rare'
  },

  // Consistency Achievements
  {
    id: 'consistent-performer',
    name: 'Consistent Performer',
    description: 'Meet daily targets for 7 days straight',
    icon: <Shield className="h-6 w-6" />,
    category: 'consistency',
    tier: 'silver',
    points: 60,
    requirement: { type: 'streak', value: 7 },
    progress: { current: 7, target: 7 },
    unlockedAt: new Date('2024-10-18'),
    isUnlocked: true,
    rarity: 'uncommon'
  },
  {
    id: 'reliable-superstar',
    name: 'Reliable Superstar',
    description: 'Meet daily targets for 30 days straight',
    icon: <Sparkles className="h-6 w-6" />,
    category: 'consistency',
    tier: 'platinum',
    points: 250,
    requirement: { type: 'streak', value: 30 },
    progress: { current: 18, target: 30 },
    isUnlocked: false,
    rarity: 'epic'
  },

  // Teamwork Achievements
  {
    id: 'team-player',
    name: 'Team Player',
    description: 'Help 5 team members reach their goals',
    icon: <Users className="h-6 w-6" />,
    category: 'teamwork',
    tier: 'bronze',
    points: 40,
    requirement: { type: 'count', value: 5 },
    progress: { current: 3, target: 5 },
    isUnlocked: false,
    rarity: 'common'
  },
  {
    id: 'mentor-master',
    name: 'Mentor Master',
    description: 'Train a new team member to their first sale',
    icon: <Heart className="h-6 w-6" />,
    category: 'teamwork',
    tier: 'gold',
    points: 100,
    requirement: { type: 'count', value: 1 },
    progress: { current: 1, target: 1 },
    unlockedAt: new Date('2024-10-30'),
    isUnlocked: true,
    rarity: 'rare'
  },

  // Milestone Achievements
  {
    id: 'top-performer',
    name: 'Top Performer',
    description: 'Reach #1 on leaderboard',
    icon: <Crown className="h-6 w-6" />,
    category: 'milestone',
    tier: 'gold',
    points: 200,
    requirement: { type: 'rank', value: 1 },
    progress: { current: 1, target: 1 },
    unlockedAt: new Date('2024-11-01'),
    isUnlocked: true,
    isNew: true,
    rarity: 'epic'
  },
  {
    id: 'rising-star',
    name: 'Rising Star',
    description: 'Move up 5+ positions in one week',
    icon: <Rocket className="h-6 w-6" />,
    category: 'milestone',
    tier: 'silver',
    points: 75,
    requirement: { type: 'count', value: 5, period: 'week' },
    progress: { current: 5, target: 5 },
    unlockedAt: new Date('2024-10-22'),
    isUnlocked: true,
    rarity: 'uncommon'
  },

  // Special Achievements
  {
    id: 'early-bird',
    name: 'Early Bird',
    description: 'Complete first sale before 9 AM for 5 days',
    icon: <Clock className="h-6 w-6" />,
    category: 'special',
    tier: 'bronze',
    points: 35,
    requirement: { type: 'streak', value: 5 },
    progress: { current: 2, target: 5 },
    isUnlocked: false,
    rarity: 'common'
  },
  {
    id: 'deal-closer',
    name: 'Deal Closer',
    description: 'Close 3 deals in one day',
    icon: <Zap className="h-6 w-6" />,
    category: 'special',
    tier: 'silver',
    points: 80,
    requirement: { type: 'count', value: 3, period: 'day' },
    progress: { current: 4, target: 3 },
    unlockedAt: new Date('2024-11-05'),
    isUnlocked: true,
    isNew: true,
    rarity: 'uncommon'
  }
];

export default function AchievementBadgesSystem() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  
  // Calculate total stats
  const unlockedAchievements = mockAchievements.filter(a => a.isUnlocked);
  const totalPoints = unlockedAchievements.reduce((sum, a) => sum + a.points, 0);
  const completionPercentage = (unlockedAchievements.length / mockAchievements.length) * 100;
  const newAchievements = mockAchievements.filter(a => a.isNew);

  // Filter achievements
  const filteredAchievements = mockAchievements.filter(achievement => {
    const categoryMatch = selectedCategory === 'all' || achievement.category === selectedCategory;
    const tierMatch = selectedTier === 'all' || achievement.tier === selectedTier;
    return categoryMatch && tierMatch;
  });

  // Get tier colors
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'from-amber-600 to-amber-800';
      case 'silver': return 'from-gray-400 to-gray-600';
      case 'gold': return 'from-yellow-400 to-yellow-600';
      case 'platinum': return 'from-blue-400 to-blue-600';
      case 'diamond': return 'from-purple-400 to-purple-600';
      default: return 'from-gray-300 to-gray-500';
    }
  };

  // Get rarity colors
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-gray-300 bg-gray-50';
      case 'uncommon': return 'border-green-300 bg-green-50';
      case 'rare': return 'border-blue-300 bg-blue-50';
      case 'epic': return 'border-purple-300 bg-purple-50';
      case 'legendary': return 'border-yellow-300 bg-yellow-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'sales': return <BarChart3 className="h-4 w-4" />;
      case 'revenue': return <DollarSign className="h-4 w-4" />;
      case 'conversion': return <Target className="h-4 w-4" />;
      case 'consistency': return <Shield className="h-4 w-4" />;
      case 'teamwork': return <Users className="h-4 w-4" />;
      case 'milestone': return <Trophy className="h-4 w-4" />;
      case 'special': return <Sparkles className="h-4 w-4" />;
      default: return <Award className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Achievement Stats Header */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-yellow-600" />
            Achievement System
            {newAchievements.length > 0 && (
              <Badge className="bg-red-500 text-white animate-pulse">
                {newAchievements.length} New!
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Track your progress and unlock rewards for exceptional performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{unlockedAchievements.length}</div>
              <div className="text-sm text-gray-600">Achievements Unlocked</div>
              <div className="text-xs text-gray-500">of {mockAchievements.length} total</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{totalPoints}</div>
              <div className="text-sm text-gray-600">Points Earned</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{completionPercentage.toFixed(0)}%</div>
              <div className="text-sm text-gray-600">Completion</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {unlockedAchievements.filter(a => a.tier === 'gold' || a.tier === 'platinum').length}
              </div>
              <div className="text-sm text-gray-600">Elite Badges</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Overall Progress</span>
              <span>{completionPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={completionPercentage} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* New Achievements Alert */}
      {newAchievements.length > 0 && (
        <Card className="border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <Gift className="h-5 w-5" />
              New Achievements Unlocked!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {newAchievements.map((achievement) => (
                <div 
                  key={achievement.id}
                  className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-yellow-200 animate-pulse"
                >
                  <div className={`p-2 rounded-full bg-gradient-to-r ${getTierColor(achievement.tier)} text-white`}>
                    {achievement.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{achievement.name}</h4>
                    <p className="text-sm text-gray-600">+{achievement.points} points</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Category:</span>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                >
                  All
                </Button>
                {['sales', 'revenue', 'conversion', 'consistency', 'teamwork', 'milestone', 'special'].map(category => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="flex items-center gap-1"
                  >
                    {getCategoryIcon(category)}
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Tier:</span>
              <div className="flex gap-2">
                <Button
                  variant={selectedTier === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTier('all')}
                >
                  All Tiers
                </Button>
                {['bronze', 'silver', 'gold', 'platinum'].map(tier => (
                  <Button
                    key={tier}
                    variant={selectedTier === tier ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedTier(tier)}
                  >
                    {tier.charAt(0).toUpperCase() + tier.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievement Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAchievements.map((achievement) => (
          <Card 
            key={achievement.id}
            className={`relative transition-all hover:shadow-lg ${
              achievement.isUnlocked ? getRarityColor(achievement.rarity) : 'border-gray-200 bg-gray-50 opacity-60'
            } ${achievement.isNew ? 'ring-2 ring-yellow-400 ring-opacity-50' : ''}`}
          >
            {achievement.isNew && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-bounce">
                NEW!
              </div>
            )}
            
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Achievement Header */}
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-full bg-gradient-to-r ${getTierColor(achievement.tier)} ${
                    achievement.isUnlocked ? 'text-white' : 'text-gray-400 opacity-50'
                  }`}>
                    {achievement.icon}
                  </div>
                  
                  <div className="flex flex-col items-end space-y-1">
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${achievement.isUnlocked ? '' : 'opacity-50'}`}
                    >
                      {achievement.tier.toUpperCase()}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getCategoryIcon(achievement.category)} flex items-center gap-1`}
                    >
                      {getCategoryIcon(achievement.category)}
                      {achievement.category}
                    </Badge>
                  </div>
                </div>

                {/* Achievement Info */}
                <div>
                  <h3 className={`font-bold text-lg ${achievement.isUnlocked ? 'text-gray-900' : 'text-gray-500'}`}>
                    {achievement.name}
                  </h3>
                  <p className={`text-sm ${achievement.isUnlocked ? 'text-gray-600' : 'text-gray-400'}`}>
                    {achievement.description}
                  </p>
                </div>

                {/* Progress Bar */}
                {achievement.progress && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>
                        {achievement.progress.current} / {achievement.progress.target}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min((achievement.progress.current / achievement.progress.target) * 100, 100)}
                      className="h-2"
                    />
                  </div>
                )}

                {/* Achievement Footer */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center space-x-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium">{achievement.points} pts</span>
                  </div>
                  
                  {achievement.unlockedAt && (
                    <div className="text-xs text-gray-500">
                      Unlocked {achievement.unlockedAt.toLocaleDateString()}
                    </div>
                  )}
                  
                  {!achievement.isUnlocked && achievement.progress && (
                    <div className="text-xs text-gray-500">
                      {Math.round((achievement.progress.current / achievement.progress.target) * 100)}% complete
                    </div>
                  )}
                </div>

                {/* Locked Overlay */}
                {!achievement.isUnlocked && (
                  <div className="absolute inset-0 bg-gray-100 bg-opacity-50 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Layers className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm font-medium text-gray-500">Locked</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}