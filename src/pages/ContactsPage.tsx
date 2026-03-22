import { useState } from 'react';
import { Phone, Mail, ChevronRight, Send } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';

const EMAIL_DESTINATAIRE = 'olivier.roeslin@gmail.com';

const CONTACTS = [
  {
    id: 1,
    title: 'Psychologue',
    name: 'Dr. Marie Dubois',
    phone: '+41774236788',
    email: EMAIL_DESTINATAIRE,
    category: 'support',
  },
  {
    id: 2,
    title: 'Assistant juridique',
    name: 'Me. Jean-Pierre Martin',
    phone: '+41774236788',
    email: EMAIL_DESTINATAIRE,
    category: 'legal',
  },
  {
    id: 3,
    title: 'Commissaire d\'apprentissage',
    name: 'Sophie Müller',
    phone: '+41774236788',
    email: EMAIL_DESTINATAIRE,
    category: 'school',
  },
  {
    id: 4,
    title: 'Aide au harcèlement',
    name: 'Ligne d\'écoute 24/7',
    phone: '+41774236788',
    email: EMAIL_DESTINATAIRE,
    category: 'urgent',
  },
  {
    id: 5,
    title: 'Médecin scolaire',
    name: 'Dr. Paul Fontaine',
    phone: '+41774236788',
    email: EMAIL_DESTINATAIRE,
    category: 'support',
  },
  {
    id: 6,
    title: 'Police secours',
    name: 'Police cantonale',
    phone: '117',
    email: EMAIL_DESTINATAIRE,
    category: 'urgent',
  },
  {
    id: 7,
    title: 'Avocat apprentis',
    name: 'Me. Claire Rochat',
    phone: '+41774236788',
    email: EMAIL_DESTINATAIRE,
    category: 'legal',
  },
  {
    id: 8,
    title: 'Directeur école',
    name: 'M. Bernard Favre',
    phone: '+41774236788',
    email: EMAIL_DESTINATAIRE,
    category: 'school',
  },
];

export default function ContactsPage({ supabase }) {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedContact, setSelectedContact] = useState<typeof CONTACTS[0] | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Record<number, Array<{ text: string; date: Date }>>>({});
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState('');

  const categories = [
    { key: 'all', label: t.contacts.all },
    { key: 'urgent', label: t.contacts.urgent },
    { key: 'legal', label: t.contacts.legal },
    { key: 'school', label: t.contacts.school },
    { key: 'support', label: t.contacts.support },
  ];

  const filteredContacts =
    selectedCategory === 'all'
      ? CONTACTS
      : CONTACTS.filter((c) => c.category === selectedCategory);

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedContact) return;

    setSendingEmail(true);
    setEmailStatus('');

    const messageText = message.trim();
    const newMessage = { text: messageText, date: new Date() };

    setMessages((prev) => ({
      ...prev,
      [selectedContact.id]: [...(prev[selectedContact.id] || []), newMessage],
    }));

    setMessage('');

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: selectedContact.email,
          subject: `Message pour ${selectedContact.title}`,
          message: messageText,
          fromName: 'Application Harcèlement'
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setEmailStatus(t.contacts.successSent);
      } else {
        const errorMsg = result.details?.message || result.error || 'Erreur inconnue';
        setEmailStatus(`${t.contacts.errorPrefix} ${errorMsg}`);
      }
    } catch (error) {
      setEmailStatus(`${t.contacts.errorPrefix} ${error.message}`);
    } finally {
      setSendingEmail(false);
      setTimeout(() => setEmailStatus(''), 5000);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.contacts.title}</h1>
        <p className="text-gray-600">{t.contacts.description}</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex gap-3 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-4 py-2 rounded-md font-medium transition ${
                selectedCategory === cat.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {!selectedContact ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{contact.title}</h3>
              <p className="text-sm text-gray-600 mb-4">{contact.name}</p>
              <div className="space-y-2 mb-4">
                <a
                  href={`tel:${contact.phone}`}
                  className="text-sm text-gray-700 flex items-center gap-2 p-2 hover:bg-gray-50 rounded-md transition"
                >
                  <Phone size={16} className="text-blue-600" />
                  {contact.phone}
                </a>
                <p className="text-sm text-gray-600 flex items-center gap-2 p-2">
                  <Mail size={16} />
                  {t.contacts.contactViaApp}
                </p>
              </div>
              <button
                onClick={() => setSelectedContact(contact)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md transition text-sm flex items-center justify-center gap-2"
              >
                {t.contacts.contactButton}
                <ChevronRight size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <button
            onClick={() => setSelectedContact(null)}
            className="mb-6 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← {t.contacts.back}
          </button>

          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{selectedContact.title}</h2>
            <div className="space-y-3">
              <p className="text-gray-700 flex items-center gap-2">
                <span className="font-semibold">{t.contacts.name}</span> {selectedContact.name}
              </p>
              <a
                href={`tel:${selectedContact.phone}`}
                className="text-gray-700 flex items-center gap-2 hover:text-blue-600 transition"
              >
                <Phone size={18} className="text-blue-600" />
                <span className="font-semibold">{t.contacts.phone}</span> {selectedContact.phone}
              </a>
              <p className="text-gray-700 flex items-center gap-2">
                <Mail size={18} className="text-blue-600" />
                <span className="font-semibold">{t.contacts.email}</span> {selectedContact.email}
              </p>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.contacts.history}</h3>

          <div className="mb-6 space-y-3 max-h-96 overflow-y-auto">
            {messages[selectedContact.id]?.length > 0 ? (
              messages[selectedContact.id].map((msg, idx) => (
                <div key={idx} className="bg-blue-600 text-white rounded-lg p-4">
                  <p className="text-xs font-semibold mb-2">{t.contacts.noMessages.split(' ')[0]}</p>
                  <p className="text-sm">{msg.text}</p>
                  <p className="text-xs text-blue-100 mt-2">
                    {msg.date.toLocaleString('fr-CH')}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-600">
                {t.contacts.noMessages} {selectedContact.name}.
              </p>
            )}
          </div>

          {emailStatus && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">
              {emailStatus}
            </div>
          )}

          <div className="flex gap-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={`${t.contacts.writeTo} ${selectedContact.name}...`}
              className="flex-1 px-4 py-2 bg-gray-100 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={sendingEmail || !message.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-md transition disabled:opacity-50 flex items-center gap-2"
            >
              <Send size={18} />
              {t.contacts.send}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
