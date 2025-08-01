/**
 * OAuth Diagnostics - Advanced troubleshooting for Supabase PKCE token exchange
 * Specifically addresses: "Failed to execute 'fetch' on 'Window': Invalid value" error
 */

export interface PKCEDiagnosticResult {
  timestamp: string;
  testName: string;
  success: boolean;
  error?: string;
  details: Record<string, any>;
}

export interface TokenExchangePayload {
  grant_type: string;
  code?: string;
  code_verifier?: string;
  client_id?: string;
  redirect_uri?: string;
}

export class OAuthDiagnostics {
  private supabaseUrl: string;
  private results: PKCEDiagnosticResult[] = [];

  constructor(supabaseUrl: string) {
    this.supabaseUrl = supabaseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Test 1: Validate Supabase URL and token endpoint accessibility
   */
  async testTokenEndpointAccessibility(): Promise<PKCEDiagnosticResult> {
    const testName = 'Token Endpoint Accessibility';
    const timestamp = new Date().toISOString();
    
    try {
      const tokenUrl = `${this.supabaseUrl}/auth/v1/token`;
      
      // Test with a minimal OPTIONS request first
      const optionsResponse = await fetch(tokenUrl, {
        method: 'OPTIONS',
        headers: {
          'Origin': window.location.origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization',
        }
      });

      const result: PKCEDiagnosticResult = {
        timestamp,
        testName,
        success: true,
        details: {
          tokenUrl,
          optionsStatus: optionsResponse.status,
          optionsOk: optionsResponse.ok,
          corsHeaders: {
            allowOrigin: optionsResponse.headers.get('Access-Control-Allow-Origin'),
            allowMethods: optionsResponse.headers.get('Access-Control-Allow-Methods'),
            allowHeaders: optionsResponse.headers.get('Access-Control-Allow-Headers'),
          }
        }
      };

      this.results.push(result);
      return result;
    } catch (error) {
      const result: PKCEDiagnosticResult = {
        timestamp,
        testName,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: {
          tokenUrl: `${this.supabaseUrl}/auth/v1/token`,
          errorType: error instanceof TypeError ? 'TypeError' : 'UnknownError'
        }
      };
      
      this.results.push(result);
      return result;
    }
  }

  /**
   * Test 2: Validate request payload format and detect invalid values
   */
  validateTokenExchangePayload(payload: TokenExchangePayload): PKCEDiagnosticResult {
    const testName = 'Token Exchange Payload Validation';
    const timestamp = new Date().toISOString();
    const issues: string[] = [];
    const details: Record<string, any> = { payload: {...payload} };

    // Check for undefined, null, or empty values
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined) {
        issues.push(`${key} is undefined`);
      } else if (value === null) {
        issues.push(`${key} is null`);
      } else if (value === '') {
        issues.push(`${key} is empty string`);
      } else if (typeof value === 'string' && value.includes('\n')) {
        issues.push(`${key} contains newline characters`);
      } else if (typeof value === 'string' && value.includes('\0')) {
        issues.push(`${key} contains null characters`);
      }
    });

    // Check grant_type specifically
    if (payload.grant_type !== 'authorization_code') {
      issues.push(`grant_type should be 'authorization_code' for PKCE flow, got: ${payload.grant_type}`);
    }

    // Check code_verifier format (PKCE specific)
    if (payload.code_verifier) {
      if (payload.code_verifier.length < 43 || payload.code_verifier.length > 128) {
        issues.push(`code_verifier length is ${payload.code_verifier.length}, should be 43-128 characters`);
      }
      if (!/^[A-Za-z0-9._~-]+$/.test(payload.code_verifier)) {
        issues.push('code_verifier contains invalid characters (must be unreserved characters only)');
      }
    }

    details.issues = issues;
    details.isValidForPKCE = issues.length === 0;

    const result: PKCEDiagnosticResult = {
      timestamp,
      testName,
      success: issues.length === 0,
      error: issues.length > 0 ? issues.join('; ') : undefined,
      details
    };

    this.results.push(result);
    return result;
  }

  /**
   * Test 3: Test fetch request creation with various payload formats
   */
  async testFetchRequestFormats(): Promise<PKCEDiagnosticResult> {
    const testName = 'Fetch Request Format Testing';
    const timestamp = new Date().toISOString();
    const testResults: Record<string, any> = {};

    // Test different content types and payload formats
    const testPayloads = [
      {
        name: 'URLSearchParams',
        payload: new URLSearchParams({
          grant_type: 'authorization_code',
          code: 'test_code',
          code_verifier: 'test_verifier_that_is_long_enough_for_pkce_requirements_abcdef123456'
        }),
        contentType: 'application/x-www-form-urlencoded'
      },
      {
        name: 'FormData',
        payload: (() => {
          const formData = new FormData();
          formData.append('grant_type', 'authorization_code');
          formData.append('code', 'test_code');
          formData.append('code_verifier', 'test_verifier_that_is_long_enough_for_pkce_requirements_abcdef123456');
          return formData;
        })(),
        contentType: 'multipart/form-data'
      },
      {
        name: 'JSON',
        payload: JSON.stringify({
          grant_type: 'authorization_code',
          code: 'test_code',
          code_verifier: 'test_verifier_that_is_long_enough_for_pkce_requirements_abcdef123456'
        }),
        contentType: 'application/json'
      }
    ];

    for (const test of testPayloads) {
      try {
        // Just test creating the Request object, don't actually send it
        const headers: Record<string, string> = {};
        
        if (test.contentType !== 'multipart/form-data') {
          headers['Content-Type'] = test.contentType;
        }

        const request = new Request(`${this.supabaseUrl}/auth/v1/token`, {
          method: 'POST',
          headers,
          body: test.payload as BodyInit
        });

        testResults[test.name] = {
          success: true,
          url: request.url,
          method: request.method,
          hasBody: !!request.body,
          contentType: request.headers.get('Content-Type')
        };
      } catch (error) {
        testResults[test.name] = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          errorType: error instanceof TypeError ? 'TypeError' : 'UnknownError'
        };
      }
    }

    const allSuccessful = Object.values(testResults).every((result: any) => result.success);

    const result: PKCEDiagnosticResult = {
      timestamp,
      testName,
      success: allSuccessful,
      error: allSuccessful ? undefined : 'Some request format tests failed',
      details: { testResults }
    };

    this.results.push(result);
    return result;
  }

  /**
   * Test 4: Analyze URL parameters and detect common OAuth callback issues
   */
  analyzeCurrentUrlParams(): PKCEDiagnosticResult {
    const testName = 'OAuth Callback URL Analysis';
    const timestamp = new Date().toISOString();
    const currentUrl = window.location.href;
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    const analysis: Record<string, any> = {
      currentUrl,
      pathname: window.location.pathname,
      queryParams: {},
      hashParams: {},
      potentialIssues: []
    };

    // Extract all parameters
    urlParams.forEach((value, key) => {
      analysis.queryParams[key] = value;
    });
    
    hashParams.forEach((value, key) => {
      analysis.hashParams[key] = value;
    });

    // Check for OAuth parameters
    const authCode = analysis.queryParams.code;
    const authError = analysis.queryParams.error || analysis.hashParams.error;
    const authErrorDescription = analysis.queryParams.error_description || analysis.hashParams.error_description;

    // Analyze for common issues
    if (authError) {
      analysis.potentialIssues.push(`OAuth error: ${authError} - ${authErrorDescription}`);
    }

    if (authCode) {
      if (authCode.length === 0) {
        analysis.potentialIssues.push('Authorization code is empty');
      } else if (authCode.includes(' ')) {
        analysis.potentialIssues.push('Authorization code contains spaces (may be truncated)');
      } else if (authCode.includes('\n') || authCode.includes('\r')) {
        analysis.potentialIssues.push('Authorization code contains newline characters');
      }
    }

    // Check for PKCE-related storage
    const codeVerifier = localStorage.getItem('pkce_code_verifier');
    const codeChallenge = localStorage.getItem('pkce_code_challenge');
    
    analysis.localStorage = {
      hasCodeVerifier: !!codeVerifier,
      hasCodeChallenge: !!codeChallenge,
      codeVerifierLength: codeVerifier?.length || 0
    };

    if (authCode && !codeVerifier) {
      analysis.potentialIssues.push('Authorization code present but PKCE code verifier missing from localStorage');
    }

    const result: PKCEDiagnosticResult = {
      timestamp,
      testName,
      success: analysis.potentialIssues.length === 0,
      error: analysis.potentialIssues.length > 0 ? analysis.potentialIssues.join('; ') : undefined,
      details: analysis
    };

    this.results.push(result);
    return result;
  }

  /**
   * Test 5: Simulate the exact token exchange request that's failing
   */
  async simulateTokenExchange(code?: string, codeVerifier?: string): Promise<PKCEDiagnosticResult> {
    const testName = 'Token Exchange Simulation';
    const timestamp = new Date().toISOString();
    
    try {
      // Use provided values or extract from current context
      const authCode = code || new URLSearchParams(window.location.search).get('code');
      const verifier = codeVerifier || localStorage.getItem('pkce_code_verifier');
      
      if (!authCode) {
        return {
          timestamp,
          testName,
          success: false,
          error: 'No authorization code available for testing',
          details: { hasCode: false, hasVerifier: !!verifier }
        };
      }

      const payload = new URLSearchParams({
        grant_type: 'authorization_code',
        code: authCode,
        ...(verifier && { code_verifier: verifier })
      });

      // Validate payload first
      const payloadValidation = this.validateTokenExchangePayload({
        grant_type: 'authorization_code',
        code: authCode,
        code_verifier: verifier || undefined
      });

      if (!payloadValidation.success) {
        return {
          timestamp,
          testName,
          success: false,
          error: `Payload validation failed: ${payloadValidation.error}`,
          details: { payloadValidation, payload: Object.fromEntries(payload.entries()) }
        };
      }

      // Attempt the actual token exchange (this will likely fail, but we want to see how)
      const tokenUrl = `${this.supabaseUrl}/auth/v1/token`;
      
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: payload
      });

      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      const result: PKCEDiagnosticResult = {
        timestamp,
        testName,
        success: response.ok,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
        details: {
          tokenUrl,
          requestPayload: Object.fromEntries(payload.entries()),
          responseStatus: response.status,
          responseOk: response.ok,
          responseHeaders: Object.fromEntries(response.headers.entries()),
          responseData
        }
      };

      this.results.push(result);
      return result;
    } catch (error) {
      const result: PKCEDiagnosticResult = {
        timestamp,
        testName,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: {
          errorType: error instanceof TypeError ? 'TypeError' : 
                    error instanceof DOMException ? 'DOMException' : 'UnknownError',
          errorStack: error instanceof Error ? error.stack : undefined
        }
      };
      
      this.results.push(result);
      return result;
    }
  }

  /**
   * Run all diagnostic tests
   */
  async runFullDiagnostics(options?: { code?: string; codeVerifier?: string }): Promise<PKCEDiagnosticResult[]> {
    console.group('🔍 OAuth PKCE Diagnostics - Full Test Suite');
    
    this.results = []; // Clear previous results
    
    // Run all tests
    await this.testTokenEndpointAccessibility();
    await this.testFetchRequestFormats();
    this.analyzeCurrentUrlParams();
    
    if (options?.code || new URLSearchParams(window.location.search).get('code')) {
      await this.simulateTokenExchange(options?.code, options?.codeVerifier);
    }

    // Log summary
    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.length - successful;
    
    console.log(`✅ Successful tests: ${successful}`);
    console.log(`❌ Failed tests: ${failed}`);
    
    this.results.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${icon} ${result.testName}: ${result.success ? 'PASSED' : result.error}`);
      if (!result.success && result.details) {
        console.log('   Details:', result.details);
      }
    });
    
    console.groupEnd();
    
    return this.results;
  }

  /**
   * Get diagnostic report as structured data
   */
  getReport(): {
    summary: { total: number; successful: number; failed: number };
    results: PKCEDiagnosticResult[];
    recommendations: string[];
  } {
    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.length - successful;
    const recommendations: string[] = [];

    // Generate recommendations based on failures
    this.results.forEach(result => {
      if (!result.success) {
        switch (result.testName) {
          case 'Token Endpoint Accessibility':
            recommendations.push('Check Supabase URL configuration and network connectivity');
            break;
          case 'Token Exchange Payload Validation':
            recommendations.push('Review OAuth callback parameters for invalid characters or formatting');
            break;
          case 'Fetch Request Format Testing':
            recommendations.push('Consider using URLSearchParams for form data encoding');
            break;
          case 'OAuth Callback URL Analysis':
            recommendations.push('Check OAuth provider configuration and callback URL setup');
            break;
          case 'Token Exchange Simulation':
            recommendations.push('Verify PKCE code verifier is properly stored and retrieved');
            break;
        }
      }
    });

    return {
      summary: { total: this.results.length, successful, failed },
      results: this.results,
      recommendations: [...new Set(recommendations)] // Remove duplicates
    };
  }
}

/**
 * Quick diagnostic function for immediate troubleshooting
 */
export async function quickOAuthDiagnosis(supabaseUrl: string): Promise<void> {
  const diagnostics = new OAuthDiagnostics(supabaseUrl);
  await diagnostics.runFullDiagnostics();
  
  const report = diagnostics.getReport();
  
  if (report.summary.failed > 0) {
    console.error('🚨 OAuth Issues Detected:');
    report.recommendations.forEach(rec => console.error(`  - ${rec}`));
  } else {
    console.log('✅ All OAuth diagnostics passed');
  }
}