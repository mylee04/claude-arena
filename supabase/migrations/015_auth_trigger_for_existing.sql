-- Authentication Trigger for existing schema
-- Automatically creates user profile and default team when someone signs up

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_email text;
  user_name text;
  user_username text;
  new_team_id uuid;
  existing_username_count integer;
BEGIN
  -- Get user email and name from metadata
  user_email := COALESCE(
    NEW.raw_user_meta_data->>'email',
    NEW.email
  );
  
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(user_email, '@', 1)
  );
  
  -- Generate username from email
  user_username := LOWER(REGEXP_REPLACE(split_part(user_email, '@', 1), '[^a-zA-Z0-9]', '', 'g'));
  
  -- Ensure username is unique
  SELECT COUNT(*) INTO existing_username_count
  FROM public.users 
  WHERE username = user_username;
  
  IF existing_username_count > 0 THEN
    user_username := user_username || '_' || substr(md5(random()::text), 1, 4);
  END IF;
  
  -- Create user profile
  INSERT INTO public.users (
    id, 
    email, 
    full_name, 
    username,
    avatar_url,
    org_type,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id, 
    user_email, 
    user_name,
    user_username,
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    CASE 
      WHEN user_email LIKE '%@claude.ai' THEN 'claude'
      WHEN user_email LIKE '%@anthropic.com' THEN 'anthropic'
      ELSE 'standard'
    END,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(users.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    updated_at = NOW();
  
  -- Check if user already has a team
  SELECT team_id INTO new_team_id
  FROM public.team_members
  WHERE user_id = NEW.id
  LIMIT 1;
  
  -- Create default team only if user has no teams
  IF new_team_id IS NULL THEN
    -- Create default team
    INSERT INTO public.teams (
      name,
      slug,
      description,
      created_by,
      created_at,
      updated_at
    )
    VALUES (
      user_name || '''s Team',
      user_username || '-team-' || substr(md5(random()::text), 1, 8),
      'Personal workspace for ' || user_email,
      NEW.id,
      NOW(),
      NOW()
    )
    RETURNING id INTO new_team_id;
    
    -- Add user as team owner
    INSERT INTO public.team_members (
      team_id,
      user_id,
      role,
      status,
      joined_at
    )
    VALUES (
      new_team_id,
      NEW.id,
      'owner',
      'active',
      NOW()
    );
  END IF;
  
  -- Log successful profile creation
  RAISE LOG 'Created/updated profile for user % with team %', NEW.id, new_team_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block authentication
    RAISE LOG 'Error in handle_new_user for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Helper function to ensure user has profile (for existing users)
CREATE OR REPLACE FUNCTION public.ensure_user_profile(user_id uuid)
RETURNS void AS $$
DECLARE
  auth_user auth.users;
BEGIN
  -- Get auth user
  SELECT * INTO auth_user FROM auth.users WHERE id = user_id;
  
  IF auth_user IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = user_id) THEN
    -- Trigger the handle_new_user function manually
    PERFORM handle_new_user() FROM auth.users WHERE id = user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.ensure_user_profile TO authenticated;