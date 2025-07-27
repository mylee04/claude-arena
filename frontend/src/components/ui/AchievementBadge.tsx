import React from 'react';
import type { Achievement } from '../../types';

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  locked?: boolean;
}

const AchievementBadge: React.FC<AchievementBadgeProps> = ({ 
  achievement, 
  size = 'md',
  showName = true,
  locked = false 
}) => {
  const sizeClasses = {
    sm: 'w-12 h-12 text-2xl',
    md: 'w-16 h-16 text-3xl',
    lg: 'w-20 h-20 text-4xl'
  };

  const getBadgeClass = () => {
    if (locked) return 'bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-700';
    
    switch (achievement.tier) {
      case 'bronze':
        return 'bg-bronze/20 border-bronze/40 shadow-bronze/20';
      case 'silver':
        return 'bg-silver/20 border-silver/40 shadow-silver/20';
      case 'gold':
        return 'bg-gold/20 border-gold/40 shadow-gold/20';
      case 'platinum':
        return 'bg-platinum/20 border-platinum/40 shadow-platinum/20';
      default:
        return 'bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-700';
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`
        ${sizeClasses[size]} 
        ${getBadgeClass()}
        rounded-full border-2 flex items-center justify-center
        transition-all duration-300 hover:scale-110 hover:shadow-lg
        ${locked ? 'opacity-50 grayscale' : ''}
      `}>
        <span className={locked ? 'blur-sm' : ''}>{achievement.icon}</span>
      </div>
      {showName && (
        <div className="text-center">
          <p className={`text-sm font-medium ${locked ? 'text-muted' : 'text-gray-700 dark:text-gray-200'}`}>
            {achievement.name}
          </p>
          {achievement.unlockedAt && !locked && (
            <p className="text-xs text-muted">
              {new Date(achievement.unlockedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default AchievementBadge;