/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, type User as UserProfile } from "../lib/supabase";
import { toast } from "sonner";
import type { User, Session } from "@supabase/supabase-js";

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

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get session once on mount
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setAuthError(error);
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
        setAuthError(error as Error);
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

    return () => {
      mounted = false;
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