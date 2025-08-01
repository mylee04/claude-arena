/**
 * OAuth Workarounds for Common Issues
 * Provides fallback mechanisms and fixes for OAuth token exchange problems
 */

import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export interface OAuthWorkaroundResult {
  success: boolean;
  method: string;
  error?: string;
  session?: any;
}

/**
 * Comprehensive OAuth token exchange with multiple fallback strategies
 */
export class OAuthTokenExchangeWorkaround {
  private supabaseUrl: string;
  private attempts: Array<{ method: string; result: OAuthWorkaroundResult }> = [];

  constructor(supabaseUrl: string) {
    this.supabaseUrl = supabaseUrl.replace(/\/$/, '');
  }

  /**
   * Method 1: Let Supabase handle it automatically (default behavior)
   */
  async trySupabaseAutomatic(): Promise<OAuthWorkaroundResult> {
    const method = 'Supabase Automatic';
    
    try {
      console.log('🔄 Attempting: Supabase automatic session detection...');
      
      // Wait for Supabase to process the URL automatically
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        throw error;
      }
      
      if (session?.user) {
        const result: OAuthWorkaroundResult = {
          success: true,
          method,
          session
        };
        this.attempts.push({ method, result });
        return result;
      }
      
      throw new Error('No session found after automatic processing');
    } catch (error) {
      const result: OAuthWorkaroundResult = {
        success: false,
        method,
        error: error instanceof Error ? error.message : String(error)
      };
      this.attempts.push({ method, result });
      return result;
    }
  }

  /**
   * Method 2: Manual token exchange with cleaned parameters
   */
  async tryManualTokenExchange(): Promise<OAuthWorkaroundResult> {
    const method = 'Manual Token Exchange';
    
    try {
      console.log('🔄 Attempting: Manual token exchange...');
      
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      const code = urlParams.get('code') || hashParams.get('code');
      const codeVerifier = localStorage.getItem('pkce_code_verifier') || 
                          sessionStorage.getItem('pkce_code_verifier');
      
      if (!code) {
        throw new Error('No authorization code found');
      }
      
      if (!codeVerifier) {
        throw new Error('PKCE code verifier not found in storage');
      }

      // Clean and validate parameters
      const cleanedCode = this.cleanParameter(code);
      const cleanedVerifier = this.cleanParameter(codeVerifier);
      
      if (!cleanedCode || !cleanedVerifier) {
        throw new Error('Invalid parameters after cleaning');
      }

      // Create the payload with explicit encoding
      const payload = new URLSearchParams();
      payload.set('grant_type', 'authorization_code');
      payload.set('code', cleanedCode);
      payload.set('code_verifier', cleanedVerifier);
      
      // Use supabase client's built-in method with cleaned parameters
      const { data, error } = await supabase.auth.exchangeCodeForSession(cleanedCode);
      
      if (error) {
        throw error;
      }
      
      if (data.session?.user) {
        const result: OAuthWorkaroundResult = {
          success: true,
          method,
          session: data.session
        };
        this.attempts.push({ method, result });
        return result;
      }
      
      throw new Error('No session returned from token exchange');
    } catch (error) {
      const result: OAuthWorkaroundResult = {
        success: false,
        method,
        error: error instanceof Error ? error.message : String(error)
      };
      this.attempts.push({ method, result });
      return result;
    }
  }

  /**
   * Method 3: Direct fetch with comprehensive error handling
   */
  async tryDirectFetch(): Promise<OAuthWorkaroundResult> {
    const method = 'Direct Fetch';
    
    try {
      console.log('🔄 Attempting: Direct fetch with error handling...');
      
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const codeVerifier = localStorage.getItem('pkce_code_verifier');
      
      if (!code || !codeVerifier) {
        throw new Error('Missing required parameters');
      }

      const cleanedCode = this.cleanParameter(code);
      const cleanedVerifier = this.cleanParameter(codeVerifier);
      
      // Create request with thorough validation
      const payload = new URLSearchParams();
      payload.set('grant_type', 'authorization_code');
      payload.set('code', cleanedCode);
      payload.set('code_verifier', cleanedVerifier);
      
      // Validate payload before sending
      this.validatePayload(payload);
      
      const tokenUrl = `${this.supabaseUrl}/auth/v1/token`;
      
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: payload.toString()
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const tokenData = await response.json();
      
      if (!tokenData.access_token) {
        throw new Error('No access token in response');
      }
      
      // Set the session in Supabase
      const { data, error } = await supabase.auth.setSession({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token
      });
      
      if (error) {
        throw error;
      }
      
      const result: OAuthWorkaroundResult = {
        success: true,
        method,
        session: data.session
      };
      this.attempts.push({ method, result });
      return result;
    } catch (error) {
      const result: OAuthWorkaroundResult = {
        success: false,
        method,
        error: error instanceof Error ? error.message : String(error)
      };
      this.attempts.push({ method, result });
      return result;
    }
  }

  /**
   * Method 4: Fallback with fresh OAuth flow
   */
  async tryFreshOAuthFlow(): Promise<OAuthWorkaroundResult> {
    const method = 'Fresh OAuth Flow';
    
    try {
      console.log('🔄 Attempting: Fresh OAuth flow...');
      
      // Clear potentially corrupted data
      this.clearOAuthData();
      
      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if we have a valid session after cleanup
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const result: OAuthWorkaroundResult = {
          success: true,
          method,
          session
        };
        this.attempts.push({ method, result });
        return result;
      }
      
      // If no session, initiate fresh OAuth
      throw new Error('No valid session after cleanup - redirect to fresh OAuth needed');
    } catch (error) {
      const result: OAuthWorkaroundResult = {
        success: false,
        method,
        error: error instanceof Error ? error.message : String(error)
      };
      this.attempts.push({ method, result });
      return result;
    }
  }

  /**
   * Run all workaround methods in sequence until one succeeds
   */
  async executeWorkarounds(): Promise<OAuthWorkaroundResult> {
    console.group('🔧 OAuth Token Exchange Workarounds');
    
    this.attempts = [];
    
    const methods = [
      () => this.trySupabaseAutomatic(),
      () => this.tryManualTokenExchange(),
      () => this.tryDirectFetch(),
      () => this.tryFreshOAuthFlow()
    ];
    
    for (const method of methods) {
      try {
        const result = await method();
        
        if (result.success) {
          console.log(`✅ Success with: ${result.method}`);
          console.groupEnd();
          return result;
        } else {
          console.warn(`❌ Failed: ${result.method} - ${result.error}`);
        }
      } catch (error) {
        console.error(`💥 Exception in method: ${error}`);
      }
      
      // Wait between attempts
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.error('❌ All workaround methods failed');
    console.groupEnd();
    
    // Return the last attempt's result if all failed
    const lastAttempt = this.attempts[this.attempts.length - 1];
    return lastAttempt?.result || {
      success: false,
      method: 'All Methods Failed',
      error: 'All OAuth workaround methods failed'
    };
  }

  /**
   * Clean parameter to remove invalid characters
   */
  private cleanParameter(param: string): string {
    if (!param || typeof param !== 'string') {
      return '';
    }
    
    // Remove null characters, newlines, and other control characters
    return param
      .replace(/\0/g, '') // Remove null characters
      .replace(/[\r\n]/g, '') // Remove newlines
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove other control characters
      .trim();
  }

  /**
   * Validate payload for common issues
   */
  private validatePayload(payload: URLSearchParams): void {
    const entries = Array.from(payload.entries());
    
    for (const [key, value] of entries) {
      if (value === undefined || value === null) {
        throw new Error(`Parameter ${key} is undefined or null`);
      }
      
      if (typeof value !== 'string') {
        throw new Error(`Parameter ${key} is not a string`);
      }
      
      if (value.includes('\0')) {
        throw new Error(`Parameter ${key} contains null characters`);
      }
      
      if (value.includes('\n') || value.includes('\r')) {
        throw new Error(`Parameter ${key} contains newline characters`);
      }
    }
    
    // Validate grant_type
    if (payload.get('grant_type') !== 'authorization_code') {
      throw new Error('Invalid grant_type for OAuth flow');
    }
    
    // Validate code_verifier length for PKCE
    const codeVerifier = payload.get('code_verifier');
    if (codeVerifier && (codeVerifier.length < 43 || codeVerifier.length > 128)) {
      throw new Error('PKCE code_verifier has invalid length');
    }
  }

  /**
   * Clear OAuth-related data
   */
  private clearOAuthData(): void {
    const keysToRemove = [
      'claude-arena-auth-token',
      'pkce_code_verifier',
      'pkce_code_challenge',
      'oauth_state',
      'supabase.auth.token'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  }

  /**
   * Get report of all attempts
   */
  getAttemptReport(): Array<{ method: string; result: OAuthWorkaroundResult }> {
    return this.attempts;
  }
}

/**
 * Quick function to attempt OAuth recovery
 */
export async function attemptOAuthRecovery(supabaseUrl: string): Promise<boolean> {
  try {
    const workaround = new OAuthTokenExchangeWorkaround(supabaseUrl);
    const result = await workaround.executeWorkarounds();
    
    if (result.success) {
      toast.success(`Authentication recovered using: ${result.method}`);
      return true;
    } else {
      toast.error(`Authentication recovery failed: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error('OAuth recovery failed:', error);
    toast.error('OAuth recovery process failed');
    return false;
  }
}

/**
 * Enhanced OAuth callback handler with workarounds
 */
export async function handleOAuthCallbackWithWorkarounds(): Promise<{
  success: boolean;
  session?: any;
  error?: string;
  method?: string;
}> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  
  try {
    const workaround = new OAuthTokenExchangeWorkaround(supabaseUrl);
    const result = await workaround.executeWorkarounds();
    
    return {
      success: result.success,
      session: result.session,
      error: result.error,
      method: result.method
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      method: 'Exception during workaround execution'
    };
  }
}