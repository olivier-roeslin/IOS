import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function Login({ supabase }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const [gmailAppPassword, setGmailAppPassword] = useState('');
  const [showGmailPassword, setShowGmailPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
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
        if (!gmailAppPassword.trim()) {
          setError('⚠️ Entre ton code Google à 16 caractères.');
          setLoading(false);
          return;
        }

        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          setError(`⚠️ ${signUpError.message}`);
        } else if (authData.user) {
          const { error: configError } = await supabase
            .from('gmail_config')
            .insert({
              user_id: authData.user.id,
              gmail_user: email,
              gmail_app_password: gmailAppPassword,
            });

          if (configError) {
            setError(`⚠️ Compte créé mais erreur lors de la sauvegarde du code Gmail: ${configError.message}`);
          } else {
            setError('✅ Compte créé avec succès! Tu peux maintenant te connecter.');
            setMode('signin');
            setEmail('');
            setPassword('');
            setGmailAppPassword('');
          }
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
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
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
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {mode === 'signin' ? 'Connexion' : 'Créer un compte'}
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            {mode === 'signin'
              ? 'Connecte-toi avec ton email et mot de passe.'
              : 'Remplis les informations ci-dessous pour créer ton compte.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            {mode === 'signup' && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-xs text-blue-800 mb-2 font-semibold">
                    Code Google requis pour l'inscription
                  </p>
                  <ol className="text-xs text-blue-700 space-y-1 ml-4 list-decimal">
                    <li>Va sur <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline font-medium">myaccount.google.com/apppasswords</a></li>
                    <li>Connecte-toi avec ton compte Gmail</li>
                    <li>Crée un nouveau mot de passe d'application</li>
                    <li>Copie le code à 16 caractères et colle-le ci-dessous</li>
                  </ol>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Code Google (16 caractères)
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
                  <p className="text-xs text-gray-500 mt-1">
                    Ce code sera mémorisé et utilisé automatiquement pour l'envoi d'emails
                  </p>
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
              {loading ? 'Chargement...' : (mode === 'signin' ? 'Se connecter' : 'Créer un compte')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
