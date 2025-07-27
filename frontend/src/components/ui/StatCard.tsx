import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { StatCard as StatCardType } from '../../types';

interface StatCardProps extends StatCardType {
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  change, 
  trend, 
  icon,
  className = '' 
}) => {
  const getTrendIcon = () => {
    if (!trend || trend === 'stable') return <Minus className="w-4 h-4 text-muted" />;
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-accent-green" />;
    return <TrendingDown className="w-4 h-4 text-accent-red" />;
  };

  const getTrendColor = () => {
    if (!trend || trend === 'stable') return 'text-muted';
    if (trend === 'up') return 'text-accent-green';
    return 'text-accent-red';
  };

  return (
    <div className={`stat-card hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-200 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="stat-label">{title}</p>
          <p className="stat-value">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${getTrendColor()}`}>
              {getTrendIcon()}
              <span>{change > 0 ? '+' : ''}{change}%</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="text-3xl opacity-50">{icon}</div>
        )}
      </div>
    </div>
  );
};

export default StatCard;