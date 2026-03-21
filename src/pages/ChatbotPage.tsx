import { useState, useRef, useEffect } from 'react';
import { Send, Mail, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Message {
  role: 'user' | 'assistant' | 'email';
  content: string;
  from?: string;
  subject?: string;
  receivedAt?: string;
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(syncGmailMessages, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('received_at', { ascending: true });

      if (error) throw error;

      const formattedMessages: Message[] = data.map((msg) => ({
        role: msg.is_sent ? 'user' : 'email',
        content: msg.body,
        from: msg.from_email,
        subject: msg.subject,
        receivedAt: new Date(msg.received_at).toLocaleString('fr-CH'),
      }));

      setMessages(formattedMessages);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const syncGmailMessages = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-gmail-messages`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        await loadMessages();
      }
    } catch (err) {
      console.error('Error syncing Gmail:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 900,
          system: `Tu es un assistant juridique pour apprentis en Suisse.
Tu aides les apprentis à comprendre leurs droits.
Tu réponds en français clair, simple et concis.
Tu te bases sur le droit suisse de la formation professionnelle.
Si quelqu'un parle de harcèlement, d'abus ou de situation grave,
tu l'encourages à utiliser l'onglet 'Dénoncer une situation'.`,
          messages: [...messages, { role: 'user', content: userMessage }],
        }),
      });

      const data = await response.json();
      const assistantMessage = data.content[0].text;
      setMessages((prev) => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Erreur: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Assistant juridique</h1>
          <p className="text-gray-600">Pose une question sur les droits des apprentis en Suisse.</p>
        </div>
        <button
          onClick={syncGmailMessages}
          disabled={syncing}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-md transition disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
          Sync Gmail
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 h-[600px] flex flex-col">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-4 mb-6"
        >
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-center">
              <div>
                <p className="text-4xl mb-2">💡</p>
                <p>Commencez une conversation.</p>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : msg.role === 'email'
                      ? 'bg-green-50 text-gray-900 border border-green-200'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {msg.role === 'email' && <Mail size={14} className="text-green-600" />}
                    <p className="text-sm font-semibold">
                      {msg.role === 'user' ? 'Vous' : msg.role === 'email' ? msg.from : 'Assistant'}
                    </p>
                  </div>
                  {msg.subject && (
                    <p className="text-xs text-gray-600 mb-1 font-medium">{msg.subject}</p>
                  )}
                  <p className="text-sm mt-1 whitespace-pre-wrap">{msg.content}</p>
                  {msg.receivedAt && (
                    <p className="text-xs text-gray-500 mt-2">{msg.receivedAt}</p>
                  )}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 px-4 py-3 rounded-lg">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez votre question..."
            disabled={loading}
            className="flex-1 px-4 py-2 bg-gray-100 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-md transition disabled:opacity-50 flex items-center gap-2"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
