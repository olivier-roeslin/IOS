import { useState, useEffect } from 'react';
import { Send, Mail, RefreshCw } from 'lucide-react';

export default function ReportPage({ supabase, session }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [success, setSuccess] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [emailMessages, setEmailMessages] = useState([]);

  useEffect(() => {
    loadMessages();
    loadEmailMessages();
    const interval = setInterval(syncGmailMessages, 30000);

    const channel = supabase
      .channel('reports')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const loadMessages = async () => {
    const { data } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    setMessages(data || []);
  };

  const loadEmailMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('received_at', { ascending: true });

      if (error) throw error;
      setEmailMessages(data || []);
    } catch (err) {
      console.error('Error loading email messages:', err);
    }
  };

  const syncGmailMessages = async () => {
    setSyncing(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) return;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-gmail-messages`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });

      if (response.ok) {
        await loadEmailMessages();
      } else {
        const errorData = await response.json();
        console.error('Sync failed:', errorData);
      }
    } catch (err) {
      console.error('Error syncing Gmail:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');

    if (!description.trim()) {
      setLoading(false);
      return;
    }

    try {
      const reportTitle = title || 'Signalement sans titre';
      const { error } = await supabase.from('reports').insert({
        user_id: session.user.id,
        title: reportTitle,
        description,
        anonymous,
        user_email: anonymous ? null : session.user.email,
      });

      if (error) throw error;

      try {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        const emailMessage = `
Nouveau signalement reçu

Titre: ${reportTitle}
Type: ${anonymous ? 'Anonyme' : 'Non-anonyme'}
${!anonymous ? `Email: ${session.user.email}` : ''}

Description:
${description}
        `;

        const emailResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentSession?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: 'tatyanalorenzetti@gmail.com',
            subject: `Nouveau signalement: ${reportTitle}`,
            message: emailMessage,
            fromName: 'Application Harcèlement - Signalements'
          }),
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json();
          console.error('Email sending failed:', errorData);
          throw new Error(errorData.error || 'Failed to send email');
        }

        await loadEmailMessages();
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        throw emailError;
      }

      setSuccess('✅ Signalement envoyé avec succès!');
      setTitle('');
      setDescription('');
      setAnonymous(false);
      setTimeout(() => setSuccess(''), 3000);
      loadMessages();
    } catch (err) {
      setSuccess(`❌ Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Nouveau signalement</h1>
        <p className="text-gray-600">Décris la situation. Tu peux envoyer le message de manière anonyme.</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Titre</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre du signalement"
                className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description détaillée de la situation..."
                rows={6}
                className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="anonymous"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="anonymous" className="text-sm text-gray-700">
                Signalement anonyme
              </label>
            </div>

            <p className="text-sm text-gray-600">
              {anonymous ? '🔒 Envoi anonyme — votre email sera masqué' : `📧 Envoyé depuis : ${session.user.email}`}
            </p>

            {success && (
              <div className={`p-3 rounded-md text-sm ${success.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Send size={18} />
              {loading ? 'Envoi...' : 'Créer un signalement'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Conversation</h2>
            <button
              onClick={syncGmailMessages}
              disabled={syncing}
              className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              Sync Gmail
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3">
            {messages.length === 0 && emailMessages.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-8">
                Aucun message. Envoyez un signalement ou synchronisez vos emails.
              </p>
            ) : (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="bg-blue-50 rounded-lg p-3"
                  >
                    <p className="text-xs font-semibold text-blue-600 mb-1">Moi</p>
                    <p className="text-sm text-gray-900">
                      <strong>{msg.title}</strong>
                      <br />
                      {msg.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(msg.created_at).toLocaleString('fr-CH')}
                    </p>
                  </div>
                ))}
                {emailMessages.map((email) => (
                  <div
                    key={email.id}
                    className={`rounded-lg p-3 ${
                      email.is_sent
                        ? 'bg-blue-50'
                        : 'bg-green-50 border border-green-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {!email.is_sent && <Mail size={14} className="text-green-600" />}
                      <p className="text-xs font-semibold text-gray-700">
                        {email.is_sent ? 'Moi' : email.from_email}
                      </p>
                    </div>
                    {email.subject && (
                      <p className="text-xs text-gray-600 mb-1 font-medium">{email.subject}</p>
                    )}
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{email.body}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(email.received_at).toLocaleString('fr-CH')}
                    </p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
