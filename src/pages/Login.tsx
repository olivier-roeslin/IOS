import { useState } from 'react';
import { Eye, EyeOff, ExternalLink, Mail } from 'lucide-react';

export default function Login({ supabase }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup' | 'gmail'>('signin');

  // Gmail configuration
  const [gmailUser, setGmailUser] = useState('');
  const [gmailAppPassword, setGmailAppPassword] = useState('');
  const [showGmailPassword, setShowGmailPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'gmail') {
        // Configuration Gmail
        if (!gmailUser.trim() || !gmailAppPassword.trim()) {
          setError('⚠️ Remplis tous les champs Gmail.');
          setLoading(false);
          return;
        }

        // Appel à l'Edge Function pour configurer les secrets
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/configure-gmail`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            gmailUser,
            gmailAppPassword
          })
        });

        const result = await response.json();

        if (response.ok) {
          setError('✅ Configuration Gmail enregistrée avec succès!');
          setGmailUser('');
          setGmailAppPassword('');
        } else {
          setError(`⚠️ ${result.error || 'Erreur lors de la configuration'}`);
        }
      } else {
        // Connexion/Inscription normale
        if (!email.trim()) {
          setError('⚠️ Entre ton adresse email.');
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          setError('⚠️ Le mot de passe doit faire au moins 6 caractères.');
          setLoading(false);
          return;
        }

        if (mode === 'signup') {
          const { error } = await supabase.auth.signUp({
            email,
            password,
          });

          if (error) {
            setError(`⚠️ ${error.message}`);
          } else {
            setError('✅ Compte créé! Tu peux maintenant te connecter.');
            setMode('signin');
          }
        } else {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            setError(`⚠️ ${error.message}`);
          }
        }
      }
    } catch (err) {
      setError(`⚠️ Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-600 to-teal-500 flex">
      <div className="w-1/3 bg-gradient-to-br from-blue-600 to-teal-500 text-white p-16 flex flex-col justify-center">
        <h1 className="text-4xl font-bold mb-2">AbusePas</h1>
        <p className="text-lg text-blue-100 mb-8">Protection des apprentis</p>
        <p className="text-sm text-blue-100 leading-relaxed">
          Un espace simple pour signaler une situation, poser une question juridique, consulter des documents et contacter les bonnes personnes.
        </p>
      </div>

      <div className="flex-1 bg-gray-50 flex items-center justify-center p-12">
        <div className="w-full max-w-sm bg-white rounded-lg shadow-lg p-8">
          {/* Onglets */}
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(''); }}
              className={`pb-2 px-4 font-medium text-sm transition ${
                mode === 'signin'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(''); }}
              className={`pb-2 px-4 font-medium text-sm transition ${
                mode === 'signup'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Inscription
            </button>
            <button
              type="button"
              onClick={() => { setMode('gmail'); setError(''); }}
              className={`pb-2 px-4 font-medium text-sm transition flex items-center gap-1 ${
                mode === 'gmail'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Mail size={16} />
              Config Gmail
            </button>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {mode === 'signin' ? 'Connexion' : mode === 'signup' ? 'Créer un compte' : 'Configuration Gmail'}
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            {mode === 'signin'
              ? 'Connecte-toi avec ton email et mot de passe.'
              : mode === 'signup'
              ? 'Crée un nouveau compte pour accéder à l\'application.'
              : 'Configure ton compte Gmail pour l\'envoi d\'emails.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'gmail' ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                  <p className="text-xs text-blue-800 mb-2">
                    Pour obtenir un mot de passe d'application Gmail:
                  </p>
                  <ol className="text-xs text-blue-700 space-y-1 ml-4 list-decimal">
                    <li>Va sur <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline font-medium">myaccount.google.com/apppasswords</a></li>
                    <li>Connecte-toi avec ton compte Gmail</li>
                    <li>Crée un nouveau mot de passe d'application</li>
                    <li>Copie le code à 16 caractères généré</li>
                  </ol>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Adresse Gmail
                  </label>
                  <input
                    type="email"
                    value={gmailUser}
                    onChange={(e) => setGmailUser(e.target.value)}
                    placeholder="ton-email@gmail.com"
                    className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Mot de passe d'application Google
                  </label>
                  <div className="relative">
                    <input
                      type={showGmailPassword ? 'text' : 'password'}
                      value={gmailAppPassword}
                      onChange={(e) => setGmailAppPassword(e.target.value)}
                      placeholder="abcd efgh ijkl mnop"
                      className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGmailPassword(!showGmailPassword)}
                      className="absolute right-3 top-2.5 text-gray-600"
                    >
                      {showGmailPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Adresse email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ton-email@exemple.com"
                    className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mot de passe (min. 6 caractères)"
                      className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-gray-600"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className={`p-3 rounded-md text-sm ${
                error.includes('✅')
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md transition disabled:opacity-50"
            >
              {loading
                ? 'Chargement...'
                : mode === 'signin'
                ? 'Se connecter'
                : mode === 'signup'
                ? 'Créer un compte'
                : 'Enregistrer la configuration'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
