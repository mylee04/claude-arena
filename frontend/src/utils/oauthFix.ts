/**
 * OAuth Fix - Force proper session establishment
 */

import { supabase } from '../lib/supabase';
import { config } from '../config/env';

export async function forceProperOAuth(): Promise<void> {
  // Clear any problematic stored sessions
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('supabase') || key.includes('claude'))) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Sign out from Supabase to ensure clean state
  await supabase.auth.signOut();
  
  // Redirect to login with a flag to use a different OAuth approach
  window.location.href = '/login?oauth_fix=true';
}

export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  error?: string;
}> {
  try {
    // Test basic Supabase connectivity
    const response = await fetch(`${config.supabase.url}/auth/v1/settings`);
    
    if (!response.ok) {
      return { 
        connected: false, 
        error: `HTTP ${response.status}: ${response.statusText}` 
      };
    }
    
    return { 
      connected: true
    };
  } catch (error) {
    return { 
      connected: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}