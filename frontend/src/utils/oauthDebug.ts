/**
 * OAuth Debugging Utilities
 * Helps diagnose OAuth callback issues and provides detailed logging
 */

export interface OAuthDebugInfo {
  url: string;
  hasAuthCode: boolean;
  hasAccessToken: boolean;
  hasError: boolean;
  error?: string;
  errorDescription?: string;
  queryParams: Record<string, string>;
  hashParams: Record<string, string>;
  isValidCallback: boolean;
  debugMessages: string[];
}

export function analyzeOAuthCallback(): OAuthDebugInfo {
  const url = window.location.href;
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  
  const debugMessages: string[] = [];
  
  // Extract all parameters
  const queryParams: Record<string, string> = {};
  const hashParamsObj: Record<string, string> = {};
  
  urlParams.forEach((value, key) => {
    queryParams[key] = value;
  });
  
  hashParams.forEach((value, key) => {
    hashParamsObj[key] = value;
  });
  
  // Check for auth parameters
  const authCode = queryParams.code || hashParamsObj.access_token;
  const accessToken = hashParamsObj.access_token;
  const error = queryParams.error || hashParamsObj.error;
  const errorDescription = queryParams.error_description || hashParamsObj.error_description;
  
  debugMessages.push(`Current URL: ${url}`);
  debugMessages.push(`Query parameters: ${JSON.stringify(queryParams, null, 2)}`);
  debugMessages.push(`Hash parameters: ${JSON.stringify(hashParamsObj, null, 2)}`);
  
  // Analyze callback validity
  let isValidCallback = false;
  
  if (error) {
    debugMessages.push(`❌ OAuth error detected: ${error}`);
    if (errorDescription) {
      debugMessages.push(`Error description: ${errorDescription}`);
    }
    isValidCallback = false;
  } else if (authCode || accessToken) {
    debugMessages.push(`✅ Auth parameters found`);
    if (authCode) debugMessages.push(`Auth code present: ${authCode.substring(0, 10)}...`);
    if (accessToken) debugMessages.push(`Access token present: ${accessToken.substring(0, 10)}...`);
    isValidCallback = true;
  } else if (window.location.pathname === '/auth/callback') {
    debugMessages.push(`⚠️ On callback path but no auth parameters found`);
    isValidCallback = false;
  } else {
    debugMessages.push(`ℹ️ Not an OAuth callback URL`);
    isValidCallback = false;
  }
  
  return {
    url,
    hasAuthCode: !!authCode,
    hasAccessToken: !!accessToken,
    hasError: !!error,
    error,
    errorDescription,
    queryParams,
    hashParams: hashParamsObj,
    isValidCallback,
    debugMessages,
  };
}

export function logOAuthDebugInfo(): OAuthDebugInfo {
  const debugInfo = analyzeOAuthCallback();
  
  console.group('🔍 OAuth Callback Debug Information');
  debugInfo.debugMessages.forEach(message => {
    if (message.startsWith('❌')) {
      console.error(message);
    } else if (message.startsWith('⚠️')) {
      console.warn(message);
    } else if (message.startsWith('✅')) {
      console.log(message);
    } else {
      console.info(message);
    }
  });
  console.groupEnd();
  
  return debugInfo;
}

export function validateSupabaseUrl(url: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!url) {
    errors.push('URL is empty or undefined');
    return { isValid: false, errors };
  }
  
  if (url === 'undefined' || url === 'null') {
    errors.push('URL is a string literal "undefined" or "null"');
    return { isValid: false, errors };
  }
  
  try {
    const urlObj = new URL(url);
    
    if (!urlObj.protocol.startsWith('http')) {
      errors.push('URL must use HTTP or HTTPS protocol');
    }
    
    if (!urlObj.hostname) {
      errors.push('URL must have a valid hostname');
    }
    
    if (!urlObj.hostname.includes('supabase.co') && !urlObj.hostname.includes('localhost') && !urlObj.hostname.includes('127.0.0.1')) {
      errors.push('URL does not appear to be a valid Supabase URL');
    }
    
    if (urlObj.pathname !== '/' && urlObj.pathname !== '') {
      errors.push('Supabase URL should not have a path component');
    }
    
  } catch (error) {
    errors.push(`Invalid URL format: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const testUrl = `${url}/rest/v1/`;
    
    fetch(testUrl, {
      method: 'GET',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
    })
    .then(response => {
      if (response.ok || response.status === 401) {
        // 401 is expected for unauthenticated requests to Supabase
        resolve({ success: true });
      } else {
        resolve({ success: false, error: `HTTP ${response.status}: ${response.statusText}` });
      }
    })
    .catch(error => {
      resolve({ success: false, error: error.message });
    });
  });
}