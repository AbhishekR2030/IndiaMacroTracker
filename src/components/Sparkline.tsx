"use client";

import { ResponsiveContainer, AreaChart, Area } from "recharts";
import type { TimeSeriesData } from "@/lib/types";

interface SparklineProps {
  data: TimeSeriesData[];
  color: string;
  width?: number | string;
  height?: number;
}

export function Sparkline({
  data,
  color,
  width = "100%",
  height = 36,
}: SparklineProps) {
  // Show last 12 data points
  const chartData = data.slice(-12);
  const gradientId = `spark-${color.replace("#", "")}`;

  return (
    <ResponsiveContainer width={width} height={height}>
      <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}