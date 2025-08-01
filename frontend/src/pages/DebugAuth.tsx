import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getSessionDebugInfo } from '../utils/sessionDebug';
import { config } from '../config/env';

export function DebugAuth() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDebugInfo();
  }, []);

  const loadDebugInfo = async () => {
    try {
      const info = await getSessionDebugInfo();
      setDebugInfo(info);
    } catch (error) {
      console.error('Error loading debug info:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearAllAuth = () => {
    // Clear all auth-related storage
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('claude'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`Removed: ${key}`);
    });

    sessionStorage.clear();
    window.location.reload();
  };

  const manualSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) {
      console.error('Sign in error:', error);
    }
  };

  const inspectStorageKey = (key: string) => {
    const value = localStorage.getItem(key);
    if (value) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return null;
  };

  if (loading) {
    return <div className="p-8">Loading debug information...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">OAuth Debug Dashboard</h1>
      
      <div className="space-y-4">
        <section className="border p-4 rounded">
          <h2 className="font-semibold mb-2">Quick Actions</h2>
          <div className="space-x-2">
            <button 
              onClick={manualSignIn}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Sign In with Google
            </button>
            <button 
              onClick={clearAllAuth}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Clear All Auth
            </button>
            <button 
              onClick={loadDebugInfo}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Refresh Debug Info
            </button>
          </div>
        </section>

        <section className="border p-4 rounded">
          <h2 className="font-semibold mb-2">Session Status</h2>
          <div className="text-sm">
            <p>Session Exists: {debugInfo?.sessionExists ? '✅ Yes' : '❌ No'}</p>
            {debugInfo?.sessionData && (
              <>
                <p>User: {debugInfo.sessionData.user?.email}</p>
                <p>Expires: {debugInfo.sessionData.expires_at ? new Date(debugInfo.sessionData.expires_at * 1000).toLocaleString() : 'Unknown'}</p>
              </>
            )}
          </div>
        </section>

        <section className="border p-4 rounded">
          <h2 className="font-semibold mb-2">Storage Analysis</h2>
          
          <div className="mb-4">
            <h3 className="font-medium">localStorage Keys:</h3>
            <div className="space-y-2 mt-2">
              {Object.entries(debugInfo?.storageData?.localStorage || {}).map(([key, value]: [string, any]) => (
                <div key={key} className="border p-2 rounded text-xs">
                  <div className="font-mono font-semibold">{key}</div>
                  <details className="mt-1">
                    <summary className="cursor-pointer">View Content</summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-medium">Direct Storage Inspection:</h3>
            <div className="space-y-2 mt-2">
              <div className="text-xs">
                <div className="font-mono">claude-arena-auth-token:</div>
                <pre className="mt-1 p-2 bg-gray-100 rounded overflow-auto text-xs">
                  {JSON.stringify(inspectStorageKey('claude-arena-auth-token'), null, 2)}
                </pre>
              </div>
              
              <div className="text-xs">
                <div className="font-mono">Supabase auth token key:</div>
                <pre className="mt-1 p-2 bg-gray-100 rounded overflow-auto text-xs">
                  {JSON.stringify(
                    inspectStorageKey(`sb-${config.supabase.url.split('//')[1].split('.')[0]}-auth-token`), 
                    null, 
                    2
                  )}
                </pre>
              </div>
            </div>
          </div>
        </section>

        <section className="border p-4 rounded">
          <h2 className="font-semibold mb-2">Browser Capabilities</h2>
          <div className="text-sm space-y-1">
            <p>Cookies: {debugInfo?.browserInfo?.cookiesEnabled ? '✅' : '❌'}</p>
            <p>localStorage: {debugInfo?.browserInfo?.localStorageEnabled ? '✅' : '❌'}</p>
            <p>sessionStorage: {debugInfo?.browserInfo?.sessionStorageEnabled ? '✅' : '❌'}</p>
          </div>
        </section>

        {debugInfo?.errors?.length > 0 && (
          <section className="border border-red-500 p-4 rounded">
            <h2 className="font-semibold mb-2 text-red-600">Errors</h2>
            <ul className="text-sm text-red-600 space-y-1">
              {debugInfo.errors.map((error: string, i: number) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="border p-4 rounded">
          <h2 className="font-semibold mb-2">Full Debug Info</h2>
          <details>
            <summary className="cursor-pointer">View Raw Data</summary>
            <pre className="mt-2 p-4 bg-gray-100 rounded overflow-auto text-xs">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        </section>
      </div>
    </div>
  );
}