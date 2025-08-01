/**
 * Session Persistence Debugging Utilities
 * Helps debug session persistence issues in local development
 */

import { supabase } from '../lib/supabase'
import { config } from '../config/env'

// Session storage keys
const STORAGE_KEYS = {
  supabaseAuth: `sb-${config.supabase.url.split('//')[1].split('.')[0]}-auth-token`,
  claudeAuth: 'claude-arena-auth-token',
  pkceVerifier: 'supabase-pkce-code-verifier',
  oauthState: 'supabase-oauth-state',
} as const

// Session debug information interface
export interface SessionDebugInfo {
  timestamp: string
  sessionExists: boolean
  sessionData: any
  storageData: {
    localStorage: Record<string, any>
    sessionStorage: Record<string, any>
  }
  supabaseConfig: {
    url: string
    storageKey: string
    flowType: string
    persistSession: boolean
  }
  browserInfo: {
    userAgent: string
    cookiesEnabled: boolean
    localStorageEnabled: boolean
    sessionStorageEnabled: boolean
  }
  errors: string[]
}

/**
 * Comprehensive session debugging information
 */
export async function getSessionDebugInfo(): Promise<SessionDebugInfo> {
  const errors: string[] = []
  const timestamp = new Date().toISOString()

  try {
    // Get current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      errors.push(`Session error: ${sessionError.message}`)
    }

    // Collect localStorage data
    const localStorageData: Record<string, any> = {}
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        const value = localStorage.getItem(key)
        if (value) {
          try {
            localStorageData[key] = JSON.parse(value)
          } catch {
            localStorageData[key] = value
          }
        }
      })
      
      // Also check for any other supabase-related keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.includes('supabase') || key.includes('claude'))) {
          if (!localStorageData[key]) {
            const value = localStorage.getItem(key)
            if (value) {
              try {
                localStorageData[key] = JSON.parse(value)
              } catch {
                localStorageData[key] = value
              }
            }
          }
        }
      }
    } catch (error) {
      errors.push(`localStorage access error: ${error}`)
    }

    // Collect sessionStorage data
    const sessionStorageData: Record<string, any> = {}
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && (key.includes('supabase') || key.includes('claude'))) {
          const value = sessionStorage.getItem(key)
          if (value) {
            try {
              sessionStorageData[key] = JSON.parse(value)
            } catch {
              sessionStorageData[key] = value
            }
          }
        }
      }
    } catch (error) {
      errors.push(`sessionStorage access error: ${error}`)
    }

    // Browser capability tests
    const browserInfo = {
      userAgent: navigator.userAgent,
      cookiesEnabled: navigator.cookieEnabled,
      localStorageEnabled: (() => {
        try {
          const test = '__localStorage_test__'
          localStorage.setItem(test, 'test')
          localStorage.removeItem(test)
          return true
        } catch {
          return false
        }
      })(),
      sessionStorageEnabled: (() => {
        try {
          const test = '__sessionStorage_test__'
          sessionStorage.setItem(test, 'test')
          sessionStorage.removeItem(test)
          return true
        } catch {
          return false
        }
      })(),
    }

    return {
      timestamp,
      sessionExists: !!sessionData.session,
      sessionData: sessionData.session,
      storageData: {
        localStorage: localStorageData,
        sessionStorage: sessionStorageData,
      },
      supabaseConfig: {
        url: config.supabase.url,
        storageKey: STORAGE_KEYS.claudeAuth,
        flowType: 'implicit', // Based on current supabase config
        persistSession: true,
      },
      browserInfo,
      errors,
    }
  } catch (error) {
    errors.push(`Debug info collection error: ${error}`)
    
    return {
      timestamp,
      sessionExists: false,
      sessionData: null,
      storageData: { localStorage: {}, sessionStorage: {} },
      supabaseConfig: {
        url: config.supabase.url,
        storageKey: STORAGE_KEYS.claudeAuth,
        flowType: 'implicit',
        persistSession: true,
      },
      browserInfo: {
        userAgent: navigator.userAgent,
        cookiesEnabled: false,
        localStorageEnabled: false,
        sessionStorageEnabled: false,
      },
      errors,
    }
  }
}

/**
 * Pretty print session debug info to console
 */
export async function logSessionDebugInfo(): Promise<void> {
  if (!config.debug.session) {
    return
  }

  const debugInfo = await getSessionDebugInfo()
  
  console.group('🔍 Session Debug Information')
  console.log('Timestamp:', debugInfo.timestamp)
  console.log('Session Exists:', debugInfo.sessionExists)
  
  if (debugInfo.sessionData) {
    console.group('📱 Session Data')
    console.log('User ID:', debugInfo.sessionData.user?.id)
    console.log('Email:', debugInfo.sessionData.user?.email)
    console.log('Provider:', debugInfo.sessionData.user?.app_metadata?.provider)
    console.log('Expires At:', debugInfo.sessionData.expires_at ? new Date(debugInfo.sessionData.expires_at * 1000).toISOString() : 'Unknown')
    console.log('Access Token:', `${debugInfo.sessionData.access_token?.substring(0, 20)}...`)
    console.groupEnd()
  }

  if (Object.keys(debugInfo.storageData.localStorage).length > 0) {
    console.group('💾 localStorage Data')
    Object.entries(debugInfo.storageData.localStorage).forEach(([key, value]) => {
      console.log(key, value)
    })
    console.groupEnd()
  }

  if (Object.keys(debugInfo.storageData.sessionStorage).length > 0) {
    console.group('📋 sessionStorage Data')
    Object.entries(debugInfo.storageData.sessionStorage).forEach(([key, value]) => {
      console.log(key, value)
    })
    console.groupEnd()
  }

  console.group('🌐 Browser Info')
  console.log('Cookies Enabled:', debugInfo.browserInfo.cookiesEnabled)
  console.log('localStorage Enabled:', debugInfo.browserInfo.localStorageEnabled)
  console.log('sessionStorage Enabled:', debugInfo.browserInfo.sessionStorageEnabled)
  console.log('User Agent:', debugInfo.browserInfo.userAgent)
  console.groupEnd()

  if (debugInfo.errors.length > 0) {
    console.group('❌ Errors')
    debugInfo.errors.forEach(error => console.error(error))
    console.groupEnd()
  }

  console.groupEnd()
}

