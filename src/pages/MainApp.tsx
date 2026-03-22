import { useState } from 'react';
import { LogOut } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ReportPage from './ReportPage';
import ChatbotPage from './ChatbotPage';
import DocumentsPage from './DocumentsPage';
import ContactsPage from './ContactsPage';
import SettingsPage from './SettingsPage';
import { useLanguage } from '../lib/LanguageContext';

export default function MainApp({ session, supabase }) {
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState('report');

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />

      <div className="flex-1 flex flex-col">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-4 flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t.header.connectedAs} <span className="font-semibold text-gray-900 dark:text-white">{session.user.email}</span>
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
          {currentPage === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}
