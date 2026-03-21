import { useState, useEffect } from 'react';
import { Phone, Mail, ChevronRight, Send } from 'lucide-react';

const EMAIL_DESTINATAIRE = 'tatyanalorenzetti@gmail.com';

const CONTACTS = [
  {
    id: 1,
    title: 'Psychologue',
    name: 'Dr. Marie Dubois',
    phone: '+41324567890',
    email: EMAIL_DESTINATAIRE,
    category: 'Soutien',
  },
  {
    id: 2,
    title: 'Assistant juridique',
    name: 'Me. Jean-Pierre Martin',
    phone: '+41324567891',
    email: EMAIL_DESTINATAIRE,
    category: 'Juridique',
  },
  {
    id: 3,
    title: 'Commissaire d\'apprentissage',
    name: 'Sophie Müller',
    phone: '+41324567892',
    email: EMAIL_DESTINATAIRE,
    category: 'École',
  },
  {
    id: 4,
    title: 'Aide au harcèlement',
    name: 'Ligne d\'écoute 24/7',
    phone: '+41800123456',
    email: EMAIL_DESTINATAIRE,
    category: 'Urgence',
  },
  {
    id: 5,
    title: 'Médecin scolaire',
    name: 'Dr. Paul Fontaine',
    phone: '+41324567893',
    email: EMAIL_DESTINATAIRE,
    category: 'Soutien',
  },
  {
    id: 6,
    title: 'Police secours',
    name: 'Police cantonale',
    phone: '117',
    email: EMAIL_DESTINATAIRE,
    category: 'Urgence',
  },
  {
    id: 7,
    title: 'Avocat apprentis',
    name: 'Me. Claire Rochat',
    phone: '+41324567894',
    email: EMAIL_DESTINATAIRE,
    category: 'Juridique',
  },
  {
    id: 8,
    title: 'Directeur école',
    name: 'M. Bernard Favre',
    phone: '+41324567895',
    email: EMAIL_DESTINATAIRE,
    category: 'École',
  },
];

const CATEGORIES = ['Tous', 'Urgence', 'Juridique', 'École', 'Soutien'];

export default function ContactsPage() {
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [selectedContact, setSelectedContact] = useState<typeof CONTACTS[0] | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Record<number, Array<{ text: string; date: Date }>>>({});
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState('');

  const filteredContacts =
    selectedCategory === 'Tous'
      ? CONTACTS
      : CONTACTS.filter((c) => c.category === selectedCategory);

  const handlePhoneClick = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

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

    const mailtoLink = `mailto:${selectedContact.email}?subject=${encodeURIComponent(
      `Message de AbusePas - ${selectedContact.title}`
    )}&body=${encodeURIComponent(
      `Message pour ${selectedContact.name} (${selectedContact.title}):\n\n${messageText}`
    )}`;

    window.location.href = mailtoLink;

    setMessage('');
    setEmailStatus('✅ Client email ouvert. Message envoyé!');
    setSendingEmail(false);

    setTimeout(() => setEmailStatus(''), 3000);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Contacts</h1>
        <p className="text-gray-600">Choisis une catégorie puis ouvre un contact.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex gap-3 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-md font-medium transition ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }`}
            >
              {cat}
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
                <button
                  onClick={() => handlePhoneClick(contact.phone)}
                  className="w-full text-left text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2 p-2 hover:bg-blue-50 rounded transition"
                >
                  <Phone size={16} />
                  {contact.phone}
                </button>
                <p className="text-sm text-gray-600 flex items-center gap-2 p-2">
                  <Mail size={16} />
                  Contact via app
                </p>
              </div>
              <button
                onClick={() => setSelectedContact(contact)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md transition text-sm flex items-center justify-center gap-2"
              >
                Contacter
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
            ← Retour
          </button>

          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{selectedContact.title}</h2>
            <div className="space-y-3">
              <p className="text-gray-700 flex items-center gap-2">
                <span className="font-semibold">Nom:</span> {selectedContact.name}
              </p>
              <button
                onClick={() => handlePhoneClick(selectedContact.phone)}
                className="text-blue-600 hover:text-blue-700 flex items-center gap-2 font-medium"
              >
                <Phone size={18} className="text-blue-600" />
                {selectedContact.phone} (Cliquer pour appeler)
              </button>
              <p className="text-gray-700 flex items-center gap-2">
                <Mail size={18} className="text-blue-600" />
                {selectedContact.email}
              </p>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-4">Historique</h3>

          <div className="mb-6 space-y-3 max-h-96 overflow-y-auto">
            {messages[selectedContact.id]?.length > 0 ? (
              messages[selectedContact.id].map((msg, idx) => (
                <div key={idx} className="bg-blue-600 text-white rounded-lg p-4">
                  <p className="text-xs font-semibold mb-2">Moi</p>
                  <p className="text-sm">{msg.text}</p>
                  <p className="text-xs text-blue-100 mt-2">
                    {msg.date.toLocaleString('fr-CH')}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-600">
                Aucun message encore. Écris à {selectedContact.name} ci-dessous.
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
              placeholder={`Écrire à ${selectedContact.name}...`}
              className="flex-1 px-4 py-2 bg-gray-100 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={sendingEmail || !message.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-md transition disabled:opacity-50 flex items-center gap-2"
            >
              <Send size={18} />
              Envoyer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