/**
 * Test session persistence by creating and retrieving a test session
 */
export async function testSessionPersistence(): Promise<{
  success: boolean
  issues: string[]
  recommendations: string[]
}> {
  const issues: string[] = []
  const recommendations: string[] = []

  try {
    // Test 1: Browser storage capabilities
    if (!navigator.cookieEnabled) {
      issues.push('Cookies are disabled')
      recommendations.push('Enable cookies in browser settings')
    }

    try {
      localStorage.setItem('__test__', 'test')
      localStorage.removeItem('__test__')
    } catch {
      issues.push('localStorage is not available')
      recommendations.push('Check browser privacy settings - localStorage may be disabled')
    }

    // Test 2: Current session state
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      issues.push(`Session retrieval error: ${sessionError.message}`)
      recommendations.push('Check Supabase configuration and network connectivity')
    }

    if (!sessionData.session) {
      issues.push('No active session found')
      recommendations.push('User needs to authenticate')
    } else {
      // Test 3: Session expiry
      if (sessionData.session?.expires_at) {
        const expiryTime = sessionData.session.expires_at * 1000
        const currentTime = Date.now()
        const timeUntilExpiry = expiryTime - currentTime

        if (timeUntilExpiry < 0) {
          issues.push('Session has expired')
          recommendations.push('Session needs to be refreshed')
        } else if (timeUntilExpiry < 5 * 60 * 1000) { // Less than 5 minutes
          issues.push('Session expires soon')
          recommendations.push('Session should be refreshed proactively')
        }
      } else {
        issues.push('Session missing expiry timestamp')
        recommendations.push('Session may be invalid - re-authenticate')
      }
    }

    // Test 4: Storage key consistency
    const expectedStorageKey = STORAGE_KEYS.supabaseAuth
    const storedData = localStorage.getItem(expectedStorageKey)
    
    if (!storedData) {
      issues.push('No session data found in localStorage')
      recommendations.push('Check if session persistence is enabled in Supabase config')
    } else {
      try {
        const parsedData = JSON.parse(storedData)
        if (!parsedData.access_token) {
          issues.push('Stored session data is missing access token')
          recommendations.push('Clear localStorage and re-authenticate')
        }
      } catch {
        issues.push('Stored session data is corrupted')
        recommendations.push('Clear localStorage and re-authenticate')
      }
    }

    // Test 5: Network connectivity to Supabase
    try {
      const response = await fetch(`${config.supabase.url}/auth/v1/settings`)
      if (!response.ok) {
        issues.push('Cannot connect to Supabase auth endpoint')
        recommendations.push('Check network connectivity and Supabase URL configuration')
      }
    } catch (error) {
      issues.push(`Network error: ${error}`)
      recommendations.push('Check internet connection and firewall settings')
    }

    return {
      success: issues.length === 0,
      issues,
      recommendations,
    }
  } catch (error) {
    return {
      success: false,
      issues: [`Test execution error: ${error}`],
      recommendations: ['Contact support with error details'],
    }
  }
}

/**
 * Clear all authentication-related storage
 */
export function clearAuthStorage(): void {
  try {
    // Clear specific auth keys
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    })

    // Clear any other supabase or claude related keys
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.includes('supabase') || key.includes('claude'))) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))

    console.log('🧹 Cleared all authentication storage')
  } catch (error) {
    console.error('❌ Failed to clear auth storage:', error)
  }
}

/**
 * Monitor session changes and log them
 */
export function startSessionMonitoring(): () => void {
  if (!config.debug.session) {
    return () => {}
  }

  console.log('🔍 Starting session monitoring...')
  
  // Monitor auth state changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    console.log(`🔄 Auth state changed: ${event}`)
    if (session) {
      console.log('👤 User:', session.user.email)
      console.log('⏰ Expires:', new Date(session.expires_at! * 1000).toISOString())
    } else {
      console.log('👤 No active session')
    }
  })

  // Monitor storage changes
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key && (event.key.includes('supabase') || event.key.includes('claude'))) {
      console.log('💾 Storage changed:', event.key)
      console.log('Old value:', event.oldValue)
      console.log('New value:', event.newValue)
    }
  }

  window.addEventListener('storage', handleStorageChange)

  // Return cleanup function
  return () => {
    subscription.unsubscribe()
    window.removeEventListener('storage', handleStorageChange)
    console.log('🛑 Stopped session monitoring')
  }
}

// Auto-log session info in development
if (config.debug.session && config.environment.isDev) {
  // Log session info when module loads
  logSessionDebugInfo()
  
  // Start monitoring
  startSessionMonitoring()
}