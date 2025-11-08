'use client';

import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface SparklineProps {
  data: Array<{ value: number; date?: string }>;
  color?: string;
  height?: number;
  strokeWidth?: number;
}

export default function Sparkline({ 
  data, 
  color = '#3b82f6', 
  height = 40, 
  strokeWidth = 2 
}: SparklineProps) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-10 text-xs text-gray-400">No data</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={strokeWidth}
          dot={false}
          activeDot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}