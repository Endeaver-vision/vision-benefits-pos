'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Target,
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  Activity
} from 'lucide-react';

interface CaptureRateVisualizationsProps {
  data: {
    conversionFunnel: Array<{
      stage: string;
      count: number;
      percentage: string;
      dropoffRate?: string;
    }>;
    captureRates: {
      overall: string;
      byStage: Array<{
        fromStage: string;
        toStage: string;
        rate: string;
        count: number;
        total: number;
      }>;
    };
    targets: {
      overallTarget: number;
      stageTargets: Array<{
        stage: string;
        target: number;
        current: number;
      }>;
    };
  };
  period: string;
  loading?: boolean;
}

export default function CaptureRateVisualizations({ data, period, loading = false }: CaptureRateVisualizationsProps) {
  // Helper function to get color based on performance vs target
  const getPerformanceColor = (current: number, target: number) => {
    const performance = (current / target) * 100;
    if (performance >= 100) return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' };
    if (performance >= 80) return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' };
    return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' };
  };

  // Helper function to get circular progress color
  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-500';
    if (percentage >= 60) return 'text-yellow-500';
    if (percentage >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  // Calculate overall performance
  const overallRate = parseFloat(data.captureRates.overall);
  const overallPerformance = (overallRate / data.targets.overallTarget) * 100;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-24 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Capture Rate Performance */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2 text-blue-600" />
            Overall Capture Rate Performance
          </CardTitle>
          <CardDescription>Current period: {period}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-blue-900">
                {data.captureRates.overall}%
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={overallPerformance >= 100 ? "default" : "secondary"}>
                  Target: {data.targets.overallTarget}%
                </Badge>
                {overallPerformance >= 100 ? (
                  <div className="flex items-center text-green-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">Above Target</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <TrendingDown className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">
                      {(data.targets.overallTarget - overallRate).toFixed(1)}% below target
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Circular Progress Indicator */}
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                {/* Progress circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${overallRate * 2.83} ${283 - (overallRate * 2.83)}`}
                  className={getProgressColor(overallRate)}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-900">
                    {data.captureRates.overall}%
                  </div>
                  <div className="text-xs text-gray-500">Capture</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Conversion Funnel Analysis
          </CardTitle>
          <CardDescription>
            Customer journey from initial contact to completed sale
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.conversionFunnel.map((stage, index) => {
              const isLast = index === data.conversionFunnel.length - 1;
              const stageTarget = data.targets.stageTargets.find(t => t.stage === stage.stage);
              const targetPerformance = stageTarget ? (stageTarget.current / stageTarget.target) * 100 : 100;
              const colors = getPerformanceColor(stageTarget?.current || 0, stageTarget?.target || 1);
              
              return (
                <div key={stage.stage} className="relative">
                  <div className={`p-4 rounded-lg border-2 ${colors.border} ${colors.bg}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {stage.stage === 'INITIAL_CONTACT' && <Users className="h-5 w-5 text-gray-600" />}
                        {stage.stage === 'QUOTE_GENERATED' && <Eye className="h-5 w-5 text-blue-600" />}
                        {stage.stage === 'QUOTE_PRESENTED' && <Eye className="h-5 w-5 text-orange-600" />}
                        {stage.stage === 'QUOTE_SIGNED' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                        {stage.stage === 'SALE_COMPLETED' && <Target className="h-5 w-5 text-green-700" />}
                        
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {stage.stage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {stage.count.toLocaleString()} customers ({stage.percentage}%)
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {stage.count.toLocaleString()}
                        </div>
                        {stageTarget && (
                          <div className="text-sm">
                            <span className={`font-medium ${colors.text}`}>
                              Target: {stageTarget.target}
                            </span>
                            {targetPerformance >= 100 ? (
                              <CheckCircle2 className="inline h-4 w-4 ml-1 text-green-600" />
                            ) : (
                              <AlertCircle className="inline h-4 w-4 ml-1 text-yellow-600" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Progress bar for this stage */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Conversion Progress</span>
                        <span>{stage.percentage}%</span>
                      </div>
                      <Progress 
                        value={parseFloat(stage.percentage)} 
                        className="h-3"
                      />
                    </div>
                    
                    {stage.dropoffRate && (
                      <div className="mt-2 text-sm text-red-600">
                        <TrendingDown className="inline h-4 w-4 mr-1" />
                        {stage.dropoffRate}% drop-off to next stage
                      </div>
                    )}
                  </div>
                  
                  {/* Connector arrow */}
                  {!isLast && (
                    <div className="flex justify-center py-2">
                      <div className="flex items-center">
                        <div className="h-0 w-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-400"></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stage-by-Stage Capture Rates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.captureRates.byStage.map((capture) => {
          const rate = parseFloat(capture.rate);
          const colors = getProgressColor(rate);
          
          return (
            <Card key={`${capture.fromStage}-${capture.toStage}`}>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        {capture.fromStage.replace(/_/g, ' ')} → {capture.toStage.replace(/_/g, ' ')}
                      </p>
                      <p className="text-2xl font-bold">{capture.rate}%</p>
                    </div>
                    
                    {/* Mini circular progress */}
                    <div className="relative w-16 h-16">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="12"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="12"
                          strokeLinecap="round"
                          strokeDasharray={`${rate * 2.51} ${251 - (rate * 2.51)}`}
                          className={colors}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-semibold">{capture.rate}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    {capture.count} of {capture.total} converted
                  </div>
                  
                  <Progress value={rate} className="h-2" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Target Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Target Performance Summary
          </CardTitle>
          <CardDescription>
            Performance against established capture rate targets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.targets.stageTargets.map((target) => {
              const performance = (target.current / target.target) * 100;
              const colors = getPerformanceColor(target.current, target.target);
              
              return (
                <div 
                  key={target.stage}
                  className={`p-4 rounded-lg border-2 ${colors.border} ${colors.bg}`}
                >
                  <div className="space-y-2">
                    <h4 className="font-semibold text-gray-900">
                      {target.stage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </h4>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold">{target.current}</span>
                      <span className="text-sm text-gray-600">Target: {target.target}</span>
                    </div>
                    <Progress value={performance > 100 ? 100 : performance} className="h-2" />
                    <div className={`text-sm font-medium ${colors.text}`}>
                      {performance >= 100 ? (
                        <span className="flex items-center">
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          {performance.toFixed(0)}% of target achieved
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {performance.toFixed(0)}% of target
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}