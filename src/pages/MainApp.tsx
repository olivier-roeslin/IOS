import { useState, useEffect } from 'react';
import { LogOut, User } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ReportPage from './ReportPage';
import ChatbotPage from './ChatbotPage';
import DocumentsPage from './DocumentsPage';
import ContactsPage from './ContactsPage';
import ProfilePage from './ProfilePage';
import SettingsPage from './SettingsPage';
import { useLanguage } from '../lib/LanguageContext';

export default function MainApp({ session, supabase }) {
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState('report');
  const [userProfile, setUserProfile] = useState({ display_name: '', profile_photo_url: '' });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name, profile_photo_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />

      <div className="flex-1 flex flex-col">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
              {userProfile.profile_photo_url ? (
                <img
                  src={userProfile.profile_photo_url}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={20} className="text-gray-400" />
              )}
            </div>
            <div>
              {userProfile.display_name && (
                <div className="font-semibold text-gray-900 dark:text-white">
                  {userProfile.display_name}
                </div>
              )}
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {session.user.email}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition"
          >
            <LogOut size={18} />
            {t.header.logout}
          </button>
        </header>

        <main className="flex-1 overflow-auto p-8">
          {currentPage === 'report' && <ReportPage supabase={supabase} session={session} />}
          {currentPage === 'chatbot' && <ChatbotPage supabase={supabase} session={session} />}
          {currentPage === 'documents' && <DocumentsPage />}
          {currentPage === 'contacts' && <ContactsPage supabase={supabase} />}
          {currentPage === 'profile' && <ProfilePage supabase={supabase} />}
          {currentPage === 'settings' && <SettingsPage supabase={supabase} />}
        </main>
      </div>
    </div>
  );
}
