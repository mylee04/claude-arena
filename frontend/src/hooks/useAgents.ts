import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { 
  AgentPortfolio, 
  AgentOwnershipSummary, 
  XPEvent, 
  AgentAchievement,
  AgentLevel,
  PrivacyLevel
} from '../types';
import { useAuth } from './useAuth';
import { mockAgentPortfolio, mockAgentSummary, mockXPEvents } from '../utils/mockData';

interface UseAgentsReturn {
  agents: AgentPortfolio[];
  summary: AgentOwnershipSummary | null;
  recentXPEvents: XPEvent[];
  isLoading: boolean;
  error: string | null;
  refreshAgents: () => Promise<void>;
  toggleFavorite: (agentName: string) => Promise<void>;
  updatePrivacy: (agentName: string, privacy: PrivacyLevel) => Promise<void>;
  awardXP: (agentName: string, eventType: string, basePoints: number, bonusPoints?: number) => Promise<void>;
}

export const useAgents = (): UseAgentsReturn => {
  const { user } = useAuth();
  const [agents, setAgents] = useState<AgentPortfolio[]>([]);
  const [summary, setSummary] = useState<AgentOwnershipSummary | null>(null);
  const [recentXPEvents, setRecentXPEvents] = useState<XPEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgentPortfolio = useCallback(async () => {
    if (!user?.id) {
      // Use mock data when no user is logged in
      setAgents(mockAgentPortfolio);
      setSummary({ ...mockAgentSummary, recentXPGains: mockXPEvents });
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Call the get_user_agent_portfolio function
      const { data: portfolioData, error: portfolioError } = await supabase
        .rpc('get_user_agent_portfolio', { p_user_id: user.id });

      if (portfolioError) throw portfolioError;

      const agentPortfolio: AgentPortfolio[] = portfolioData || [];
      setAgents(agentPortfolio);

      // Calculate summary statistics
      if (agentPortfolio.length > 0) {
        const totalXP = agentPortfolio.reduce((sum, agent) => sum + agent.total_xp, 0);
        const levelCounts = agentPortfolio.reduce((counts, agent) => {
          counts[agent.current_level] = (counts[agent.current_level] || 0) + 1;
          return counts;
        }, {} as Record<AgentLevel, number>);

        const highestLevelAgent = agentPortfolio.reduce((highest, agent) => {
          const levelOrder: AgentLevel[] = ['recruit', 'specialist', 'expert', 'master', 'elite'];
          const currentIndex = levelOrder.indexOf(agent.current_level);
          const highestIndex = levelOrder.indexOf(highest.current_level);
          return currentIndex > highestIndex ? agent : highest;
        });

        const favoriteAgent = agentPortfolio.find(agent => agent.is_favorite);

        setSummary({
          totalAgents: agentPortfolio.length,
          totalXP,
          highestLevel: highestLevelAgent.current_level,
          favoriteAgent: favoriteAgent?.agent_display_name,
          recentXPGains: [], // Will be populated by fetchRecentXPEvents
          levelDistribution: levelCounts
        });
      } else {
        setSummary({
          totalAgents: 0,
          totalXP: 0,
          highestLevel: 'recruit',
          favoriteAgent: undefined,
          recentXPGains: [],
          levelDistribution: {
            recruit: 0,
            specialist: 0,
            expert: 0,
            master: 0,
            elite: 0
          }
        });
      }

    } catch (err) {
      console.error('Error fetching agent portfolio:', err);
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const fetchRecentXPEvents = useCallback(async () => {
    if (!user?.id) {
      setRecentXPEvents(mockXPEvents);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('xp_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const events: XPEvent[] = data || [];
      setRecentXPEvents(events);

      // Update summary with recent XP gains
      setSummary(prev => prev ? { ...prev, recentXPGains: events } : null);

    } catch (err) {
      console.error('Error fetching XP events:', err);
    }
  }, [user?.id]);

  const toggleFavorite = useCallback(async (agentName: string) => {
    if (!user?.id) return;

    try {
      // Get current favorite status
      const currentAgent = agents.find(agent => agent.agent_name === agentName);
      if (!currentAgent) return;

      // Update in database
      const { error } = await supabase
        .from('user_agents')
        .update({ is_favorite: !currentAgent.is_favorite })
        .eq('user_id', user.id)
        .eq('agent_name', agentName);

      if (error) throw error;

      // Update local state
      setAgents(prev => prev.map(agent => 
        agent.agent_name === agentName 
          ? { ...agent, is_favorite: !agent.is_favorite }
          : agent
      ));

      // Update summary if this was/becomes the favorite
      if (!currentAgent.is_favorite) {
        setSummary(prev => prev ? { ...prev, favoriteAgent: currentAgent.agent_display_name } : null);
      } else {
        // Find new favorite or clear if none
        const newFavorite = agents.find(agent => agent.agent_name !== agentName && agent.is_favorite);
        setSummary(prev => prev ? { ...prev, favoriteAgent: newFavorite?.agent_display_name } : null);
      }

    } catch (err) {
      console.error('Error toggling favorite:', err);
      setError(err instanceof Error ? err.message : 'Failed to update favorite');
    }
  }, [user?.id, agents]);

  const updatePrivacy = useCallback(async (agentName: string, privacy: PrivacyLevel) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('user_agents')
        .update({ privacy_level: privacy })
        .eq('user_id', user.id)
        .eq('agent_name', agentName);

      if (error) throw error;

      // Update local state
      setAgents(prev => prev.map(agent => 
        agent.agent_name === agentName 
          ? { ...agent, privacy_level: privacy }
          : agent
      ));

    } catch (err) {
      console.error('Error updating privacy:', err);
      setError(err instanceof Error ? err.message : 'Failed to update privacy');
    }
  }, [user?.id]);

  const awardXP = useCallback(async (
    agentName: string, 
    eventType: string, 
    basePoints: number, 
    bonusPoints: number = 0
  ) => {
    if (!user?.id) return;

    try {
      // Call the award_xp function
      const { error } = await supabase
        .rpc('award_xp', {
          p_user_id: user.id,
          p_agent_name: agentName,
          p_event_type: eventType,
          p_base_points: basePoints,
          p_bonus_points: bonusPoints
        });

      if (error) throw error;

      // Refresh data to reflect XP changes
      await Promise.all([fetchAgentPortfolio(), fetchRecentXPEvents()]);

    } catch (err) {
      console.error('Error awarding XP:', err);
      setError(err instanceof Error ? err.message : 'Failed to award XP');
    }
  }, [user?.id, fetchAgentPortfolio, fetchRecentXPEvents]);

  const refreshAgents = useCallback(async () => {
    await Promise.all([fetchAgentPortfolio(), fetchRecentXPEvents()]);
  }, [fetchAgentPortfolio, fetchRecentXPEvents]);

  // Set up real-time subscriptions  
  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to XP events for real-time updates
    const xpEventsSubscription = supabase
      .channel('xp_events_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'xp_events',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New XP event:', payload);
          // Refresh data when new XP is awarded
          refreshAgents();
        }
      )
      .subscribe();

    // Subscribe to user_agents changes
    const userAgentsSubscription = supabase
      .channel('user_agents_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_agents',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('User agents changed:', payload);
          refreshAgents();
        }
      )
      .subscribe();

    return () => {
      xpEventsSubscription.unsubscribe();
      userAgentsSubscription.unsubscribe();
    };
  }, [user?.id, refreshAgents]);

  // Initial data fetch
  useEffect(() => {
    if (user?.id) {
      refreshAgents();
    }
  }, [user?.id, refreshAgents]);

  return {
    agents,
    summary,
    recentXPEvents,
    isLoading,
    error,
    refreshAgents,
    toggleFavorite,
    updatePrivacy,
    awardXP
  };
};

// Hook for fetching agent achievements
export const useAgentAchievements = (agentName?: string) => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<AgentAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAchievements = useCallback(async () => {
    if (!user?.id || !agentName) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('agent_achievements')
        .select('*')
        .eq('user_id', user.id)
        .eq('agent_name', agentName)
        .order('unlocked_at', { ascending: false });

      if (fetchError) throw fetchError;

      setAchievements(data || []);

    } catch (err) {
      console.error('Error fetching agent achievements:', err);
      setError(err instanceof Error ? err.message : 'Failed to load achievements');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, agentName]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  return {
    achievements,
    isLoading,
    error,
    refreshAchievements: fetchAchievements
  };
};