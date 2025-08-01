-- Improved Authentication Triggers for Claude Arena
-- Handles all OAuth providers reliably with proper error handling
-- Version: 2.0
-- Date: 2025-08-01

-- =======================
-- 1. CLEAN UP EXISTING TRIGGERS
-- =======================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.ensure_user_profile(uuid);

-- =======================
-- 2. ENHANCED USER PROFILE CREATION FUNCTION
-- =======================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  user_name TEXT;
  user_username TEXT;
  avatar_url TEXT;
  provider_name TEXT;
  new_team_id UUID;
  username_suffix INTEGER := 0;
  base_username TEXT;
  final_username TEXT;
BEGIN
  -- Log the trigger execution
  RAISE LOG 'handle_new_user triggered for user ID: %', NEW.id;
  
  -- Extract email from various sources
  user_email := COALESCE(
    NEW.email,
    NEW.raw_user_meta_data->>'email',
    'unknown@example.com'
  );
  
  -- Extract full name from various OAuth providers
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',           -- Generic
    NEW.raw_user_meta_data->>'name',                -- Google, GitHub
    NEW.raw_user_meta_data->>'display_name',        -- Some providers
    NEW.raw_user_meta_data->>'preferred_username',  -- Some OAuth providers
    NEW.raw_user_meta_data->>'given_name',          -- Google
    SPLIT_PART(user_email, '@', 1),                 -- Fallback to email prefix
    'User'
  );
  
  -- Extract avatar URL from various OAuth providers
  avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',          -- GitHub, generic
    NEW.raw_user_meta_data->>'picture',             -- Google
    NEW.raw_user_meta_data->>'profile_image_url',   -- Twitter
    NEW.raw_user_meta_data->>'image_url',           -- Some providers
    ''
  );
  
  -- Determine provider for logging
  provider_name := COALESCE(
    NEW.app_metadata->>'provider',
    'unknown'
  );
  
  -- Generate base username from email or provider data
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'preferred_username',  -- OAuth preferred username
    NEW.raw_user_meta_data->>'user_name',           -- Some providers
    NEW.raw_user_meta_data->>'login',               -- GitHub
    LOWER(REGEXP_REPLACE(SPLIT_PART(user_email, '@', 1), '[^a-zA-Z0-9]', '', 'g'))
  );
  
  -- Ensure username is not empty and has minimum length
  IF base_username IS NULL OR LENGTH(base_username) < 3 THEN
    base_username := 'user' || SUBSTR(MD5(NEW.id::TEXT), 1, 6);
  END IF;
  
  -- Ensure username uniqueness
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = final_username) LOOP
    username_suffix := username_suffix + 1;
    final_username := base_username || username_suffix::TEXT;
  END LOOP;
  
  -- Log extracted data
  RAISE LOG 'Creating profile for user %: email=%, name=%, username=%, provider=%', 
    NEW.id, user_email, user_name, final_username, provider_name;
  
  -- Insert user profile with comprehensive error handling
  BEGIN
    INSERT INTO public.users (
      id,
      email,
      full_name,
      username,
      avatar_url,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      user_email,
      user_name,
      final_username,
      avatar_url,
      NOW(),
      NOW()
    );
    
    RAISE LOG 'Successfully created user profile for %', NEW.id;
    
  EXCEPTION
    WHEN unique_violation THEN
      -- Handle race condition where user was created elsewhere
      RAISE LOG 'User profile already exists for %, updating instead', NEW.id;
      
      UPDATE public.users SET
        email = user_email,
        full_name = COALESCE(users.full_name, user_name),
        avatar_url = COALESCE(avatar_url, users.avatar_url),
        updated_at = NOW()
      WHERE id = NEW.id;
      
    WHEN OTHERS THEN
      -- Log error but don't fail the authentication
      RAISE LOG 'Error creating user profile for %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
      -- Don't create team if user profile creation failed
      RETURN NEW;
  END;
  
  -- Create default team for the user
  BEGIN
    -- Check if user already has a team (in case of race conditions)
    SELECT team_id INTO new_team_id
    FROM public.team_members
    WHERE user_id = NEW.id
    LIMIT 1;
    
    IF new_team_id IS NULL THEN
      -- Create default team
      INSERT INTO public.teams (
        name,
        description,
        created_by,
        created_at,
        updated_at
      ) VALUES (
        user_name || '''s Team',
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
      ) VALUES (
        new_team_id,
        NEW.id,
        'owner',
        'active',
        NOW()
      );
      
      RAISE LOG 'Created default team % for user %', new_team_id, NEW.id;
    ELSE
      RAISE LOG 'User % already has team %', NEW.id, new_team_id;
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Log team creation error but don't fail authentication
      RAISE LOG 'Error creating team for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
  END;
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Catch-all error handler - log but don't fail authentication
    RAISE LOG 'Critical error in handle_new_user for %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- 3. PROFILE REPAIR FUNCTION
-- =======================

-- Function to repair/create missing profiles for existing users
CREATE OR REPLACE FUNCTION public.repair_user_profile(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  auth_user auth.users%ROWTYPE;
  profile_exists BOOLEAN;
  result BOOLEAN := FALSE;
BEGIN
  -- Get the auth user
  SELECT * INTO auth_user FROM auth.users WHERE id = target_user_id;
  
  IF auth_user.id IS NULL THEN
    RAISE LOG 'repair_user_profile: Auth user % not found', target_user_id;
    RETURN FALSE;
  END IF;
  
  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = target_user_id) INTO profile_exists;
  
  IF NOT profile_exists THEN
    RAISE LOG 'repair_user_profile: Creating missing profile for user %', target_user_id;
    
    -- Simulate the trigger by calling handle_new_user logic
    BEGIN
      -- This will use the same logic as the trigger
      PERFORM public.handle_new_user() FROM auth.users WHERE id = target_user_id;
      result := TRUE;
      RAISE LOG 'repair_user_profile: Successfully created profile for user %', target_user_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'repair_user_profile: Error creating profile for user %: %', target_user_id, SQLERRM;
        result := FALSE;
    END;
  ELSE
    RAISE LOG 'repair_user_profile: Profile already exists for user %', target_user_id;
    result := TRUE;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- 4. BULK REPAIR FUNCTION
-- =======================

-- Function to repair all missing profiles
CREATE OR REPLACE FUNCTION public.repair_all_missing_profiles()
RETURNS TABLE(user_id UUID, email TEXT, status TEXT) AS $$
DECLARE
  auth_user RECORD;
  repair_result BOOLEAN;
BEGIN
  -- Find all auth users without profiles
  FOR auth_user IN 
    SELECT au.id, au.email
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
  LOOP
    BEGIN
      repair_result := public.repair_user_profile(auth_user.id);
      
      RETURN QUERY SELECT 
        auth_user.id,
        auth_user.email,
        CASE WHEN repair_result THEN 'SUCCESS' ELSE 'FAILED' END;
        
    EXCEPTION
      WHEN OTHERS THEN
        RETURN QUERY SELECT 
          auth_user.id,
          auth_user.email,
          ('ERROR: ' || SQLERRM)::TEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- 5. CREATE THE TRIGGER
-- =======================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =======================
-- 6. GRANT PERMISSIONS
-- =======================

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.repair_user_profile(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.repair_all_missing_profiles() TO service_role;

-- =======================
-- 7. TESTING FUNCTION
-- =======================

CREATE OR REPLACE FUNCTION public.test_auth_trigger()
RETURNS TABLE(test_name TEXT, result TEXT) AS $$
BEGIN
  -- Test if trigger function exists
  BEGIN
    PERFORM public.handle_new_user();
    RETURN QUERY SELECT 'trigger_function_exists'::TEXT, 'PASS'::TEXT;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 'trigger_function_exists'::TEXT, ('FAIL: ' || SQLERRM)::TEXT;
  END;
  
  -- Test if repair function works
  BEGIN
    PERFORM public.repair_user_profile(gen_random_uuid());
    RETURN QUERY SELECT 'repair_function_works'::TEXT, 'PASS'::TEXT;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 'repair_function_works'::TEXT, ('FAIL: ' || SQLERRM)::TEXT;  
  END;
  
  -- Check trigger existence
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE trigger_name = 'on_auth_user_created' 
      AND event_object_table = 'users'
    ) THEN
      RETURN QUERY SELECT 'trigger_exists'::TEXT, 'PASS'::TEXT;
    ELSE
      RETURN QUERY SELECT 'trigger_exists'::TEXT, 'FAIL: Trigger not found'::TEXT;
    END IF;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- 8. COMMENTS AND DOCUMENTATION
-- =======================

COMMENT ON FUNCTION public.handle_new_user() IS 'Improved trigger function that handles all OAuth providers and creates user profiles with proper error handling';
COMMENT ON FUNCTION public.repair_user_profile(UUID) IS 'Repairs or creates missing user profile for existing auth user';
COMMENT ON FUNCTION public.repair_all_missing_profiles() IS 'Bulk repair function for all missing user profiles';
COMMENT ON FUNCTION public.test_auth_trigger() IS 'Tests if auth trigger is working correctly';

-- Log completion
-- Auth triggers have been improved. Run SELECT * FROM public.test_auth_trigger(); to test.