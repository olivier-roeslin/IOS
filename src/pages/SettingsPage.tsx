import { useState, useEffect } from 'react';
import { Languages, Moon, Bell, Mail, Save } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { useTheme } from '../lib/ThemeContext';
import { languageNames, Language } from '../lib/translations';

export default function SettingsPage({ supabase }) {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem('notificationsEnabled');
    return saved === 'true';
  });

  const [gmailUser, setGmailUser] = useState('');
  const [gmailPassword, setGmailPassword] = useState('');
  const [gmailStatus, setGmailStatus] = useState('');
  const [savingGmail, setSavingGmail] = useState(false);

  useEffect(() => {
    loadGmailConfig();
  }, []);

  const loadGmailConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/configure-gmail`;
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.config) {
          setGmailUser(result.config.gmail_user || '');
        }
      }
    } catch (error) {
      console.error('Error loading Gmail config:', error);
    }
  };

  const handleSaveGmailConfig = async () => {
    if (!gmailUser || !gmailPassword) {
      setGmailStatus('Veuillez remplir tous les champs');
      return;
    }

    setSavingGmail(true);
    setGmailStatus('');

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/configure-gmail`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gmailUser,
          gmailPassword,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setGmailStatus('Configuration Gmail enregistrée avec succès');
        setGmailPassword('');
      } else {
        setGmailStatus(`Erreur: ${result.error || 'Erreur inconnue'}`);
      }
    } catch (error) {
      setGmailStatus(`Erreur: ${error.message}`);
    } finally {
      setSavingGmail(false);
      setTimeout(() => setGmailStatus(''), 5000);
    }
  };

  const handleNotificationsToggle = () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    localStorage.setItem('notificationsEnabled', String(newValue));
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

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Mail size={20} className="text-gray-700 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Configuration Gmail</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Adresse Gmail
              </label>
              <input
                type="email"
                value={gmailUser}
                onChange={(e) => setGmailUser(e.target.value)}
                placeholder="votre.email@gmail.com"
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mot de passe d'application Gmail
              </label>
              <input
                type="password"
                value={gmailPassword}
                onChange={(e) => setGmailPassword(e.target.value)}
                placeholder="xxxx xxxx xxxx xxxx"
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Créez un mot de passe d'application depuis les paramètres de sécurité Google
              </p>
            </div>

            {gmailStatus && (
              <div className={`p-3 rounded-md text-sm ${
                gmailStatus.includes('succès')
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              }`}>
                {gmailStatus}
              </div>
            )}

            <button
              onClick={handleSaveGmailConfig}
              disabled={savingGmail || !gmailUser || !gmailPassword}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-md transition disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={18} />
              {savingGmail ? 'Enregistrement...' : 'Enregistrer la configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
