import { useState, useEffect } from 'react';
import { Mail, Save, Languages, Moon, Bell } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { useTheme } from '../lib/ThemeContext';
import { languageNames, Language } from '../lib/translations';

export default function SettingsPage({ supabase, session }) {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [gmailUser, setGmailUser] = useState('');
  const [gmailPassword, setGmailPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [hasConfig, setHasConfig] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem('notificationsEnabled');
    return saved === 'true';
  });

  useEffect(() => {
    loadGmailConfig();
  }, []);

  const handleNotificationsToggle = () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    localStorage.setItem('notificationsEnabled', String(newValue));
  };

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
      setMessage(t.settings.fillAllFields);
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
        throw new Error(errorData.error || t.settings.configError);
      }

      setMessage(t.settings.success);
      setHasConfig(true);
      setGmailPassword('');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(`${t.settings.error} ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t.settings.title}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Languages size={20} className="text-gray-700 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t.settings.language}</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(languageNames) as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-4 py-3 rounded-md font-medium transition ${
                  language === lang
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {languageNames[lang]}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Moon size={20} className="text-gray-700 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t.settings.appearanceSection}</h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{t.settings.darkMode}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t.settings.darkModeDescription}</p>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative w-14 h-8 rounded-full transition ${
                theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                  theme === 'dark' ? 'translate-x-6' : ''
                }`}
              />
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={20} className="text-gray-700 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t.settings.notificationsSection}</h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{t.settings.enableNotifications}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t.settings.notificationsDescription}</p>
            </div>
            <button
              onClick={handleNotificationsToggle}
              className={`relative w-14 h-8 rounded-full transition ${
                notificationsEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                  notificationsEnabled ? 'translate-x-6' : ''
                }`}
              />
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail size={20} className="text-gray-700 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t.settings.gmailSection}</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t.settings.description}</p>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                {t.settings.gmailAddress}
              </label>
              <input
                type="email"
                value={gmailUser}
                onChange={(e) => setGmailUser(e.target.value)}
                placeholder={t.settings.emailPlaceholder}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                {t.settings.password}
              </label>
              <input
                type="password"
                value={gmailPassword}
                onChange={(e) => setGmailPassword(e.target.value)}
                placeholder={t.settings.passwordPlaceholder}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                required
              />
            </div>

            {message && (
              <div className={`p-3 rounded-md text-sm ${message.includes(t.settings.success) || message.includes('success') ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {loading ? t.settings.saving : hasConfig ? t.settings.update : t.settings.connect}
            </button>
          </form>

          {hasConfig && (
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-md">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-300">
                <Mail size={18} />
                <span className="font-semibold">{t.settings.connectedWith} {gmailUser}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
