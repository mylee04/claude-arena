/**
 * Test script for OAuth diagnostics - for development validation
 * Run this in browser console to test OAuth diagnostic functionality
 */

import { OAuthDiagnostics, quickOAuthDiagnosis } from './oauthDiagnostics';
import { OAuthTokenExchangeWorkaround, attemptOAuthRecovery } from './oauthWorkarounds';

// Test function for console use
(window as any).testOAuthDiagnostics = async () => {
  console.log('🧪 Testing OAuth Diagnostics...');
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  
  if (!supabaseUrl) {
    console.error('❌ No Supabase URL found in environment');
    return;
  }
  
  // Test 1: Quick diagnosis
  console.log('\n1️⃣ Running quick diagnosis...');
  await quickOAuthDiagnosis(supabaseUrl);
  
  // Test 2: Full diagnostics
  console.log('\n2️⃣ Running full diagnostics...');
  const diagnostics = new OAuthDiagnostics(supabaseUrl);
  const results = await diagnostics.runFullDiagnostics();
  
  const report = diagnostics.getReport();
  console.log('📊 Diagnostics Report:', report);
  
  // Test 3: Workaround system (if we have OAuth parameters)
  const hasCode = new URLSearchParams(window.location.search).has('code');
  if (hasCode) {
    console.log('\n3️⃣ Testing OAuth workarounds...');
    const workaround = new OAuthTokenExchangeWorkaround(supabaseUrl);
    const workaroundResult = await workaround.executeWorkarounds();
    console.log('🔧 Workaround Result:', workaroundResult);
  } else {
    console.log('\n3️⃣ Skipping workaround test (no OAuth code in URL)');
  }
  
  console.log('\n✅ OAuth Diagnostics Test Complete');
  return { results, report };
};

// Test function for OAuth recovery
(window as any).testOAuthRecovery = async () => {
  console.log('🔄 Testing OAuth Recovery...');
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const success = await attemptOAuthRecovery(supabaseUrl);
  
  console.log(success ? '✅ Recovery successful' : '❌ Recovery failed');
  return success;
};

// Instructions for manual testing
console.log(`
🧪 OAuth Diagnostics Test Functions Available:

To test OAuth diagnostics, run in browser console:
  testOAuthDiagnostics()

To test OAuth recovery:
  testOAuthRecovery()

These functions will:
1. Test all diagnostic methods
2. Validate OAuth parameters
3. Test token exchange simulation
4. Generate comprehensive reports

Best used on the /auth/callback page with OAuth parameters present.
`);