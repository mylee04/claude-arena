/**
 * Direct handler for implicit flow OAuth responses
 * Bypasses Supabase's built-in handler which has fetch issues
 */

import { supabase } from '../lib/supabase';

export interface ImplicitFlowSession {
  access_token: string;
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    user_metadata: any;
  };
}

export async function handleImplicitFlowResponse(): Promise<{
  success: boolean;
  session?: ImplicitFlowSession;
  error?: string;
}> {
  try {
    // Get hash parameters
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    const accessToken = hashParams.get('access_token');
    const expiresAt = hashParams.get('expires_at');
    const expiresIn = hashParams.get('expires_in');
    const refreshToken = hashParams.get('refresh_token');
    const tokenType = hashParams.get('token_type');
    
    if (!accessToken) {
      return {
        success: false,
        error: 'No access token found in implicit flow response'
      };
    }
    
    console.log('🔐 Processing implicit flow tokens...');
    
    // Decode the JWT to get user info
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    
    const session: ImplicitFlowSession = {
      access_token: accessToken,
      expires_at: parseInt(expiresAt || '0'),
      expires_in: parseInt(expiresIn || '3600'),
      refresh_token: refreshToken || '',
      token_type: tokenType || 'bearer',
      user: {
        id: payload.sub,
        email: payload.email,
        user_metadata: payload.user_metadata || {}
      }
    };
    
    // Manually set the session in Supabase
    console.log('📝 Setting session manually...');
    
    // Clear the URL hash to prevent reprocessing
    window.history.replaceState(null, '', window.location.pathname);
    
    // Use Supabase's setSession method which should bypass the fetch issue
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || '',
    });
    
    if (error) {
      console.error('❌ Error setting session:', error);
      
      // Fallback: Store tokens manually and handle auth state ourselves
      localStorage.setItem('claude-arena-auth-token', JSON.stringify({
        currentSession: {
          access_token: accessToken,
          token_type: tokenType || 'bearer',
          expires_at: parseInt(expiresAt || '0'),
          refresh_token: refreshToken,
          user: session.user
        },
        expiresAt: parseInt(expiresAt || '0')
      }));
      
      // Force a page reload to reinitialize auth state
      console.log('🔄 Stored session manually, reloading to apply...');
      window.location.href = '/';
      return { success: true, session };
    }
    
    if (data.session) {
      console.log('✅ Session set successfully');
      return { success: true, session };
    }
    
    return {
      success: false,
      error: 'Failed to establish session'
    };
    
  } catch (error) {
    console.error('❌ Implicit flow handler error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export function hasImplicitFlowTokens(): boolean {
  return window.location.hash.includes('access_token');
}