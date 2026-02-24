'use client';

import { LucideIcon } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function MetricsCard({ title, value, subtitle, icon: Icon, trend }: MetricsCardProps) {
  return (
    <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">{title}</p>
        {Icon && <Icon className="h-4 w-4 text-red-500" />}
      </div>
      <p className="text-2xl font-bold text-white">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {subtitle && <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>}
      {trend && (
        <div className="mt-2 flex items-center text-xs">
          <span className={trend.isPositive ? 'text-green-500' : 'text-red-500'}>
            {trend.isPositive ? '+' : '-'}
            {Math.abs(trend.value)}%
          </span>
          <span className="ml-1 text-neutral-500">vs last period</span>
        </div>
      )}
    </div>
  );
}
