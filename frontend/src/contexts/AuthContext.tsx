/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, type User as UserProfile } from "../lib/supabase";
import { toast } from "sonner";
import type { User, Session } from "@supabase/supabase-js";
import { useOAuthErrorHandler } from "../components/auth/OAuthErrorHandler";
import { quickOAuthDiagnosis } from "../utils/oauthDiagnostics";
import { logSessionDebugInfo, startSessionMonitoring } from "../utils/sessionDebug";
import { config } from "../config/env";
import { syncSessionWithSupabase } from "../utils/sessionSync";

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  authError: Error | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface UserProfileCreationData {
  id: string;
  email: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);
  const { handleOAuthError } = useOAuthErrorHandler();

  useEffect(() => {
    let mounted = true;
    let sessionMonitorCleanup: (() => void) | null = null;

    const initializeAuth = async () => {
      try {
        // Start session monitoring in development
        if (config.debug.session && config.environment.isDev) {
          sessionMonitorCleanup = startSessionMonitoring();
        }

        // Log initial session debug info
        await logSessionDebugInfo();

        // Check for OAuth callback errors in URL before initializing
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        const authError = urlParams.get('error') || hashParams.get('error');
        const authErrorDescription = urlParams.get('error_description') || hashParams.get('error_description');
        
        if (authError) {
          console.error('❌ OAuth error detected in URL:', authError, authErrorDescription);
          const oauthError = new Error(`OAuth Error: ${authErrorDescription || authError}`);
          setAuthError(oauthError);
          if (mounted) setLoading(false);
          return;
        }

        // Get session once on mount
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // If no session found, check for manually stored session from implicit flow fallback
        if (!session && !error) {
          console.log('🔍 No Supabase session found, checking for fallback session...');
          try {
            const storedAuth = localStorage.getItem('claude-arena-auth-token');
            console.log('📦 Initial check - Stored auth:', storedAuth ? 'Found' : 'Not found');
            
            if (storedAuth) {
              const parsedAuth = JSON.parse(storedAuth);
              console.log('📋 Initial check - Structure:', Object.keys(parsedAuth));
              
              // Handle both storage formats - direct session or wrapped in currentSession
              const fallbackSession = parsedAuth.currentSession || parsedAuth;
              
              if (fallbackSession?.access_token && fallbackSession?.user) {
                console.log('📋 Found fallback session, attempting to restore...');
                
                // Since setSession causes fetch errors, directly use the stored session
                console.log('✅ Found fallback session, using it directly');
                
                // Create a session object from the stored data
                const restoredSession = {
                  access_token: fallbackSession.access_token,
                  token_type: fallbackSession.token_type || 'bearer',
                  expires_at: fallbackSession.expires_at,
                  expires_in: fallbackSession.expires_in || 3600,
                  refresh_token: fallbackSession.refresh_token || '',
                  user: fallbackSession.user
                };
                
                if (mounted) {
                  // Try to sync with Supabase first
                  console.log('🔄 Attempting to sync fallback session with Supabase...');
                  const syncResult = await syncSessionWithSupabase();
                  
                  if (syncResult.success) {
                    console.log('✅ Session synced with Supabase');
                    // Re-fetch the session from Supabase
                    const { data: { session: syncedSession } } = await supabase.auth.getSession();
                    if (syncedSession) {
                      setSession(syncedSession);
                      if (syncedSession.user) {
                        await loadUserData(syncedSession.user);
                      }
                      return;
                    }
                  }
                  
                  // If sync fails, use the fallback session anyway
                  console.log('⚠️ Sync failed, using fallback session directly');
                  setSession(restoredSession);
                  if (restoredSession.user) {
                    // Create temporary profile for fallback session
                    createTemporaryProfile(restoredSession.user);
                  }
                  setLoading(false);
                }
                return;
              }
            }
          } catch (fallbackError) {
            console.error('❌ Error processing fallback session:', fallbackError);
            // Clean up corrupted fallback session
            localStorage.removeItem('claude-arena-auth-token');
          }
        }
        
        if (error) {
          console.error('Error getting session:', error);
          
          // Use enhanced OAuth error handling
          const isOAuthError = handleOAuthError(error, {
            showDiagnostics: import.meta.env.DEV,
            onClearAuth: () => {
              setSession(null);
              setUserProfile(null);
            }
          });
          
          if (isOAuthError) {
            // Run diagnostics in development mode
            if (import.meta.env.DEV) {
              quickOAuthDiagnosis(import.meta.env.VITE_SUPABASE_URL);
            }
            const enhancedError = new Error('OAuth callback processing failed. Please try signing in again.');
            setAuthError(enhancedError);
          } else {
            setAuthError(error);
          }
          if (mounted) setLoading(false);
          return;
        }

        console.log('Initial session:', session?.user?.id || 'none');
        
        if (mounted) {
          setSession(session);
          if (session?.user) {
            await loadUserData(session.user);
          } else {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        
        // Use enhanced OAuth error handling
        const isOAuthError = handleOAuthError(error as Error, {
          showDiagnostics: import.meta.env.DEV,
          onClearAuth: () => {
            setSession(null);
            setUserProfile(null);
          }
        });
        
        if (isOAuthError) {
          // Run diagnostics in development mode
          if (import.meta.env.DEV) {
            quickOAuthDiagnosis(import.meta.env.VITE_SUPABASE_URL);
          }
          const enhancedError = new Error('OAuth authentication failed due to invalid parameters. Please try again.');
          setAuthError(enhancedError);
        } else {
          setAuthError(error as Error);
        }
        if (mounted) setLoading(false);
      }
    };

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Auth state changed:', _event, session?.user?.id || 'none');
      
      if (!mounted) return;
      
      setSession(session);
      
      if (session?.user) {
        await loadUserData(session.user);
      } else {
        // Clear user data on sign out
        setUserProfile(null);
        setLoading(false);
      }
    });

    initializeAuth();
    
    // Add a delayed check for fallback session (in case OAuth callback is still processing)
    const fallbackTimer = setTimeout(() => {
      if (mounted && !session) {
        console.log('⏱️ Performing delayed fallback session check...');
        
        try {
          const storedAuth = localStorage.getItem('claude-arena-auth-token');
          console.log('📦 Stored auth data:', storedAuth ? 'Found' : 'Not found');
          
          if (storedAuth) {
            const parsed = JSON.parse(storedAuth);
            console.log('📋 Parsed auth structure:', Object.keys(parsed));
            
            // Handle both storage formats - direct session or wrapped in currentSession
            const currentSession = parsed.currentSession || parsed;
            console.log('🔍 Current session exists:', !!currentSession);
            console.log('🔑 Has access token:', !!currentSession?.access_token);
            console.log('👤 Has user:', !!currentSession?.user);
            
            if (currentSession?.access_token && currentSession?.user) {
              console.log('✅ Found fallback session in delayed check');
              
              const restoredSession = {
                access_token: currentSession.access_token,
                token_type: currentSession.token_type || 'bearer',
                expires_at: currentSession.expires_at,
                expires_in: currentSession.expires_in || 3600,
                refresh_token: currentSession.refresh_token || '',
                user: currentSession.user
              };
              
              setSession(restoredSession);
              if (restoredSession.user) {
                createTemporaryProfile(restoredSession.user);
              }
              setLoading(false);
            }
          }
        } catch (error) {
          console.error('Error in delayed fallback check:', error);
        }
      }
    }, 2000);

    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
      subscription.unsubscribe();
      
      // Cleanup session monitoring
      if (sessionMonitorCleanup) {
        sessionMonitorCleanup();
      }
    };
  }, []);

  /**
   * Improved user data loading with proper error handling
   * No longer relies on risky table existence checks
   */
  const loadUserData = async (authUser: User) => {
    try {
      setAuthError(null);
      console.log('Loading user profile for:', authUser.id);

      // Try to get existing user profile
      const { data: existingProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle(); // Use maybeSingle to handle no results gracefully

      // Handle different scenarios
      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        
        // If it's a permission error (42501) or policy violation, try to create profile
        if (profileError.code === '42501' || profileError.code === 'PGRST000' || profileError.message?.includes('policy')) {
          console.log('Permission error, attempting to create user profile...');
          await handleProfileCreation(authUser);
        } else {
          // For other errors, set error but continue with auth session
          setAuthError(new Error(`Profile fetch error: ${profileError.message}`));
          createTemporaryProfile(authUser);
        }
      } else if (existingProfile) {
        // Profile exists, use it
        console.log('Found existing user profile');
        setUserProfile(existingProfile);
      } else {
        // Profile doesn't exist, create it
        console.log('No profile found, creating new one...');
        await handleProfileCreation(authUser);
      }
    } catch (error) {
      console.error('Error in loadUserData:', error);
      setAuthError(error as Error);
      // Still create a temporary profile so user can use the app
      createTemporaryProfile(authUser);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle profile creation with proper error handling
   */
  const handleProfileCreation = async (authUser: User) => {
    try {
      const profileData = extractUserProfileData(authUser);
      
      const { data: newProfile, error: createError } = await supabase
        .from('users')
        .insert(profileData)
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating user profile:', createError);
        
        // If creation fails due to trigger/policy issues, try upsert
        if (createError.code === '23505' || createError.message?.includes('duplicate')) {
          console.log('Profile might exist, trying upsert...');
          const { data: upsertedProfile, error: upsertError } = await supabase
            .from('users')
            .upsert(profileData, { onConflict: 'id' })
            .select()
            .single();
            
          if (upsertError) {
            console.error('Upsert also failed:', upsertError);
            createTemporaryProfile(authUser);
          } else {
            setUserProfile(upsertedProfile);
            toast.success('Welcome to Claude Arena!');
          }
        } else {
          // Other creation errors - use temporary profile
          createTemporaryProfile(authUser);
          setAuthError(createError);
        }
      } else {
        // Profile created successfully
        setUserProfile(newProfile);
        toast.success('Welcome to Claude Arena!');
      }
    } catch (error) {
      console.error('Error in handleProfileCreation:', error);
      createTemporaryProfile(authUser);
      setAuthError(error as Error);
    }
  };

  /**
   * Create a temporary profile for immediate app usage
   */
  const createTemporaryProfile = (authUser: User) => {
    console.log('Creating temporary profile for user session');
    const tempProfile: UserProfile = {
      id: authUser.id,
      email: authUser.email!,
      username: authUser.email?.split('@')[0] || 'user',
      full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || '',
      avatar_url: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || '',
      bio: undefined,
      github_username: undefined,
      linkedin_url: undefined,
      privacy_settings: {
        leaderboard: 'public',
        achievements: 'public',
        agents: 'public'
      },
      total_xp: 0,
      current_level: 'recruit',
      streak_days: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setUserProfile(tempProfile);
  };

  /**
   * Extract user profile data from auth user
   */
  const extractUserProfileData = (authUser: User): UserProfileCreationData => {
    const emailUsername = authUser.email?.split('@')[0] || 'user';
    const providerUsername = authUser.user_metadata?.user_name || 
                            authUser.user_metadata?.preferred_username ||
                            authUser.user_metadata?.nickname;
    
    return {
      id: authUser.id,
      email: authUser.email!,
      username: providerUsername || emailUsername,
      full_name: authUser.user_metadata?.full_name || 
                authUser.user_metadata?.name || 
                emailUsername,
      avatar_url: authUser.user_metadata?.avatar_url || 
                 authUser.user_metadata?.picture || ''
    };
  };

  const signOut = async () => {
    try {
      // Clear local session first
      setSession(null);
      setUserProfile(null);
      setAuthError(null);
      
      // Clear ALL auth-related storage to ensure complete logout
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('claude'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => {
        console.log(`Removing ${key} from localStorage`);
        localStorage.removeItem(key);
      });
      
      // Clear session storage too
      sessionStorage.clear();
      
      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        toast.error('Failed to sign out');
      } else {
        toast.success('Signed out successfully');
        navigate('/login');
      }
    } catch (err) {
      console.error('Unexpected sign out error:', err);
      // Still navigate away even if there's an error
      navigate('/login');
    }
  };
  
  const refreshUserData = async () => {
    if (session?.user) {
      await loadUserData(session.user);
    }
  };

  const value = {
    user: session?.user || null,
    userProfile,
    session,
    loading,
    signOut,
    refreshUserData,
    authError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}