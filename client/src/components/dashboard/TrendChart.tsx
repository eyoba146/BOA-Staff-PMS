import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { TrendPoint } from '@/types';
import { CHART_COLORS } from '@/utils/status';
import { EmptyState } from '@/components/ui';
import { TrendingUp } from 'lucide-react';

interface TrendChartProps {
  data: TrendPoint[];
  height?: number;
}

export function TrendChart({ data, height = 240 }: TrendChartProps) {
  const validPoints = data.filter((d) => d.percent !== null);

  if (validPoints.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center">
        <EmptyState
          icon={TrendingUp}
          title="No trend data"
          description="Performance trend points will appear once KPI entries are recorded."
          compact
        />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }} className="select-none">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="label"
            stroke={CHART_COLORS.axis}
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: CHART_COLORS.grid }}
          />
          <YAxis
            stroke={CHART_COLORS.axis}
            fontSize={12}
            tickLine={false}
            axisLine={false}
            domain={[0, (dataMax: number) => Math.max(120, Math.ceil(dataMax / 20) * 20)]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as TrendPoint;
                return (
                  <div className="rounded-md border border-zinc-200 bg-white p-2.5 shadow-md text-xs">
                    <p className="font-medium text-zinc-900">{item.label}</p>
                    <p className="mt-1 text-zinc-600">
                      Performance:{' '}
                      <span className="font-semibold tabular text-zinc-900">
                        {item.percent !== null ? `${item.percent.toFixed(1)}%` : 'No data'}
                      </span>
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="percent"
            stroke={CHART_COLORS.primary}
            strokeWidth={2.5}
            dot={{ r: 3.5, fill: '#FFFFFF', stroke: CHART_COLORS.primary, strokeWidth: 2 }}
            activeDot={{ r: 5, fill: CHART_COLORS.ink, stroke: '#FFFFFF', strokeWidth: 2 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
