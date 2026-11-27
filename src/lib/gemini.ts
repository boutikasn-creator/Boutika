/**
 * Assistants IA de Boutika — côté NAVIGATEUR.
 * Plus aucune clé d'IA ici : tous les appels passent par le serveur Boutika, qui garde la clé
 * GEMINI_API_KEY secrète et lit les vraies données de la base. Le jeton de session est ajouté
 * automatiquement (voir apiAuth.ts).
 *
 * Les réponses s'affichent EN DIRECT (mot après mot) : on n'attend plus la réponse complète.
 * Si l'IA est injoignable, l'utilisateur en est informé avec la raison : plus de faux rapport.
 */

// Conservé pour compatibilité avec d'anciens imports : il n'y a plus de client IA dans le navigateur
export const getGeminiClient = () => null;

export type ChatTurn = { role: 'user' | 'model'; content: string };

const SERVER_DOWN = 'Je n’arrive pas à joindre le serveur Boutika. Vérifiez qu’il est bien lancé (npm run dev), puis réessayez.';
const ERROR_MARKER = '[[ERREUR]]';

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      /* réponse non JSON */
    }
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

/**
 * Envoie la conversation et reçoit la réponse en continu. `onChunk` est appelé avec le texte déjà reçu.
 */
export async function streamChat(
  url: string,
  messages: ChatTurn[],
  onChunk: (textSoFar: string) => void
): Promise<{ ok: boolean; text: string; error?: string }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages.slice(-14) })
    });

    if (!res.ok || !res.body) {
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        /* non JSON */
      }
      return { ok: false, text: '', error: data?.message || 'Une erreur est survenue.' };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let acc = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      acc += decoder.decode(value, { stream: true });
      const idx = acc.indexOf(ERROR_MARKER);
      onChunk(idx >= 0 ? acc.slice(0, idx) : acc);
    }

    const idx = acc.indexOf(ERROR_MARKER);
    if (idx >= 0) {
      return { ok: false, text: acc.slice(0, idx).trim(), error: acc.slice(idx + ERROR_MARKER.length).trim() };
    }
    return { ok: true, text: acc.trim() };
  } catch {
    return { ok: false, text: '', error: SERVER_DOWN };
  }
}

export const streamKimsi = (messages: ChatTurn[], onChunk: (t: string) => void) =>
  streamChat('/api/kimsi/chat-stream', messages, onChunk);

export const streamVipAssistant = (messages: ChatTurn[], onChunk: (t: string) => void) =>
  streamChat('/api/vip/chat-stream', messages, onChunk);

// Mémoire de la conversation avec Kimsi pour l'ancienne interface (réponse complète)
const kimsiHistory: ChatTurn[] = [];

/**
 * Kimsi (réponse complète, sans affichage en direct) : conservé pour compatibilité.
 */
export async function askKimsiAI(
  prompt: string,
  _contextSummary?: unknown
): Promise<{ answer: string; insights: string[]; audioBase64?: string }> {
  const turns: ChatTurn[] = [...kimsiHistory, { role: 'user', content: prompt }].slice(-14);
  const r = await postJson('/api/kimsi/chat', { messages: turns });

  if (!r.ok || !r.data?.success) {
    const message = r.status === 0 ? SERVER_DOWN : r.data?.message || 'Une erreur est survenue.';
    return { answer: `⚠️ ${message}`, insights: [] };
  }

  kimsiHistory.push({ role: 'user', content: prompt }, { role: 'model', content: String(r.data.answer) });
  while (kimsiHistory.length > 20) kimsiHistory.shift();

  return {
    answer: String(r.data.answer),
    insights: Array.isArray(r.data.insights) ? r.data.insights : []
  };
}

/**
 * Assistant VIP (réponse complète) : conservé pour compatibilité.
 */
export async function askVipAssistant(history: ChatTurn[]): Promise<{ ok: boolean; answer: string }> {
  const r = await postJson('/api/vip/chat', { messages: history.slice(-14) });
  if (!r.ok || !r.data?.success) {
    const message = r.status === 0 ? SERVER_DOWN : r.data?.message || 'Une erreur est survenue.';
    return { ok: false, answer: message };
  }
  return { ok: true, answer: String(r.data.answer) };
}

/**
 * Assistant VIP (vendeur) : aide à la fiche produit. Lève une erreur claire si l'IA est indisponible
 * (plus aucun produit "inventé" par défaut).
 */
export async function analyzeProductPhotoVIP(productHint: string): Promise<{
  name: string;
  description: string;
  category: string;
  suggestedPrice: number;
  sizes: string[];
  colors: string[];
}> {
  const r = await postJson('/api/vip/product-assist', { hint: productHint });
  if (!r.ok || !r.data?.success || !r.data.product) {
    throw new Error(r.status === 0 ? SERVER_DOWN : r.data?.message || 'Assistant IA indisponible.');
  }
  const p = r.data.product;
  return {
    name: p.name,
    description: p.description,
    category: p.category,
    suggestedPrice: p.suggestedPrice,
    sizes: p.sizes,
    colors: p.colors
  };
}
