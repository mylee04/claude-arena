/**
 * Environment Variables Validation Utility
 * Helps debug configuration issues in Claude Arena
 */

interface EnvValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  debug: Record<string, any>;
}

export function validateEnvironment(): EnvValidationResult {
  const result: EnvValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    debug: {}
  };

  // Check Supabase URL
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  result.debug.supabaseUrl = supabaseUrl ? '✅ Present' : '❌ Missing';
  
  if (!supabaseUrl) {
    result.isValid = false;
    result.errors.push('VITE_SUPABASE_URL is missing from environment variables');
  } else {
    try {
      const url = new URL(supabaseUrl.startsWith('http') ? supabaseUrl : `https://${supabaseUrl}`);
      result.debug.supabaseUrlValid = '✅ Valid URL format';
      
      if (!url.hostname.includes('supabase')) {
        result.warnings.push('Supabase URL does not contain "supabase" - this might not be a valid Supabase URL');
        result.debug.supabaseUrlFormat = '⚠️  Unusual format';
      } else {
        result.debug.supabaseUrlFormat = '✅ Standard Supabase format';
      }
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Invalid Supabase URL format: ${supabaseUrl}`);
      result.debug.supabaseUrlValid = '❌ Invalid URL format';
    }
  }

  // Check Supabase Anon Key
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  result.debug.supabaseAnonKey = supabaseAnonKey ? '✅ Present' : '❌ Missing';
  
  if (!supabaseAnonKey) {
    result.isValid = false;
    result.errors.push('VITE_SUPABASE_ANON_KEY is missing from environment variables');
  } else {
    // Basic JWT format validation
    const jwtParts = supabaseAnonKey.split('.');
    if (jwtParts.length === 3) {
      result.debug.supabaseAnonKeyFormat = '✅ Valid JWT format';
      try {
        const payload = JSON.parse(atob(jwtParts[1]));
        result.debug.jwtPayload = {
          role: payload.role || 'unknown',
          iss: payload.iss || 'unknown',
          ref: payload.ref || 'unknown'
        };
      } catch (error) {
        result.warnings.push('Could not decode JWT payload - key might be corrupted');
        result.debug.jwtPayload = '⚠️  Could not decode';
      }
    } else {
      result.warnings.push('Supabase anon key does not appear to be in JWT format');
      result.debug.supabaseAnonKeyFormat = '⚠️  Not JWT format';
    }
  }

  // Environment info
  result.debug.environment = import.meta.env.DEV ? 'development' : 'production';
  result.debug.mode = import.meta.env.MODE;
  result.debug.currentUrl = window.location.origin;

  return result;
}

export function logEnvironmentStatus(): void {
  const validation = validateEnvironment();
  
  console.group('🔧 Claude Arena Environment Validation');
  
  if (validation.isValid) {
    console.log('✅ Environment configuration is valid!');
  } else {
    console.error('❌ Environment configuration has errors!');
  }
  
  console.group('📊 Debug Information');
  Object.entries(validation.debug).forEach(([key, value]) => {
    console.log(`${key}:`, value);
  });
  console.groupEnd();
  
  if (validation.errors.length > 0) {
    console.group('🚨 Errors');
    validation.errors.forEach(error => console.error('❌', error));
    console.groupEnd();
  }
  
  if (validation.warnings.length > 0) {
    console.group('⚠️  Warnings');
    validation.warnings.forEach(warning => console.warn('⚠️ ', warning));
    console.groupEnd();
  }
  
  console.groupEnd();
}