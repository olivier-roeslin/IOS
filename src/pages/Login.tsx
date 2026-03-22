import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';

export default function Login({ supabase }) {
  const { t } = useLanguage();
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
        setError(t.login.errorEmail);
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError(t.login.errorPassword);
        setLoading(false);
        return;
      }

      if (mode === 'signup') {
        if (!gmailAppPassword.trim()) {
          setError(t.login.errorGmailCode);
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
            setError(`${t.login.errorGmailConfig} ${configError.message}`);
          } else {
            setError(t.login.successAccount);
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
        <h1 className="text-4xl font-bold mb-2">{t.login.appTitle}</h1>
        <p className="text-lg text-blue-100 mb-8">{t.login.appSubtitle}</p>
        <p className="text-sm text-blue-100 leading-relaxed">
          {t.login.appDescription}
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
              {t.login.signinTab}
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
              {t.login.signupTab}
            </button>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {mode === 'signin' ? t.login.signinTab : t.login.createAccount}
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            {mode === 'signin'
              ? t.login.signinSubtitle
              : t.login.signupSubtitle}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                {t.login.email}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.login.emailPlaceholder}
                className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                {t.login.password}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.login.passwordPlaceholder}
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
                    {t.login.gmailCodeRequired}
                  </p>
                  <ol className="text-xs text-blue-700 space-y-1 ml-4 list-decimal">
                    {t.login.gmailInstructions.map((instruction, index) => (
                      <li key={index}>
                        {index === 0 ? (
                          <>
                            {instruction.split('myaccount.google.com/apppasswords')[0]}
                            <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                              myaccount.google.com/apppasswords
                            </a>
                          </>
                        ) : (
                          instruction
                        )}
                      </li>
                    ))}
                  </ol>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    {t.login.gmailCodeLabel}
                  </label>
                  <div className="relative">
                    <input
                      type={showGmailPassword ? 'text' : 'password'}
                      value={gmailAppPassword}
                      onChange={(e) => setGmailAppPassword(e.target.value)}
                      placeholder={t.login.gmailCodePlaceholder}
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
                    {t.login.gmailCodeHelp}
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
              {loading ? t.login.loading : (mode === 'signin' ? t.login.loginButton : t.login.createAccount)}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
