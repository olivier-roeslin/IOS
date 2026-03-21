import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';

export default function ReportPage({ supabase, session }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadMessages();
    const channel = supabase
      .channel('reports')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');

    if (!description.trim()) {
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.from('reports').insert({
        user_id: session.user.id,
        title: title || 'Signalement sans titre',
        description,
        anonymous,
        user_email: anonymous ? null : session.user.email,
      });

      if (error) throw error;

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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversation</h2>
          <div className="flex-1 overflow-y-auto space-y-3">
            {messages.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-8">
                Sélectionnez un signalement ou envoyez-en un nouveau pour voir la conversation.
              </p>
            ) : (
              messages.map((msg) => (
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
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
