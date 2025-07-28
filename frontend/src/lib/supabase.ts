import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not set. Please check your .env.local file.')
}

// Validate URL format
let validatedUrl = supabaseUrl
if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  validatedUrl = `https://${supabaseUrl}`
}

export const supabase = createClient(validatedUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Helper types for Claude Arena
export interface User {
  id: string
  username: string
  email: string
  full_name?: string
  avatar_url?: string
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