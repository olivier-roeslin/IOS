import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Login from './pages/Login';
import MainApp from './pages/MainApp';
import { LanguageProvider } from './lib/LanguageContext';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4 mx-auto"></div>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <LanguageProvider>
      {session ? (
        <MainApp session={session} supabase={supabase} />
      ) : (
        <Login supabase={supabase} />
      )}
    </LanguageProvider>
  );
}

export default App;
