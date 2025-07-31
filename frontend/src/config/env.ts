/**
 * Environment configuration with fallbacks
 * This ensures environment variables are properly loaded in all environments
 */

// Helper to safely get environment variables
function getEnvVar(key: string, fallback?: string): string {
  const value = import.meta.env[key];
  
  // Check for various "undefined" states
  if (!value || value === 'undefined' || value === 'null' || value === '') {
    if (fallback) {
      console.warn(`⚠️  ${key} not found, using fallback:`, fallback);
      return fallback;
    }
    throw new Error(`Missing required environment variable: ${key}`);
  }
  
  return value;
}

// Validate and export configuration
export const config = {
  supabase: {
    url: getEnvVar('VITE_SUPABASE_URL'),
    anonKey: getEnvVar('VITE_SUPABASE_ANON_KEY'),
  },
  api: {
    url: getEnvVar('VITE_API_URL', window.location.origin),
  },
  environment: {
    mode: import.meta.env.MODE,
    isDev: import.meta.env.DEV,
    isProd: import.meta.env.PROD,
  }
};

// Log configuration in development
if (import.meta.env.DEV) {
  console.group('🔧 Environment Configuration');
  console.log('Supabase URL:', config.supabase.url);
  console.log('Supabase Key:', `${config.supabase.anonKey.substring(0, 20)}...`);
  console.log('API URL:', config.api.url);
  console.log('Environment:', config.environment.mode);
  console.groupEnd();
}