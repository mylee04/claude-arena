-- CHECK USER AND RLS POLICIES DEBUG SCRIPT
-- Run this in Supabase SQL Editor to debug user profile and RLS issues

-- 1. Check if your user exists in auth.users
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at,
    raw_app_meta_data->>'provider' as provider,
    raw_user_meta_data->>'full_name' as full_name
FROM auth.users
WHERE email = 'myungeun2dc@gmail.com';

-- 2. Check if user profile exists in public.users table
SELECT * FROM public.users
WHERE email = 'myungeun2dc@gmail.com';

-- 3. Get the user ID for further checks
-- The queries below will use auth.uid() dynamically to get the current user's ID
-- No need to hardcode specific UUIDs - the system will use the authenticated user's ID

-- 4. Check if RLS is enabled on users table
SELECT 
    schemaname,
    tablename,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename = 'users';

-- 5. Check what RLS policies exist on users table
SELECT 
    polname as policy_name,
    polcmd as command,
    polpermissive as permissive,
    pg_get_expr(polqual, polrelid) as using_expression,
    pg_get_expr(polwithcheck, polrelid) as with_check_expression
FROM pg_policy
WHERE polrelid = 'public.users'::regclass;

-- 6. Test if you can insert your user profile manually
-- This uses auth.uid() to dynamically get the current authenticated user's ID
/*
INSERT INTO public.users (
    id,
    email,
    username,
    full_name,
    avatar_url
) VALUES (
    auth.uid(),
    'myungeun2dc@gmail.com',
    'myungeun2dc',
    'Myungeun Lee',
    'https://lh3.googleusercontent.com/a/ACg8ocJ_tqqlrmxoK06RYH6KaaQnM9El4ieffCycYLWafOzlIS9nRqE=s96-c'
)
ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();
*/

-- 7. Check if the auth.uid() function works correctly
SELECT auth.uid();

-- 8. If auth.uid() returns NULL, check your session
SELECT 
    current_setting('request.jwt.claims', true)::json->>'sub' as jwt_sub,
    current_setting('request.jwt.claims', true)::json->>'email' as jwt_email;

-- 9. Debug specific RLS policy for user creation
-- This shows what the RLS policy sees for the current authenticated user
WITH policy_check AS (
    SELECT 
        auth.uid() as current_auth_uid,
        CASE 
            WHEN auth.uid() IS NOT NULL 
            THEN 'Policy should ALLOW - User is authenticated'
            ELSE 'Policy will DENY - No authenticated user'
        END as expected_result,
        CASE
            WHEN auth.uid() IS NOT NULL
            THEN 'User can create/update their own profile'
            ELSE 'User must be authenticated to create profiles'
        END as explanation
)
SELECT * FROM policy_check;

-- 10. Force create user profile (bypasses RLS) - ONLY USE IF NEEDED
-- This will create the user profile regardless of RLS policies
-- WARNING: Only use this if normal user creation is failing
/*
-- First, temporarily disable RLS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Insert the user using dynamic auth.uid()
INSERT INTO public.users (
    id,
    email,
    username,
    full_name,
    avatar_url,
    total_xp,
    current_level,
    streak_days
) VALUES (
    auth.uid(),
    'myungeun2dc@gmail.com',
    'myungeun2dc',
    'Myungeun Lee',
    'https://lh3.googleusercontent.com/a/ACg8ocJ_tqqlrmxoK06RYH6KaaQnM9El4ieffCycYLWafOzlIS9nRqE=s96-c',
    0,
    'recruit',
    0
)
ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
*/

-- 11. Final check - verify user can be read with RLS enabled
SELECT 
    'Can read users table' as test,
    COUNT(*) as user_count,
    'Should return 1 if user exists and RLS allows access' as expected
FROM public.users
WHERE id = auth.uid();