import { useState } from 'react';
import { LogOut } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ReportPage from './ReportPage';
import ChatbotPage from './ChatbotPage';
import DocumentsPage from './DocumentsPage';
import ContactsPage from './ContactsPage';
import SettingsPage from './SettingsPage';

export default function MainApp({ session, supabase }) {
  const [currentPage, setCurrentPage] = useState('report');

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Connecté en tant que <span className="font-semibold text-gray-900">{session.user.email}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition"
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </header>

        <main className="flex-1 overflow-auto p-8">
          {currentPage === 'report' && <ReportPage supabase={supabase} session={session} />}
          {currentPage === 'chatbot' && <ChatbotPage />}
          {currentPage === 'documents' && <DocumentsPage />}
          {currentPage === 'contacts' && <ContactsPage supabase={supabase} />}
          {currentPage === 'settings' && <SettingsPage supabase={supabase} session={session} />}
        </main>
      </div>
    </div>
  );
}
