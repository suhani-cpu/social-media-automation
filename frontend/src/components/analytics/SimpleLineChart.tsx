'use client';

interface LineChartData {
  label: string;
  value: number;
}

interface SimpleLineChartProps {
  data: LineChartData[];
  height?: number;
  color?: string;
  valueFormatter?: (value: number) => string;
}

export function SimpleLineChart({
  data,
  height = 200,
  color = 'bg-primary',
  valueFormatter,
}: SimpleLineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue || 1;

  return (
    <div className="space-y-4">
      {/* Chart Area */}
      <div className="relative" style={{ height }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 flex h-full flex-col justify-between text-xs text-muted-foreground">
          <span>{valueFormatter ? valueFormatter(maxValue) : maxValue.toLocaleString()}</span>
          <span>
            {valueFormatter
              ? valueFormatter(Math.floor((maxValue + minValue) / 2))
              : Math.floor((maxValue + minValue) / 2).toLocaleString()}
          </span>
          <span>{valueFormatter ? valueFormatter(minValue) : minValue.toLocaleString()}</span>
        </div>

        {/* Chart */}
        <div className="ml-16 flex h-full items-end justify-between gap-1">
          {data.map((item, index) => {
            const barHeight = ((item.value - minValue) / range) * 100;

            return (
              <div key={index} className="group relative flex flex-1 flex-col items-center">
                {/* Tooltip */}
                <div className="absolute -top-12 hidden rounded bg-gray-900 px-2 py-1 text-xs text-white group-hover:block">
                  <div className="font-medium">{item.label}</div>
                  <div>{valueFormatter ? valueFormatter(item.value) : item.value.toLocaleString()}</div>
                </div>

                {/* Bar */}
                <div
                  className={`w-full rounded-t ${color} transition-all duration-300`}
                  style={{ height: `${barHeight}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="ml-16 flex justify-between text-xs text-muted-foreground">
        {data.map((item, index) => {
          // Show every nth label to avoid crowding
          const showLabel = index === 0 || index === data.length - 1 || index % Math.ceil(data.length / 5) === 0;
          return (
            <div key={index} className="flex-1 text-center">
              {showLabel ? item.label : ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}
