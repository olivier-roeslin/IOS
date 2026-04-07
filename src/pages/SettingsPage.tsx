import { useState, useEffect } from 'react';
import { Languages, Moon, Bell, User, Camera, Save } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { useTheme } from '../lib/ThemeContext';
import { languageNames, Language } from '../lib/translations';
import ImageCropper from '../components/ImageCropper';

export default function SettingsPage({ supabase, onProfileUpdate }) {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem('notificationsEnabled');
    return saved === 'true';
  });

  const [displayName, setDisplayName] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [showCropper, setShowCropper] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserEmail(user.email);

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name, profile_photo_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) {
        setDisplayName(profile.display_name || '');
        setProfilePhotoUrl(profile.profile_photo_url || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatus(t.profile?.errorInvalidImage || 'Please select a valid image file');
      setTimeout(() => setStatus(''), 3000);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setTempImageUrl(reader.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedImage: string) => {
    setProfilePhotoUrl(croppedImage);
    setShowCropper(false);
    setTempImageUrl('');
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setTempImageUrl('');
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setStatus('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingProfile) {
        const { error } = await supabase
          .from('user_profiles')
          .update({
            display_name: displayName,
            profile_photo_url: profilePhotoUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            display_name: displayName,
            profile_photo_url: profilePhotoUrl,
          });

        if (error) throw error;
      }

      if (onProfileUpdate) {
        onProfileUpdate({ display_name: displayName, profile_photo_url: profilePhotoUrl });
      }

      setStatus(t.profile?.successSaved || 'Profile saved successfully!');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setStatus(t.profile?.errorSave || 'Error saving profile');
      setTimeout(() => setStatus(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationsToggle = () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    localStorage.setItem('notificationsEnabled', String(newValue));
  };

  return (
    <div>
      {showCropper && (
        <ImageCropper
          imageUrl={tempImageUrl}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t.settings.title}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <User size={20} className="text-gray-700 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t.profile?.title || 'Profile'}
            </h2>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                  {profilePhotoUrl ? (
                    <img
                      src={profilePhotoUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={48} className="text-gray-400" />
                  )}
                </div>
                <label
                  htmlFor="photo-upload"
                  className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 cursor-pointer transition"
                >
                  <Camera size={20} />
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.profile?.emailLabel || 'Email'}
                </label>
                <input
                  type="email"
                  value={userEmail}
                  disabled
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.profile?.displayNameLabel || 'Display Name'}
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t.profile?.displayNamePlaceholder || 'Enter your name'}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>

              {status && (
                <div className={`p-3 rounded-md text-sm ${
                  status.includes('success') || status.includes('succès')
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {status}
                </div>
              )}

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-md transition disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={18} />
                {saving ? (t.profile?.saving || 'Saving...') : (t.profile?.saveButton || 'Save Profile')}
              </button>
            </div>
          </div>
        </div>
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
      </div>
    </div>
  );
}
