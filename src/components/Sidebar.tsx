import { AlertCircle, MessageCircle, FileText, Users, Settings } from 'lucide-react';

export default function Sidebar({ currentPage, onPageChange }) {
  const menuItems = [
    {
      id: 'report',
      label: 'Dénonciation',
      icon: AlertCircle,
    },
    {
      id: 'chatbot',
      label: 'Chatbot',
      icon: MessageCircle,
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: FileText,
    },
    {
      id: 'contacts',
      label: 'Contacts',
      icon: Users,
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 bg-gradient-to-b from-blue-600 to-teal-500 text-white flex flex-col p-6">
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
                  ? 'bg-white text-blue-600'
                  : 'text-white hover:bg-white hover:bg-opacity-10'
              }`}
            >
              <Icon size={20} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="text-xs text-blue-100">
        Made in Bôle
      </div>
    </aside>
  );
}
