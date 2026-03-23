import { useState, useEffect } from 'react';
import { Phone, Mail, ChevronRight, Send, RefreshCw } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';

const EMAIL_DESTINATAIRE = 'sine.nomine.1011000@gmail.com';

const getContacts = (t) => [
  {
    id: 1,
    titleKey: 'psychologist',
    name: 'Dr. Marie Dubois',
    phone: '+41774236788',
    email: EMAIL_DESTINATAIRE,
    category: 'support',
  },
  {
    id: 2,
    titleKey: 'legalAssistant',
    name: 'Me. Jean-Pierre Martin',
    phone: '+41774236788',
    email: EMAIL_DESTINATAIRE,
    category: 'legal',
  },
  {
    id: 3,
    titleKey: 'apprenticeshipCommissioner',
    name: 'Sophie Müller',
    phone: '+41774236788',
    email: EMAIL_DESTINATAIRE,
    category: 'school',
  },
  {
    id: 4,
    titleKey: 'harassmentHelp',
    nameKey: 'helpline247',
    phone: '+41774236788',
    email: EMAIL_DESTINATAIRE,
    category: 'urgent',
  },
  {
    id: 5,
    titleKey: 'schoolDoctor',
    name: 'Dr. Paul Fontaine',
    phone: '+41774236788',
    email: EMAIL_DESTINATAIRE,
    category: 'support',
  },
  {
    id: 6,
    titleKey: 'policeEmergency',
    nameKey: 'cantonalPolice',
    phone: '117',
    email: EMAIL_DESTINATAIRE,
    category: 'urgent',
  },
  {
    id: 7,
    titleKey: 'apprenticeLawyer',
    name: 'Me. Claire Rochat',
    phone: '+41774236788',
    email: EMAIL_DESTINATAIRE,
    category: 'legal',
  },
  {
    id: 8,
    titleKey: 'schoolDirector',
    name: 'M. Bernard Favre',
    phone: '+41774236788',
    email: EMAIL_DESTINATAIRE,
    category: 'school',
  },
];

