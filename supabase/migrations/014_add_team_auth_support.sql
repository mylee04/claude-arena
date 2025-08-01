-- Add authentication support to existing schema
-- This migration enhances the existing tables with auth features

-- Add missing columns to teams table if not exists
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS slug VARCHAR(128) UNIQUE;

-- Generate slugs for existing teams
UPDATE public.teams 
SET slug = LOWER(REPLACE(name, ' ', '-')) || '-' || SUBSTRING(id::text, 1, 8)
WHERE slug IS NULL;

-- Make slug NOT NULL after populating
ALTER TABLE public.teams 
ALTER COLUMN slug SET NOT NULL;

-- Add status column to team_members if not exists
ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'active' 
  CHECK (status IN ('active', 'invited', 'inactive'));

-- Add team_id to user_agents for team-based agent tracking
ALTER TABLE public.user_agents
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id);

-- Add team_id to xp_events for team-based XP tracking
ALTER TABLE public.xp_events
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id);

-- Add team_id to agent_stats
ALTER TABLE public.agent_stats
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id);

-- Add team_id to agent_achievements
ALTER TABLE public.agent_achievements
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_agents_team ON public.user_agents(team_id);
CREATE INDEX IF NOT EXISTS idx_xp_events_team ON public.xp_events(team_id);
CREATE INDEX IF NOT EXISTS idx_agent_stats_team ON public.agent_stats(team_id);
CREATE INDEX IF NOT EXISTS idx_agent_achievements_team ON public.agent_achievements(team_id);

-- Add org_type to users for organization tracking
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS org_type VARCHAR(32) DEFAULT 'standard';

-- Create function to get user's default team
CREATE OR REPLACE FUNCTION public.get_user_default_team(user_id UUID)
RETURNS UUID AS $$
DECLARE
  default_team_id UUID;
BEGIN
  -- Get the first team where user is owner, or any team they belong to
  SELECT tm.team_id INTO default_team_id
  FROM public.team_members tm
  WHERE tm.user_id = $1
  ORDER BY 
    CASE WHEN tm.role = 'owner' THEN 0 
         WHEN tm.role = 'admin' THEN 1 
         ELSE 2 END,
    tm.joined_at
  LIMIT 1;
  
  RETURN default_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing user_agents to have team_id
UPDATE public.user_agents ua
SET team_id = get_user_default_team(ua.user_id)
WHERE team_id IS NULL;

-- Update existing xp_events to have team_id
UPDATE public.xp_events xe
SET team_id = get_user_default_team(xe.user_id)
WHERE team_id IS NULL;

-- Update existing agent_stats to have team_id
UPDATE public.agent_stats ast
SET team_id = get_user_default_team(ast.user_id)
WHERE team_id IS NULL;

-- Update existing agent_achievements to have team_id
UPDATE public.agent_achievements aa
SET team_id = get_user_default_team(aa.user_id)
WHERE team_id IS NULL;