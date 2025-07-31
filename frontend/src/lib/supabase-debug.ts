/**
 * Supabase Debug Configuration
 * This file helps diagnose connection issues
 */

import { createClient } from '@supabase/supabase-js'

// Get raw environment values
const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL
const rawSupabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.group('🔍 Supabase Debug Information')
console.log('Raw URL:', rawSupabaseUrl)
console.log('Raw Key (first 20 chars):', rawSupabaseKey?.substring(0, 20))
console.log('Environment:', import.meta.env.MODE)
console.log('Is Production:', import.meta.env.PROD)
console.log('Base URL:', import.meta.env.BASE_URL)

// Check if values are strings
console.log('URL type:', typeof rawSupabaseUrl)
console.log('Key type:', typeof rawSupabaseKey)

// Check for common issues
if (!rawSupabaseUrl || rawSupabaseUrl === 'undefined' || rawSupabaseUrl === 'null') {
  console.error('❌ Supabase URL is not properly set!')
}
if (!rawSupabaseKey || rawSupabaseKey === 'undefined' || rawSupabaseKey === 'null') {
  console.error('❌ Supabase Anon Key is not properly set!')
}

// Try to create client with extensive error handling
try {
  // Ensure URL is properly formatted
  let processedUrl = rawSupabaseUrl
  if (rawSupabaseUrl && !rawSupabaseUrl.startsWith('http')) {
    processedUrl = `https://${rawSupabaseUrl}`
  }
  
  console.log('Processed URL:', processedUrl)
  
  // Validate URL
  try {
    const urlObj = new URL(processedUrl)
    console.log('URL validation passed:', urlObj.href)
  } catch (urlError) {
    console.error('❌ URL validation failed:', urlError)
  }
  
  // Create client with minimal config
  const debugClient = createClient(processedUrl, rawSupabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    }
  })
  
  console.log('✅ Client created successfully')
  
  // Test a simple operation
  debugClient.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error('❌ Session fetch error:', error)
    } else {
      console.log('✅ Session fetch successful:', data)
    }
  })
  
} catch (error) {
  console.error('❌ Failed to create Supabase client:', error)
  console.error('Error details:', {
    message: error.message,
    stack: error.stack,
    name: error.name
  })
}

console.groupEnd()

// Export debug values for use in other components
export const debugInfo = {
  rawUrl: rawSupabaseUrl,
  rawKey: rawSupabaseKey ? `${rawSupabaseKey.substring(0, 20)}...` : 'MISSING',
  environment: import.meta.env.MODE,
  isProduction: import.meta.env.PROD,
}