export default function ContactsPage({ supabase }) {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const CONTACTS = getContacts(t);
  const [selectedContact, setSelectedContact] = useState<typeof CONTACTS[0] | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Record<number, Array<{ text: string; date: Date; isSent: boolean; from: string; to: string }>>>({});
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState('');
  const [fetchingEmails, setFetchingEmails] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userGmailEmail, setUserGmailEmail] = useState<string | null>(null);

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

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);

        const { data: gmailConfig } = await supabase
          .from('gmail_config')
          .select('gmail_user')
          .eq('user_id', user.id)
          .maybeSingle();

        if (gmailConfig?.gmail_user) {
          setUserGmailEmail(gmailConfig.gmail_user);
        }

        loadMessages(user.id, gmailConfig?.gmail_user || null);
      }
    };
    getUser();

    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');

    if (accessToken && userId) {
      (async () => {
        await supabase
          .from('gmail_config')
          .upsert({
            user_id: userId,
            oauth_access_token: accessToken,
            oauth_token_expiry: new Date(Date.now() + 3600 * 1000),
            updated_at: new Date()
          });

        window.location.hash = '';
        setEmailStatus('Gmail connecté avec succès!');
        setTimeout(() => setEmailStatus(''), 3000);
      })();
    }
  }, []);

  useEffect(() => {
    if (selectedContact && userId) {
      loadMessages(userId, userGmailEmail);
    }
  }, [selectedContact, userId]);

  const loadMessages = async (uid: string, gmailEmail: string | null) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', uid)
        .order('received_at', { ascending: true });

      if (error) throw error;

      if (data) {
        const messagesByContact: Record<number, Array<{ text: string; date: Date; isSent: boolean; from: string; to: string }>> = {};
        const userEmail = gmailEmail?.toLowerCase() || '';

        CONTACTS.forEach(contact => {
          const contactEmail = contact.email.toLowerCase();

          const contactMessages = data.filter(msg => {
            const fromEmail = msg.from_email?.toLowerCase() || '';
            const toEmail = msg.to_email?.toLowerCase() || '';

            const sentByUser = fromEmail === userEmail && toEmail === contactEmail;
            const receivedFromContact = fromEmail === contactEmail && toEmail === userEmail;

            return sentByUser || receivedFromContact;
          }).map(msg => ({
            text: msg.body || '',
            date: new Date(msg.received_at),
            isSent: msg.is_sent || false,
            from: msg.from_email,
            to: msg.to_email,
            subject: msg.subject
          }));

          if (contactMessages.length > 0) {
            messagesByContact[contact.id] = contactMessages;
          }
        });

        setMessages(messagesByContact);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const fetchNewEmails = async () => {
    if (!userId) return;

    setFetchingEmails(true);
    setEmailStatus('Connexion à Gmail...');

    try {
      const { data: gmailConfig } = await supabase
        .from('gmail_config')
        .select('oauth_access_token')
        .eq('user_id', userId)
        .maybeSingle();

      if (!gmailConfig?.oauth_access_token) {
        const clientId = '440080497152-88nhm41p9ecffp3mjjhbkl0kf37jkkqd.apps.googleusercontent.com';
        const redirectUri = `${window.location.origin}`;
        const scope = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send';

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}`;

        window.location.href = authUrl;
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-gmail-messages`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          access_token: gmailConfig.oauth_access_token
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setEmailStatus(`${result.messageCount} nouveaux messages synchronisés`);
        await loadMessages(userId, userGmailEmail);
      } else {
        setEmailStatus(`Erreur de synchronisation: ${result.error}`);
      }
    } catch (error) {
      setEmailStatus(`Erreur: ${error.message}`);
    } finally {
      setFetchingEmails(false);
      setTimeout(() => setEmailStatus(''), 5000);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedContact) return;

    setSendingEmail(true);
    setEmailStatus('');

    const messageText = message.trim();
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
          subject: `Message pour ${t.contacts[selectedContact.titleKey]}`,
          message: messageText,
          fromName: 'AbusePas'
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setEmailStatus(t.contacts.successSent);
        if (userId) {
          await loadMessages(userId, userGmailEmail);
        }
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t.contacts.title}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t.contacts.description}</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
        <div className="flex gap-3 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-4 py-2 rounded-md font-medium transition ${
                selectedCategory === cat.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
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
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t.contacts[contact.titleKey]}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{contact.nameKey ? t.contacts[contact.nameKey] : contact.name}</p>
              <div className="space-y-2 mb-4">
                <a
                  href={`tel:${contact.phone}`}
                  className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-md transition"
                >
                  <Phone size={16} className="text-blue-600" />
                  {contact.phone}
                </a>
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2 p-2">
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <button
            onClick={() => setSelectedContact(null)}
            className="mb-6 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← {t.contacts.back}
          </button>

          <div className="bg-blue-50 dark:bg-gray-900 rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t.contacts[selectedContact.titleKey]}</h2>
            <div className="space-y-3">
              <p className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <span className="font-semibold">{t.contacts.name}:</span> {selectedContact.nameKey ? t.contacts[selectedContact.nameKey] : selectedContact.name}
              </p>
              <a
                href={`tel:${selectedContact.phone}`}
                className="text-gray-700 dark:text-gray-300 flex items-center gap-2 hover:text-blue-600 transition"
              >
                <Phone size={18} className="text-blue-600" />
                <span className="font-semibold">{t.contacts.phone}:</span> {selectedContact.phone}
              </a>
              <p className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Mail size={18} className="text-blue-600" />
                <span className="font-semibold">{t.contacts.email}:</span> {selectedContact.email}
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t.contacts.history}</h3>
            <button
              onClick={fetchNewEmails}
              disabled={fetchingEmails}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition disabled:opacity-50 text-sm"
            >
              <RefreshCw size={16} className={fetchingEmails ? 'animate-spin' : ''} />
              Synchroniser
            </button>
          </div>

          <div className="mb-6 space-y-3 max-h-96 overflow-y-auto">
            {messages[selectedContact.id]?.length > 0 ? (
              messages[selectedContact.id].map((msg, idx) => (
                <div key={idx} className={`rounded-lg p-4 ${msg.isSent ? 'bg-blue-600 text-white ml-8' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white mr-8'}`}>
                  <p className="text-xs font-semibold mb-2">
                    {msg.isSent ? 'Vous' : (selectedContact.nameKey ? t.contacts[selectedContact.nameKey] : selectedContact.name)}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  <p className={`text-xs mt-2 ${msg.isSent ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                    {msg.date.toLocaleString('fr-CH')}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-600 dark:text-gray-400">
                {t.contacts.noMessages} {selectedContact.nameKey ? t.contacts[selectedContact.nameKey] : selectedContact.name}.
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
              placeholder={`${t.contacts.writeTo} ${selectedContact.nameKey ? t.contacts[selectedContact.nameKey] : selectedContact.name}...`}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
