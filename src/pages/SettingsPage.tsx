import { useState, useEffect } from 'react';
import { Mail, Save } from 'lucide-react';

export default function SettingsPage({ supabase, session }) {
  const [gmailUser, setGmailUser] = useState('');
  const [gmailPassword, setGmailPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [hasConfig, setHasConfig] = useState(false);

  useEffect(() => {
    loadGmailConfig();
  }, []);

  const loadGmailConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('gmail_config')
        .select('gmail_user')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setGmailUser(data.gmail_user);
        setHasConfig(true);
      }
    } catch (err) {
      console.error('Error loading Gmail config:', err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!gmailUser.trim() || !gmailPassword.trim()) {
      setMessage('Veuillez remplir tous les champs');
      setLoading(false);
      return;
    }

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/configure-gmail`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: session.user.id,
          gmail_user: gmailUser,
          gmail_app_password: gmailPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la configuration');
      }

      setMessage('Configuration Gmail enregistrée avec succès!');
      setHasConfig(true);
      setGmailPassword('');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Connexion Gmail</h1>
        <p className="text-gray-600">Connectez votre compte Gmail pour synchroniser vos messages</p>
      </div>

      <div className="max-w-2xl bg-white rounded-lg shadow-sm p-6">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Adresse Gmail
            </label>
            <input
              type="email"
              value={gmailUser}
              onChange={(e) => setGmailUser(e.target.value)}
              placeholder="votre.email@gmail.com"
              className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Mot de passe d'application Gmail
            </label>
            <input
              type="password"
              value={gmailPassword}
              onChange={(e) => setGmailPassword(e.target.value)}
              placeholder="xxxx xxxx xxxx xxxx"
              className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {message && (
            <div className={`p-3 rounded-md text-sm ${message.includes('succès') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {loading ? 'Enregistrement...' : hasConfig ? 'Mettre à jour le mot de passe' : 'Se connecter'}
          </button>
        </form>

        {hasConfig && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2 text-green-800">
              <Mail size={18} />
              <span className="font-semibold">Connecté avec: {gmailUser}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
