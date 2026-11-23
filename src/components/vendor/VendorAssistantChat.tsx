import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { askVipAssistant, type ChatTurn } from '../../lib/gemini';
import { Bot, Send, X, RefreshCw, Sparkles } from 'lucide-react';

type UiMessage = { id: string; role: 'user' | 'model'; content: string; error?: boolean; local?: boolean };

const SUGGESTIONS = [
  'Bonjour !',
  'Où en sont mes ventes ?',
  'Quel est mon produit le plus vendu ?',
  'Comment vendre davantage cette semaine ?'
];

/**
 * Assistant IA VIP : discussion directe avec l'assistant de la boutique (formule VIP uniquement).
 * Bulle flottante en bas à droite du tableau de bord vendeur.
 */
export const VendorAssistantChat: React.FC = () => {
  const { currentUser, activeStore, plans } = useApp();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      local: true,
      content: 'Bonjour ! Je suis votre assistant IA VIP. Posez-moi vos questions sur vos ventes, vos stocks, vos prix ou vos idées pour vendre davantage.'
    }
  ]);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open, busy]);

  const planKey = activeStore.planId === 'decouverte' ? 'standard' : activeStore.planId;
  const plan = plans.find((p) => p.id === planKey);

  // Visible uniquement pour un vendeur dont la formule inclut l'assistant IA (VIP)
  if (currentUser.role !== 'vendor' || !activeStore.id || !plan?.hasVipAiAssistant) return null;

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || busy) return;
    setInput('');

    const userMsg: UiMessage = { id: `u-${Date.now()}`, role: 'user', content: clean };
    const next = [...messages, userMsg];
    setMessages(next);
    setBusy(true);

    // Le message d'accueil est local : il n'est pas envoyé au serveur
    const history: ChatTurn[] = next
      .filter((m) => !m.local && !m.error)
      .map((m) => ({ role: m.role, content: m.content }));

    const res = await askVipAssistant(history);
    setMessages((prev) => [
      ...prev,
      { id: `a-${Date.now()}`, role: 'model', content: res.ok ? res.answer : `⚠️ ${res.answer}`, error: !res.ok }
    ]);
    setBusy(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-tr from-amber-600 to-orange-600 text-white font-bold text-sm shadow-xl hover:shadow-2xl transition-all"
      >
        <Bot className="w-5 h-5" />
        <span>Assistant IA</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 w-[calc(100vw-2.5rem)] sm:w-96 h-[32rem] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden">
      {/* En-tête */}
      <div className="px-4 py-3 bg-stone-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">Assistant IA VIP</p>
            <p className="text-[10px] text-stone-400 leading-tight">{activeStore.name}</p>
          </div>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/10" aria-label="Fermer">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-stone-50 text-xs">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] px-3 py-2 rounded-2xl whitespace-pre-wrap leading-relaxed ${
                m.role === 'user'
                  ? 'bg-amber-600 text-white rounded-br-sm'
                  : m.error
                  ? 'bg-red-50 text-red-800 border border-red-200 rounded-bl-sm'
                  : 'bg-white text-stone-800 border border-stone-200 rounded-bl-sm'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-2xl bg-white border border-stone-200 text-stone-500 flex items-center gap-2">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>L'assistant réfléchit...</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="px-3 py-2 border-t border-stone-100 bg-white flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Saisie */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="p-3 border-t border-stone-200 bg-white flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Écrivez votre message..."
          maxLength={1000}
          className="flex-1 px-3 py-2 text-xs border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="p-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white"
          aria-label="Envoyer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
