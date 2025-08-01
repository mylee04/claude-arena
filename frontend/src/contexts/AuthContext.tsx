/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, type User as UserProfile } from "../lib/supabase";
import { toast } from "sonner";
import type { User, Session } from "@supabase/supabase-js";
import { useOAuthErrorHandler } from "../components/auth/OAuthErrorHandler";
import { quickOAuthDiagnosis } from "../utils/oauthDiagnostics";

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);
  const { handleOAuthError } = useOAuthErrorHandler();

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
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
              const fallbackSession = parsedAuth.currentSession;
              
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
                  setSession(restoredSession);
                  if (restoredSession.user) {
                    // For now, create a basic user profile
                    setUserProfile({
                      id: restoredSession.user.id,
                      email: restoredSession.user.email,
                      username: restoredSession.user.email?.split('@')[0] || 'user',
                      total_xp: 0,
                      current_level: 'recruit',
                      streak_days: 0,
                      created_at: new Date().toISOString()
                    });
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
            await loadUserData(session.user.id);
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
        await loadUserData(session.user.id);
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
            
            const { currentSession } = parsed;
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
                setUserProfile({
                  id: restoredSession.user.id,
                  email: restoredSession.user.email,
                  username: restoredSession.user.email?.split('@')[0] || 'user',
                  total_xp: 0,
                  current_level: 'recruit',
                  streak_days: 0,
                  created_at: new Date().toISOString()
                });
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
    };
  }, []);

  const loadUserData = async (userId: string) => {
    try {
      setAuthError(null);
      
      // Simple table check
      const { error: checkError } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (checkError) {
        console.log('Database not set up yet');
        setLoading(false);
        return;
      }

      // Get user profile
      const { data: initialProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      let profile = initialProfile;

      // If profile doesn't exist, try to create it
      if (!profile) {
        console.log('Profile not found, attempting to create...');
        
        // Get the current auth user data
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          // Extract username from email or OAuth provider data
          const emailUsername = authUser.email?.split('@')[0] || 'user';
          const providerUsername = authUser.user_metadata?.user_name || 
                                  authUser.user_metadata?.preferred_username ||
                                  authUser.user_metadata?.nickname;
          
          const username = providerUsername || emailUsername;
          
          // Try to create the profile
          const { data: newProfile, error: createError } = await supabase
            .from('users')
            .insert({
              id: authUser.id,
              email: authUser.email!,
              username: username,
              full_name: authUser.user_metadata?.full_name || 
                        authUser.user_metadata?.name || 
                        username,
              avatar_url: authUser.user_metadata?.avatar_url || 
                         authUser.user_metadata?.picture || ''
            })
            .select()
            .single();
          
          if (!createError && newProfile) {
            profile = newProfile;
            toast.success('Welcome to Claude Arena!');
          } else if (createError) {
            console.error('Error creating user profile:', createError);
            setAuthError(createError);
            toast.error('Failed to create user profile');
          }
        }
      } else if (profileError) {
        console.error('Error loading user profile:', profileError);
        setAuthError(profileError);
      }

      if (profile) {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setAuthError(error as Error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      // Clear local session first
      setSession(null);
      setUserProfile(null);
      
      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        toast.error('Failed to sign out');
      } else {
        toast.success('Signed out successfully');
        navigate('/');
      }
    } catch (err) {
      console.error('Unexpected sign out error:', err);
      // Still navigate away even if there's an error
      navigate('/');
    }
  };
  
  const refreshUserData = async () => {
    if (session?.user) {
      await loadUserData(session.user.id);
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