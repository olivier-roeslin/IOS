import { useState } from 'react';
import { Phone, Mail, ChevronRight } from 'lucide-react';

const CONTACTS = [
  {
    id: 1,
    title: 'Psychologue',
    name: 'Dr. Marie Dubois',
    phone: '+41 32 456 78 90',
    email: 'marie@example.com',
    category: 'Soutien',
  },
  {
    id: 2,
    title: 'Assistant juridique',
    name: 'Me. Jean-Pierre Martin',
    phone: '+41 32 456 78 91',
    email: 'jean@example.com',
    category: 'Juridique',
  },
  {
    id: 3,
    title: 'Commissaire d\'apprentissage',
    name: 'Sophie Müller',
    phone: '+41 32 456 78 92',
    email: 'sophie@example.com',
    category: 'École',
  },
  {
    id: 4,
    title: 'Aide au harcèlement',
    name: 'Ligne d\'écoute 24/7',
    phone: '+41 800 123 456',
    email: 'help@example.com',
    category: 'Urgence',
  },
  {
    id: 5,
    title: 'Médecin scolaire',
    name: 'Dr. Paul Fontaine',
    phone: '+41 32 456 78 93',
    email: 'paul@example.com',
    category: 'Soutien',
  },
  {
    id: 6,
    title: 'Police secours',
    name: 'Police cantonale',
    phone: '117',
    email: 'police@example.com',
    category: 'Urgence',
  },
  {
    id: 7,
    title: 'Avocat apprentis',
    name: 'Me. Claire Rochat',
    phone: '+41 32 456 78 94',
    email: 'claire@example.com',
    category: 'Juridique',
  },
  {
    id: 8,
    title: 'Directeur école',
    name: 'M. Bernard Favre',
    phone: '+41 32 456 78 95',
    email: 'bernard@example.com',
    category: 'École',
  },
];

const CATEGORIES = ['Tous', 'Urgence', 'Juridique', 'École', 'Soutien'];

export default function ContactsPage() {
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [selectedContact, setSelectedContact] = useState<typeof CONTACTS[0] | null>(null);

  const filteredContacts =
    selectedCategory === 'Tous'
      ? CONTACTS
      : CONTACTS.filter((c) => c.category === selectedCategory);

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
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition cursor-pointer"
              onClick={() => setSelectedContact(contact)}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{contact.title}</h3>
              <p className="text-sm text-gray-600 mb-4">{contact.name}</p>
              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <Phone size={16} />
                  {contact.phone}
                </p>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <Mail size={16} />
                  {contact.email}
                </p>
              </div>
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md transition text-sm flex items-center justify-center gap-2">
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
              <p className="text-gray-700 flex items-center gap-2">
                <Phone size={18} className="text-blue-600" />
                {selectedContact.phone}
              </p>
              <p className="text-gray-700 flex items-center gap-2">
                <Mail size={18} className="text-blue-600" />
                {selectedContact.email}
              </p>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-4">Historique</h3>
          <p className="text-gray-600 mb-6">Aucun message encore. Écris à {selectedContact.name} ci-dessous.</p>

          <div className="flex gap-3">
            <input
              type="text"
              placeholder={`Écrire à ${selectedContact.name}...`}
              className="flex-1 px-4 py-2 bg-gray-100 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-md transition">
              Envoyer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
