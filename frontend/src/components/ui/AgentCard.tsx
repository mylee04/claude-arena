import React from 'react';
import { motion } from 'framer-motion';
import { Star, Zap, Trophy, Clock, TrendingUp, Heart, Shield, Lock } from 'lucide-react';
import type { AgentPortfolio, AgentLevel, PrivacyLevel } from '../../types';

interface AgentCardProps {
  agent: AgentPortfolio;
  isOwner?: boolean;
  onClick?: () => void;
  onFavoriteToggle?: (agentName: string) => void;
  onPrivacyChange?: (agentName: string, privacy: PrivacyLevel) => void;
}

const LEVEL_CONFIG: Record<AgentLevel, { 
  color: string; 
  glow: string; 
  stars: number; 
  badge: string;
  xpRequired: number;
}> = {
  recruit: { 
    color: 'from-gray-400 to-gray-600', 
    glow: 'shadow-gray-400/20', 
    stars: 1, 
    badge: 'Recruit',
    xpRequired: 100
  },
  specialist: { 
    color: 'from-green-400 to-green-600', 
    glow: 'shadow-green-400/30', 
    stars: 2, 
    badge: 'Specialist',
    xpRequired: 300
  },
  expert: { 
    color: 'from-blue-400 to-blue-600', 
    glow: 'shadow-blue-400/30', 
    stars: 3, 
    badge: 'Expert',
    xpRequired: 600
  },
  master: { 
    color: 'from-purple-400 to-purple-600', 
    glow: 'shadow-purple-400/30', 
    stars: 4, 
    badge: 'Master',
    xpRequired: 1000
  },
  elite: { 
    color: 'from-yellow-400 via-orange-500 to-red-500', 
    glow: 'shadow-yellow-400/40', 
    stars: 5, 
    badge: 'Elite',
    xpRequired: 1000
  }
};

const PRIVACY_ICONS: Record<PrivacyLevel, React.ReactNode> = {
  public: <div className="w-3 h-3 rounded-full bg-green-400" />,
  friends: <Shield className="w-3 h-3 text-yellow-400" />,
  private: <Lock className="w-3 h-3 text-red-400" />
};

const AgentCard: React.FC<AgentCardProps> = ({ 
  agent, 
  isOwner = false, 
  onClick, 
  onFavoriteToggle,
  onPrivacyChange: _onPrivacyChange 
}) => {
  const levelConfig = LEVEL_CONFIG[agent.current_level];
  const nextLevel = getNextLevel(agent.current_level);
  const nextLevelXP = nextLevel ? LEVEL_CONFIG[nextLevel].xpRequired : levelConfig.xpRequired;
  const progressPercent = Math.min((agent.total_xp / nextLevelXP) * 100, 100);

  const formatLastUsed = (lastUsed?: string) => {
    if (!lastUsed) return 'Never used';
    const date = new Date(lastUsed);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <motion.div
      className={`group relative bg-gradient-to-br from-card to-card/80 rounded-xl border border-border hover:border-accent-blue/50 transition-all duration-300 cursor-pointer ${levelConfig.glow}`}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      layout
    >
      {/* Card Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1 text-white group-hover:text-accent-blue transition-colors">
              {agent.agent_display_name}
            </h3>
            <div className="flex items-center gap-2 mb-2">
              {/* Level Badge */}
              <div className={`px-2 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${levelConfig.color} text-white`}>
                {levelConfig.badge}
              </div>
              
              {/* Stars */}
              <div className="flex gap-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i < levelConfig.stars 
                        ? 'text-yellow-400 fill-current' 
                        : 'text-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            {/* XP Progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted">
                <span>{agent.total_xp.toLocaleString()} XP</span>
                <span>{nextLevelXP.toLocaleString()} XP</span>
              </div>
              <div className="w-full bg-dark-border rounded-full h-2">
                <motion.div 
                  className={`h-full rounded-full bg-gradient-to-r ${levelConfig.color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          {isOwner && (
            <div className="flex flex-col gap-2 ml-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFavoriteToggle?.(agent.agent_name);
                }}
                className={`p-1.5 rounded-full transition-colors ${
                  agent.is_favorite 
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                    : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                }`}
              >
                <Heart className={`w-4 h-4 ${agent.is_favorite ? 'fill-current' : ''}`} />
              </button>
              
              {/* Privacy Indicator */}
              <div 
                className="p-1.5 rounded-full bg-gray-500/20 cursor-pointer hover:bg-gray-500/30 transition-colors"
                title={`Privacy: ${agent.privacy_level || 'public'}`}
              >
                {PRIVACY_ICONS[agent.privacy_level || 'public']}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-3">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-accent-blue" />
            </div>
            <div>
              <p className="text-xs text-muted">Usage</p>
              <p className="font-semibold text-sm">{agent.total_usage.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent-green/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-accent-green" />
            </div>
            <div>
              <p className="text-xs text-muted">Success</p>
              <p className="font-semibold text-sm">{agent.success_rate.toFixed(1)}%</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent-purple/20 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-accent-purple" />
            </div>
            <div>
              <p className="text-xs text-muted">Achievements</p>
              <p className="font-semibold text-sm">{agent.achievements_count}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent-orange/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-accent-orange" />
            </div>
            <div>
              <p className="text-xs text-muted">Last Used</p>
              <p className="font-semibold text-sm text-xs">{formatLastUsed(agent.last_used)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hover Overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-accent-blue/5 to-accent-purple/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        initial={false}
      />
      
      {/* Level Up Animation */}
      {progressPercent === 100 && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-xl"
          animate={{
            opacity: [0, 0.8, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
          }}
        />
      )}
    </motion.div>
  );
};

function getNextLevel(currentLevel: AgentLevel): AgentLevel | null {
  const levels: AgentLevel[] = ['recruit', 'specialist', 'expert', 'master', 'elite'];
  const currentIndex = levels.indexOf(currentLevel);
  return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
}

export default AgentCard;