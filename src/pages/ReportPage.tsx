import { useState, useEffect } from 'react';
import { Send, Mail, RefreshCw, Trash2 } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';

export default function ReportPage({ supabase, session }) {
  const { t } = useLanguage();
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
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: currentSession.user.id }),
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

  const handleDeleteConversation = async () => {
    if (!confirm(t.report.confirmDelete)) return;

    try {
      const { error: reportsError } = await supabase
        .from('reports')
        .delete()
        .eq('user_id', session.user.id);

      if (reportsError) throw reportsError;

      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('user_id', session.user.id);

      if (messagesError) throw messagesError;

      setMessages([]);
      setEmailMessages([]);
      setSuccess('✅ Conversation supprimée avec succès!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setSuccess(`${t.report.errorPrefix} ${err.message}`);
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

      setSuccess(t.report.successSent);
      setTitle('');
      setDescription('');
      setAnonymous(false);
      setTimeout(() => setSuccess(''), 3000);
      loadMessages();
    } catch (err) {
      setSuccess(`${t.report.errorPrefix} ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t.report.title}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t.report.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">{t.report.titleLabel}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.report.titlePlaceholder}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">{t.report.descriptionLabel}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.report.descriptionPlaceholder}
                rows={6}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
              <label htmlFor="anonymous" className="text-sm text-gray-700 dark:text-gray-300">
                {t.report.anonymous}
              </label>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              {anonymous ? t.report.anonymousSending : `${t.report.sentFrom} ${session.user.email}`}
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
              {loading ? t.report.sending : t.report.createButton}
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t.report.conversationTitle}</h2>
            <div className="flex gap-2">
              <button
                onClick={syncGmailMessages}
                disabled={syncing}
                className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                {t.report.syncGmail}
              </button>
              <button
                onClick={handleDeleteConversation}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                {t.report.deleteConversation}
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3">
            {messages.length === 0 && emailMessages.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400 text-sm text-center py-8">
                {t.report.noMessages}
              </p>
            ) : (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="bg-blue-50 dark:bg-gray-900 rounded-lg p-3"
                  >
                    <p className="text-xs font-semibold text-blue-600 mb-1">{t.report.me}</p>
                    <p className="text-sm text-gray-900 dark:text-white">
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
                        ? 'bg-blue-50 dark:bg-gray-900'
                        : 'bg-green-50 dark:bg-gray-900 border border-green-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {!email.is_sent && <Mail size={14} className="text-green-600" />}
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {email.is_sent ? t.report.me : email.from_email}
                      </p>
                    </div>
                    {email.subject && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium">{email.subject}</p>
                    )}
                    <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{email.body}</p>
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
