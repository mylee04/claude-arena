import { createClient } from '@supabase/supabase-js'
import { config } from '../config/env'
import { validateEnvironment, logEnvironmentStatus } from '../utils/envValidation'
import { validateSupabaseUrl } from '../utils/oauthDebug'

// Validate environment on import
const envValidation = validateEnvironment()

// Log environment status in development
if (import.meta.env.DEV) {
  logEnvironmentStatus()
}

// Throw early if configuration is invalid
if (!envValidation.isValid) {
  const errorMessage = `Claude Arena Configuration Error:\n${envValidation.errors.join('\n')}`
  console.error('🚨 CONFIGURATION ERROR:', errorMessage)
  throw new Error(errorMessage)
}

const supabaseUrl = config.supabase.url
const supabaseAnonKey = config.supabase.anonKey

// Validate URL format
let validatedUrl = supabaseUrl
if (!supabaseUrl.startsWith('http')) {
  validatedUrl = `https://${supabaseUrl}`
}

// Additional URL validation
const urlValidation = validateSupabaseUrl(validatedUrl)
if (!urlValidation.isValid) {
  console.error('🚨 Supabase URL validation failed:', urlValidation.errors)
  urlValidation.errors.forEach(error => console.error(`  - ${error}`))
}

console.log('🔗 Supabase URL:', validatedUrl)
console.log('🔑 Supabase Key:', `${supabaseAnonKey.substring(0, 20)}...${supabaseAnonKey.substring(supabaseAnonKey.length - 10)}`)
console.log('✅ URL Validation:', urlValidation.isValid ? 'PASSED' : 'FAILED')

export const supabase = createClient(validatedUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: window.localStorage,
    storageKey: 'claude-arena-auth-token',
    debug: import.meta.env.DEV,
    // Add specific configurations for OAuth callback handling
  },
  global: {
    headers: {
      'X-Client-Info': 'claude-arena-frontend',
      'apikey': supabaseAnonKey,
    },
    fetch: (input, options = {}) => {
      // Add custom fetch wrapper to handle OAuth callback errors
      const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input));
      console.log('🌐 Supabase fetch:', url);
      
      // Validate URL before making the request
      try {
        const urlObj = new URL(url);
        // Ensure the URL is valid and has required components
        if (!urlObj.protocol || !urlObj.hostname) {
          throw new Error('Invalid URL format');
        }
      } catch (error) {
        console.error('❌ Invalid URL in Supabase fetch:', url, error);
        return Promise.reject(new Error(`Invalid URL: ${url}`));
      }
      
      // Add timeout and error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const enhancedOptions = {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      };
      
      return fetch(input, enhancedOptions)
        .then(response => {
          clearTimeout(timeoutId);
          if (!response.ok && response.status >= 400) {
            console.error('❌ Supabase API error:', response.status, response.statusText);
          }
          return response;
        })
        .catch(error => {
          clearTimeout(timeoutId);
          console.error('❌ Supabase fetch error:', error);
          throw error;
        });
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Helper types for Claude Arena
export interface User {
  id: string
  username: string
  email: string
  full_name?: string
  avatar_url?: string
  bio?: string
  github_username?: string
  linkedin_url?: string
  privacy_settings?: {
    leaderboard: 'public' | 'friends' | 'private'
    achievements: 'public' | 'friends' | 'private'
    agents: 'public' | 'friends' | 'private'
  }
  total_xp: number
  current_level: 'recruit' | 'specialist' | 'expert' | 'master' | 'elite'
  streak_days: number
  last_active_date?: string
  created_at: string
  updated_at?: string
}

export interface LeaderboardEntry {
  id: string
  user_id: string
  username: string
  avatar_url?: string
  rank: number
  score: number
  tokens_used: number
  efficiency_rating: number
  sessions_count: number
  tools_mastery: number
  streak_days: number
  achievements: string[]
  category: string
  period: 'daily' | 'weekly' | 'monthly' | 'all_time'
  created_at: string
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  category: 'speed' | 'efficiency' | 'tools' | 'streak' | 'special'
  unlocked_at?: string
}

export interface Team {
  id: string
  name: string
  description?: string
  avatar_url?: string
  created_at: string
  updated_at?: string
  member_count: number
  total_score: number
  rank?: number
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
  user?: User
}

// New Agent System Types
export interface XPEvent {
  id: string
  user_id: string
  agent_name: string
  event_type: 'task_completion' | 'achievement_unlock' | 'streak_bonus' | 'collaboration_bonus' | 'perfect_score'
  base_points: number
  bonus_points: number
  total_points: number
  metadata: Record<string, any>
  session_id?: string
  created_at: string
}

export interface UserAgent {
  id: string
  user_id: string
  agent_name: string
  agent_display_name?: string
  agent_description?: string
  is_favorite: boolean
  total_usage: number
  total_xp: number
  current_level: 'recruit' | 'specialist' | 'expert' | 'master' | 'elite'
  unlock_date: string
  last_used?: string
  privacy_level: 'public' | 'friends' | 'private'
}

export interface AgentStats {
  id: string
  user_agent_id: string
  user_id: string
  agent_name: string
  success_rate: number
  avg_completion_time?: string
  fastest_completion?: string
  total_tasks: number
  successful_tasks: number
  failed_tasks: number
  sessions_count: number
  total_time_spent?: string
  streak_days: number
  best_streak: number
  shared_conversations: number
  team_collaborations: number
  first_use: string
  last_updated: string
}

export interface AgentAchievement {
  id: string
  user_agent_id: string
  user_id: string
  agent_name: string
  achievement_key: string
  achievement_name: string
  achievement_description?: string
  achievement_tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  xp_reward: number
  icon_url?: string
  unlock_criteria: Record<string, any>
  unlocked_at: string
}

export interface ConversationShare {
  id: string
  user_id: string
  title: string
  content: string
  summary?: string
  privacy_level: 'public' | 'friends' | 'private'
  agents_used: string[]
  xp_earned: number
  tags: string[]
  view_count: number
  like_count: number
  created_at: string
  updated_at: string
}

export interface AgentPortfolio {
  agent_name: string
  agent_display_name?: string
  current_level: 'recruit' | 'specialist' | 'expert' | 'master' | 'elite'
  total_xp: number
  total_usage: number
  success_rate: number
  is_favorite: boolean
  last_used?: string
  achievements_count: number
}

export interface AgentLeaderboardEntry {
  user_id: string
  username: string
  avatar_url?: string
  agent_level: 'recruit' | 'specialist' | 'expert' | 'master' | 'elite'
  total_xp: number
  success_rate: number
  achievements_count: number
  rank: number
}

// Database function result types
export interface UserRank {
  rank: number
  score: number
  total_participants: number
}

export interface UserRecentActivity {
  activity_type: string
  activity_description: string
  activity_timestamp: string
  metadata: Record<string, any>
}

export interface AchievementProgress {
  achievement_type: string
  bronze_unlocked: boolean
  silver_unlocked: boolean
  gold_unlocked: boolean
  platinum_unlocked: boolean
  next_tier?: 'bronze' | 'silver' | 'gold' | 'platinum'
  progress_metadata: Record<string, any>
}