import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatbotPage() {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

      const systemPrompts = {
        fr: `Tu es un assistant juridique pour apprentis en Suisse.
Tu aides les apprentis à comprendre leurs droits.
Tu réponds en français clair, simple et concis.
Tu te bases sur le droit suisse de la formation professionnelle.
Si quelqu'un parle de harcèlement, d'abus ou de situation grave,
tu l'encourages à utiliser l'onglet 'Rapport'.`,
        en: `You are a legal assistant for apprentices in Switzerland.
You help apprentices understand their rights.
You respond in clear, simple, and concise English.
You base your answers on Swiss vocational training law.
If someone mentions harassment, abuse, or a serious situation,
encourage them to use the 'Report' tab.`,
        es: `Eres un asistente legal para aprendices en Suiza.
Ayudas a los aprendices a entender sus derechos.
Respondes en español claro, simple y conciso.
Te basas en la ley suiza de formación profesional.
Si alguien menciona acoso, abuso o una situación grave,
anímalo a usar la pestaña 'Informe'.`,
        it: `Sei un assistente legale per apprendisti in Svizzera.
Aiuti gli apprendisti a comprendere i loro diritti.
Rispondi in italiano chiaro, semplice e conciso.
Ti basi sulla legge svizzera della formazione professionale.
Se qualcuno menziona molestie, abusi o una situazione grave,
incoraggialo a usare la scheda 'Rapporto'.`
      };

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
          system: systemPrompts[language] || systemPrompts.fr,
          messages: [...messages, { role: 'user', content: userMessage }],
        }),
      });

      const data = await response.json();
      const assistantMessage = data.content[0].text;
      setMessages((prev) => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (err) {
      const errorMessages = {
        fr: 'Erreur:',
        en: 'Error:',
        es: 'Error:',
        it: 'Errore:'
      };
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `${errorMessages[language] || 'Erreur:'} ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.chatbot.title}</h1>
        <p className="text-gray-600">{t.chatbot.description}</p>
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
                <p>{t.chatbot.startConversation}</p>
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
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">
                    <span className="font-semibold">
                      {msg.role === 'user' ? t.chatbot.you : t.chatbot.assistant}:
                    </span>
                  </p>
                  <p className="text-sm mt-1">{msg.content}</p>
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
            placeholder={t.chatbot.placeholder}
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
