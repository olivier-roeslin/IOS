import { AlertCircle, MessageCircle, FileText, Users, CircleUser as UserCircle, Settings } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';

export default function Sidebar({ currentPage, onPageChange }) {
  const { t } = useLanguage();

  const menuItems = [
    {
      id: 'report',
      label: t.sidebar.report,
      icon: AlertCircle,
    },
    {
      id: 'chatbot',
      label: t.sidebar.chatbot,
      icon: MessageCircle,
    },
    {
      id: 'documents',
      label: t.sidebar.documents,
      icon: FileText,
    },
    {
      id: 'contacts',
      label: t.sidebar.contacts,
      icon: Users,
    },
    {
      id: 'profile',
      label: t.sidebar.profile,
      icon: UserCircle,
    },
    {
      id: 'settings',
      label: t.sidebar.settings,
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 bg-gradient-to-b from-blue-600 to-teal-500 dark:from-gray-800 dark:to-gray-900 text-white flex flex-col p-6">
      <h1 className="text-3xl font-bold mb-8">AbusePas</h1>

      <nav className="space-y-3 flex-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition ${
                isActive
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-white'
                  : 'text-white hover:bg-white hover:bg-opacity-10'
              }`}
            >
              <Icon size={20} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="text-xs text-blue-100 dark:text-gray-400">
        Made in Neuchâtel
      </div>
    </aside>
  );
}
