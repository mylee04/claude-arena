import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { syncSessionWithSupabase, clearAndResetAuth } from '../utils/sessionSync';
import { toast } from 'sonner';

export function SessionTest() {
  const { user, userProfile, session, loading } = useAuth();
  const [directSession, setDirectSession] = useState<any>(null);
  const [storageData, setStorageData] = useState<any>({});

  useEffect(() => {
    checkDirectSession();
    checkStorage();
  }, []);

  const checkDirectSession = async () => {
    const { data } = await supabase.auth.getSession();
    setDirectSession(data.session);
  };

  const checkStorage = () => {
    const data: any = {};
    
    // Check all auth-related keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('claude'))) {
        try {
          data[key] = JSON.parse(localStorage.getItem(key) || '{}');
        } catch {
          data[key] = localStorage.getItem(key);
        }
      }
    }
    
    setStorageData(data);
  };

  const forceRefresh = () => {
    window.location.href = '/';
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const syncSession = async () => {
    const result = await syncSessionWithSupabase();
    if (result.success) {
      toast.success('Session synced successfully!');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      toast.error(`Failed to sync: ${result.error}`);
    }
  };

  const fullReset = async () => {
    await clearAndResetAuth();
    window.location.href = '/login';
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Session Test Page</h1>
      
      <div className="space-y-6">
        {/* Auth Context State */}
        <section className="border rounded p-4">
          <h2 className="font-semibold mb-3">Auth Context State</h2>
          <div className="space-y-2 text-sm">
            <p>Loading: {loading ? '⏳ Yes' : '✅ No'}</p>
            <p>User: {user ? `✅ ${user.email}` : '❌ None'}</p>
            <p>User Profile: {userProfile ? `✅ ${userProfile.username}` : '❌ None'}</p>
            <p>Session: {session ? '✅ Active' : '❌ None'}</p>
            {session && (
              <p className="text-xs text-gray-600">
                Expires: {new Date(session.expires_at! * 1000).toLocaleString()}
              </p>
            )}
          </div>
        </section>

        {/* Direct Supabase Check */}
        <section className="border rounded p-4">
          <h2 className="font-semibold mb-3">Direct Supabase Session Check</h2>
          <div className="space-y-2 text-sm">
            <p>Session: {directSession ? '✅ Found' : '❌ Not found'}</p>
            {directSession && (
              <>
                <p>User: {directSession.user.email}</p>
                <p>Provider: {directSession.user.app_metadata.provider}</p>
              </>
            )}
          </div>
          <button 
            onClick={checkDirectSession}
            className="mt-3 px-3 py-1 bg-blue-500 text-white rounded text-sm"
          >
            Recheck Session
          </button>
        </section>

        {/* Storage Data */}
        <section className="border rounded p-4">
          <h2 className="font-semibold mb-3">Storage Keys Found</h2>
          <div className="space-y-2">
            {Object.keys(storageData).map(key => (
              <details key={key} className="text-sm">
                <summary className="cursor-pointer font-mono">{key}</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(storageData[key], null, 2)}
                </pre>
              </details>
            ))}
          </div>
        </section>

        {/* Actions */}
        <section className="border rounded p-4">
          <h2 className="font-semibold mb-3">Actions</h2>
          <div className="space-x-3 space-y-3">
            <div>
              <button 
                onClick={syncSession}
                className="px-4 py-2 bg-purple-500 text-white rounded"
              >
                🔄 Sync Session with Supabase
              </button>
              <p className="text-xs text-gray-600 mt-1">
                Synchronizes the stored session with Supabase
              </p>
            </div>
            
            <div className="space-x-3">
              <button 
                onClick={forceRefresh}
                className="px-4 py-2 bg-green-500 text-white rounded"
              >
                Force Refresh to Home
              </button>
              <button 
                onClick={signOut}
                className="px-4 py-2 bg-red-500 text-white rounded"
              >
                Sign Out
              </button>
              <button 
                onClick={fullReset}
                className="px-4 py-2 bg-red-700 text-white rounded"
              >
                Full Reset
              </button>
              <button 
                onClick={() => {
                  checkDirectSession();
                  checkStorage();
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded"
              >
                Refresh Data
              </button>
            </div>
          </div>
        </section>

        {/* Navigation */}
        <section className="border rounded p-4">
          <h2 className="font-semibold mb-3">Navigation</h2>
          <div className="space-x-3">
            <a href="/" className="text-blue-500 underline">Home</a>
            <a href="/login" className="text-blue-500 underline">Login</a>
            <a href="/debug-auth" className="text-blue-500 underline">Debug Auth</a>
          </div>
        </section>
      </div>
    </div>
  );
}