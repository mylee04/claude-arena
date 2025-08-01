/**
 * Session synchronization utility
 * Ensures Supabase's internal session state matches our stored tokens
 */

import { supabase } from '../lib/supabase';

export async function syncSessionWithSupabase(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Check if we have a stored session
    const storedAuth = localStorage.getItem('claude-arena-auth-token');
    if (!storedAuth) {
      return { success: false, error: 'No stored session found' };
    }

    const parsedAuth = JSON.parse(storedAuth);
    const session = parsedAuth.currentSession || parsedAuth;

    if (!session?.access_token) {
      return { success: false, error: 'Invalid stored session' };
    }

    // Check if Supabase already has a session
    const { data: currentSession } = await supabase.auth.getSession();
    if (currentSession.session) {
      console.log('✅ Supabase already has a valid session');
      return { success: true };
    }

    console.log('🔄 Attempting to sync session with Supabase...');

    // Try to set the session using stored tokens
    const { data, error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token || '',
    });

    if (error) {
      console.error('❌ Failed to sync session:', error);
      
      // If setting session fails, try refreshing the session
      if (session.refresh_token) {
        console.log('🔄 Attempting to refresh session...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
          refresh_token: session.refresh_token
        });

        if (!refreshError && refreshData.session) {
          console.log('✅ Session refreshed successfully');
          
          // Update stored session with new tokens
          localStorage.setItem('claude-arena-auth-token', JSON.stringify({
            currentSession: refreshData.session,
            expiresAt: refreshData.session.expires_at
          }));
          
          return { success: true };
        } else {
          console.error('❌ Failed to refresh session:', refreshError);
          return { success: false, error: refreshError?.message || 'Failed to refresh session' };
        }
      }
      
      return { success: false, error: error.message };
    }

    if (data.session) {
      console.log('✅ Session synced successfully');
      return { success: true };
    }

    return { success: false, error: 'Failed to establish session' };
  } catch (error) {
    console.error('❌ Session sync error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function clearAndResetAuth(): Promise<void> {
  try {
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Clear all auth-related storage
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('claude'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    sessionStorage.clear();
    
    console.log('🧹 Cleared all authentication data');
  } catch (error) {
    console.error('❌ Failed to clear auth:', error);
  }
}