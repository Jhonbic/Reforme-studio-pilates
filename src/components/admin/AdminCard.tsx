import React from 'react';

interface AdminCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

export default function AdminCard({
  title,
  value,
  subtitle,
  icon,
  trend = 'neutral',
}: AdminCardProps) {
  const trendColor = {
    up: 'text-verde-500',
    down: 'text-red-500',
    neutral: 'text-verde-300',
  }[trend];

  return (
    <div className="bg-white rounded-lg shadow-soft p-6 border-l-4 border-dorado">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-sans text-verde-300 uppercase tracking-wide">{title}</p>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <h3 className="font-display text-4xl text-verde mb-2">{value}</h3>
      {subtitle && <p className={`text-sm font-sans ${trendColor}`}>{subtitle}</p>}
    </div>
  );
}
