import type { Express, Request, Response, RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

/**
 * Assistants IA de Boutika (côté SERVEUR uniquement : la clé GEMINI_API_KEY n'est jamais envoyée au navigateur).
 *  - POST /api/kimsi/chat, /api/kimsi/chat-stream          : Kimsi, l'assistante du Super Admin
 *  - POST /api/vip/chat, /api/vip/chat-stream              : assistant de discussion des vendeurs VIP
 *  - POST /api/vip/product-assist                          : aide à la fiche produit des vendeurs VIP
 *
 * Vitesse : réflexion du modèle réduite ("low"), réponse affichée en direct (streaming), vérification de
 * session et données de contexte gardées en mémoire quelques dizaines de secondes.
 *
 * Variables d'environnement : GEMINI_API_KEY (obligatoire), GEMINI_MODEL (facultatif).
 */

type ChatMsg = { role: 'user' | 'model'; content: string };

const DEFAULT_MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-2.5-flash'];

class AiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function modelCandidates(): string[] {
  const custom = (process.env.GEMINI_MODEL || '').trim();
  return custom ? [custom, ...DEFAULT_MODELS.filter((m) => m !== custom)] : DEFAULT_MODELS;
}

const isPlaceholder = (value?: string): boolean =>
  !value || /votre[-_ ]|your[-_ ]|exemple|example|xxxx|<.*>/i.test(value.trim());

// Configuration d'une requête : réflexion réduite pour des réponses beaucoup plus rapides
function buildConfig(model: string, system: string, json: boolean, withThinking: boolean): any {
  const cfg: any = {
    systemInstruction: system,
    temperature: json ? 0.4 : 0.7,
    maxOutputTokens: 2048
  };
  if (json) cfg.responseMimeType = 'application/json';
  if (withThinking) {
    if (/^gemini-3/i.test(model)) cfg.thinkingConfig = { thinkingLevel: 'low' };
    else if (/^gemini-2\.5-flash/i.test(model)) cfg.thinkingConfig = { thinkingBudget: 0 };
  }
  return cfg;
}

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (isPlaceholder(apiKey)) {
    throw new AiError(
      503,
      'L\u2019assistant IA est hors ligne : la clé GEMINI_API_KEY n\u2019est pas configurée sur le serveur (fichier .env). Créez-la dans Google AI Studio, ajoutez-la au fichier .env, puis relancez le serveur.'
    );
  }
  return new GoogleGenAI({ apiKey: apiKey as string });
}

function isFatalForAllModels(msg: string): boolean {
  return /API key|API_KEY|permission|PERMISSION|UNAUTHENTICATED|401|403|quota|RESOURCE_EXHAUSTED|429/i.test(msg);
}

function mapAiError(lastErr: any): AiError {
  const raw = String(lastErr?.message || lastErr || 'erreur inconnue');
  console.error('[IA] échec de l\u2019appel Gemini :', raw.slice(0, 400));
  if (/API key|API_KEY|UNAUTHENTICATED|401|403|permission/i.test(raw)) {
    return new AiError(502, 'La clé GEMINI_API_KEY est refusée par Google (invalide, désactivée ou sans accès). Vérifiez-la dans Google AI Studio.');
  }
  if (/quota|429|RESOURCE_EXHAUSTED/i.test(raw)) {
    return new AiError(429, 'Le quota de l\u2019API Gemini est atteint pour le moment. Réessayez dans quelques minutes.');
  }
  if (/not found|404|NOT_FOUND/i.test(raw)) {
    return new AiError(502, 'Aucun des modèles Gemini configurés n\u2019est disponible. Renseignez GEMINI_MODEL dans le fichier .env avec un modèle valide.');
  }
  return new AiError(502, 'Le moteur d\u2019IA n\u2019a pas répondu correctement. Réessayez dans un instant.');
}

/** Appel classique (réponse complète). */
async function callGemini(opts: { system: string; messages: ChatMsg[]; json?: boolean }): Promise<string> {
  const ai = getClient();
  let lastErr: any = null;

  for (const model of modelCandidates()) {
    for (const withThinking of [true, false]) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: opts.messages.map((m) => ({ role: m.role, parts: [{ text: m.content }] })),
          config: buildConfig(model, opts.system, Boolean(opts.json), withThinking)
        });
        const text = (response.text || '').trim();
        if (text) return text;
        lastErr = new Error('Réponse vide');
        break;
      } catch (err: any) {
        lastErr = err;
        const msg = String(err?.message || err);
        if (isFatalForAllModels(msg)) throw mapAiError(err);
        if (withThinking && /thinking/i.test(msg)) continue; // réessai sans réglage de réflexion
        break;
      }
    }
  }
  throw mapAiError(lastErr);
}

/** Ouvre une réponse en continu : renvoie le premier morceau de texte et la suite. */
async function openGeminiStream(opts: { system: string; messages: ChatMsg[] }): Promise<{
  first: string;
  iterator: AsyncIterator<any>;
  model: string;
}> {
  const ai = getClient();
  let lastErr: any = null;

  for (const model of modelCandidates()) {
    for (const withThinking of [true, false]) {
      try {
        const stream: any = await ai.models.generateContentStream({
          model,
          contents: opts.messages.map((m) => ({ role: m.role, parts: [{ text: m.content }] })),
          config: buildConfig(model, opts.system, false, withThinking)
        });
        const iterator: AsyncIterator<any> = stream[Symbol.asyncIterator]();
        let first = '';
        while (!first) {
          const r = await iterator.next();
          if (r.done) break;
          first = (r.value && r.value.text) || '';
        }
        if (first) return { first, iterator, model };
        lastErr = new Error('Réponse vide');
        break;
      } catch (err: any) {
        lastErr = err;
        const msg = String(err?.message || err);
        if (isFatalForAllModels(msg)) throw mapAiError(err);
        if (withThinking && /thinking/i.test(msg)) continue;
        break;
      }
    }
  }
  throw mapAiError(lastErr);
}

// Limitation simple : au plus `max` appels par `windowMs` pour une même personne
const rateBuckets = new Map<string, number[]>();
function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (rateBuckets.get(key) || []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    rateBuckets.set(key, recent);
    return true;
  }
  recent.push(now);
  rateBuckets.set(key, recent);
  return false;
}

function sanitizeMessages(raw: unknown): ChatMsg[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const msgs: ChatMsg[] = raw
    .slice(-14)
    .map((m: any) => ({
      role: (m?.role === 'model' ? 'model' : 'user') as 'user' | 'model',
      content: String(m?.content ?? '').slice(0, 2000)
    }))
    .filter((m) => m.content.trim().length > 0);
  while (msgs.length > 0 && msgs[0].role !== 'user') msgs.shift();
  if (msgs.length === 0 || msgs[msgs.length - 1].role !== 'user') return null;
  return msgs;
}

/* -------------------------------------------------------------------------- */
/* Mémoire courte (cache) : évite de refaire les mêmes requêtes à chaque message */
/* -------------------------------------------------------------------------- */
const AUTH_TTL_MS = 60 * 1000;
const CONTEXT_TTL_MS = 30 * 1000;

const adminAuthCache = new Map<string, { userId: string; exp: number }>();
const vipAuthCache = new Map<string, { userId: string; store: any; exp: number }>();
const adminContextCache: { value: Record<string, unknown> | null; exp: number } = { value: null, exp: 0 };
const storeContextCache = new Map<string, { value: Record<string, unknown>; exp: number }>();

function pruneCaches() {
  const now = Date.now();
  for (const [k, v] of adminAuthCache) if (v.exp < now) adminAuthCache.delete(k);
  for (const [k, v] of vipAuthCache) if (v.exp < now) vipAuthCache.delete(k);
  for (const [k, v] of storeContextCache) if (v.exp < now) storeContextCache.delete(k);
}

function bearerToken(req: Request): string {
  const header = req.headers['authorization'];
  return typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

function authFailure(error: any): { ok: false; status: number; message: string } {
  const msg = String(error?.message || '');
  const status = error?.status;
  if (/fetch failed|network|ENOTFOUND|ECONN|api key|apikey|invalid api/i.test(msg) || (typeof status === 'number' && status >= 500)) {
    return {
      ok: false,
      status: 503,
      message: 'Le serveur ne parvient pas à vérifier votre session auprès de Supabase : contrôlez SUPABASE_SERVICE_ROLE_KEY et l\u2019adresse du projet dans le fichier .env, puis relancez le serveur.'
    };
  }
  return { ok: false, status: 401, message: 'Session invalide ou expirée. Reconnectez-vous.' };
}

async function checkAdminCached(
  db: SupabaseClient | null,
  req: Request
): Promise<{ ok: true; userId: string } | { ok: false; status: number; message: string }> {
  if (!db) return { ok: false, status: 503, message: 'Serveur non configuré : renseignez la vraie clé SUPABASE_SERVICE_ROLE_KEY dans le fichier .env.' };
  const token = bearerToken(req);
  if (!token) return { ok: false, status: 401, message: 'Authentification requise.' };

  const hit = adminAuthCache.get(token);
  if (hit && hit.exp > Date.now()) return { ok: true, userId: hit.userId };

  try {
    const { data, error } = await db.auth.getUser(token);
    if (error || !data?.user) return authFailure(error);
    const { data: profile } = await db.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
    if (!profile || profile.role !== 'super_admin') {
      return { ok: false, status: 403, message: 'Accès réservé au Super Admin.' };
    }
    if (adminAuthCache.size > 300) pruneCaches();
    adminAuthCache.set(token, { userId: data.user.id, exp: Date.now() + AUTH_TTL_MS });
    return { ok: true, userId: data.user.id };
  } catch (err: any) {
    return authFailure(err);
  }
}

/* -------------------------------------------------------------------------- */
/* Contexte réel : plateforme (Super Admin)                                    */
/* -------------------------------------------------------------------------- */
async function buildAdminContext(db: SupabaseClient): Promise<Record<string, unknown>> {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  const [stores, productsCount, orders, subs, tickets, audits] = await Promise.all([
    db.from('stores').select('id, name, plan_id, status, trial_end_date, created_at, city, business_type').order('created_at', { ascending: false }).limit(300),
    db.from('products').select('id', { count: 'exact', head: true }),
    db.from('orders').select('total, status').limit(5000),
    db.from('subscription_records').select('store_id, amount, status, valid_until').limit(2000),
    db.from('contact_messages').select('id', { count: 'exact', head: true }).eq('status', 'nouveau'),
    db.from('audit_logs').select('action, details, timestamp').order('timestamp', { ascending: false }).limit(8)
  ]);

  const storeRows = stores.data || [];
  const subRows = subs.data || [];
  const activeStoreIds = new Set(
    subRows.filter((s: any) => s.status === 'active' && new Date(s.valid_until).getTime() > now).map((s: any) => String(s.store_id))
  );

  let enEssai = 0;
  let bloquees = 0;
  const bientotBloquees: string[] = [];
  const parFormule: Record<string, number> = { standard: 0, premium: 0, vip: 0 };
  storeRows.forEach((s: any) => {
    const plan = s.plan_id === 'decouverte' ? 'standard' : String(s.plan_id || 'standard');
    parFormule[plan] = (parFormule[plan] || 0) + 1;
    if (!activeStoreIds.has(String(s.id))) {
      const end = s.trial_end_date ? new Date(s.trial_end_date).getTime() : 0;
      if (end > now) {
        enEssai++;
        if (end - now < 48 * 3600 * 1000) bientotBloquees.push(`${s.name} (fin le ${String(s.trial_end_date).slice(0, 16)})`);
      } else {
        bloquees++;
      }
    }
  });

  const orderRows = orders.data || [];
  const validOrders = orderRows.filter((o: any) => o.status !== 'annulee');
  const revenuAbonnements = subRows
    .filter((s: any) => s.status === 'active' && Number(s.amount) > 0)
    .reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);

  return {
    date_et_heure: nowIso,
    boutiques: {
      total: storeRows.length,
      actives: storeRows.filter((s: any) => s.status === 'active').length,
      par_formule: parFormule,
      en_essai_gratuit: enEssai,
      essais_qui_se_terminent_dans_48h: bientotBloquees,
      bloquees_essai_termine_sans_abonnement: bloquees,
      avec_abonnement_actif: activeStoreIds.size
    },
    produits_au_total: productsCount.count ?? 0,
    commandes_des_boutiques: {
      total: orderRows.length,
      chiffre_affaires_fcfa: validOrders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0)
    },
    abonnements: {
      revenus_encaisses_fcfa: revenuAbonnements,
      demandes_en_attente: subRows.filter((s: any) => s.status === 'en_attente_validation').length
    },
    support: { tickets_nouveaux: tickets.count ?? 0 },
    dernieres_boutiques: storeRows.slice(0, 8).map((s: any) => ({
      nom: s.name,
      formule: s.plan_id,
      ville: s.city,
      type_de_commerce: s.business_type,
      creee_le: String(s.created_at).slice(0, 10)
    })),
    derniers_evenements: (audits.data || []).map((a: any) => `${String(a.timestamp).slice(0, 16)} ${a.action}: ${String(a.details || '').slice(0, 120)}`)
  };
}

async function getAdminContextCached(db: SupabaseClient | null): Promise<Record<string, unknown>> {
  if (!db) return { avertissement: 'Données de la base indisponibles pour le moment.' };
  if (adminContextCache.value && adminContextCache.exp > Date.now()) return adminContextCache.value;
  try {
    const value = await buildAdminContext(db);
    adminContextCache.value = value;
    adminContextCache.exp = Date.now() + CONTEXT_TTL_MS;
    return value;
  } catch (e: any) {
    console.warn('[Kimsi] contexte indisponible :', e?.message || e);
    return { avertissement: 'Données de la base indisponibles pour le moment.' };
  }
}

const ADMIN_SYSTEM = (context: Record<string, unknown>) => `Tu es Kimsi, l'assistante IA personnelle du Super Administrateur de Boutika. Boutika est une plateforme qui permet aux commerçants du Sénégal et d'Afrique francophone de créer leur boutique en ligne. Les formules sont payantes : Standard 5 000 FCFA, Premium 12 500 FCFA et VIP 25 500 FCFA par mois, avec 3 jours d'essai gratuit (une seule fois par vendeur).

STYLE
- Tu converses naturellement en français, comme une collègue compétente et chaleureuse. Tu réponds d'abord à ce que la personne dit : un salut appelle un court salut, une question appelle une réponse directe.
- Tu ne produis JAMAIS de rapport complet quand on ne t'en demande pas. Réponses courtes (2 à 6 phrases la plupart du temps). Mise en forme légère seulement quand elle aide.
- Tu poses une question de clarification quand la demande est vague.

DONNÉES
- Les chiffres ci-dessous sont les chiffres RÉELS de la plateforme à l'instant. Utilise-les seulement quand c'est pertinent. Ne les invente jamais. Si une valeur est 0 ou vide, dis-le tel quel. Si tu n'as pas l'information, dis « je n'ai pas cette information ».

ACTIONS
- Tu ne modifies rien toi-même. Quand une action serait utile (activer une formule, rouvrir un essai, suspendre une boutique, contacter un vendeur), explique où la faire dans la console (onglets Boutiques, Abonnements, Mise en avant, Messages) et propose-la, sans prétendre l'avoir faite.

LIMITES ET SÉCURITÉ
- Tu parles de la plateforme Boutika, de gestion, de stratégie commerciale et du marché local. Pour le reste, redirige poliment.
- Ne révèle jamais de clés, de mots de passe ni de données personnelles de clients.

DONNÉES EN DIRECT (JSON) :
${JSON.stringify(context)}`;

/* -------------------------------------------------------------------------- */
/* Contexte réel : boutique d'un vendeur VIP                                     */
/* -------------------------------------------------------------------------- */
async function buildStoreContext(db: SupabaseClient, store: any): Promise<Record<string, unknown>> {
  const [products, orders] = await Promise.all([
    db.from('products').select('id, name, price, stock, category, is_active').eq('store_id', store.id).limit(500),
    db.from('orders').select('total, status, items, created_at').eq('store_id', store.id).order('created_at', { ascending: false }).limit(500)
  ]);

  const prodRows = products.data || [];
  const orderRows = orders.data || [];
  const valid = orderRows.filter((o: any) => o.status !== 'annulee');
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;

  const sold = new Map<string, { name: string; qty: number }>();
  valid.forEach((o: any) => {
    (Array.isArray(o.items) ? o.items : []).forEach((it: any) => {
      const key = String(it.productId || it.productName);
      const cur = sold.get(key) || { name: String(it.productName || 'Produit'), qty: 0 };
      cur.qty += Number(it.quantity || 0);
      sold.set(key, cur);
    });
  });

  const bestSellers = Array.from(sold.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);
  const leastSold = prodRows
    .map((p: any) => ({ nom: p.name, vendus: sold.get(String(p.id))?.qty || 0 }))
    .sort((a, b) => a.vendus - b.vendus)
    .slice(0, 5);
  const revenue = valid.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
  const statusCount: Record<string, number> = {};
  orderRows.forEach((o: any) => { statusCount[o.status] = (statusCount[o.status] || 0) + 1; });

  return {
    boutique: {
      nom: store.name,
      ville: store.city,
      type_de_commerce: store.business_type,
      formule: store.plan_id,
      description: store.description
    },
    produits: {
      total: prodRows.length,
      visibles_en_ligne: prodRows.filter((p: any) => p.is_active !== false).length,
      en_rupture: prodRows.filter((p: any) => Number(p.stock) <= 0).slice(0, 8).map((p: any) => p.name),
      stock_faible_5_ou_moins: prodRows.filter((p: any) => Number(p.stock) > 0 && Number(p.stock) <= 5).slice(0, 8).map((p: any) => `${p.name} (${p.stock})`),
      prix_min_fcfa: prodRows.length ? Math.min(...prodRows.map((p: any) => Number(p.price || 0))) : null,
      prix_max_fcfa: prodRows.length ? Math.max(...prodRows.map((p: any) => Number(p.price || 0))) : null
    },
    commandes: {
      total: orderRows.length,
      par_statut: statusCount,
      chiffre_affaires_fcfa: revenue,
      panier_moyen_fcfa: valid.length ? Math.round(revenue / valid.length) : 0,
      sur_les_7_derniers_jours: valid.filter((o: any) => new Date(o.created_at).getTime() >= weekAgo).length
    },
    produits_les_plus_vendus: bestSellers,
    produits_les_moins_vendus: leastSold,
    dernieres_commandes: orderRows.slice(0, 5).map((o: any) => ({
      date: String(o.created_at).slice(0, 10),
      montant_fcfa: o.total,
      statut: o.status,
      articles: (Array.isArray(o.items) ? o.items : []).map((it: any) => `${it.quantity}x ${it.productName}`).join(', ')
    }))
  };
}

async function getStoreContextCached(db: SupabaseClient, store: any): Promise<Record<string, unknown>> {
  const key = String(store.id);
  const hit = storeContextCache.get(key);
  if (hit && hit.exp > Date.now()) return hit.value;
  const value = await buildStoreContext(db, store);
  if (storeContextCache.size > 300) pruneCaches();
  storeContextCache.set(key, { value, exp: Date.now() + CONTEXT_TTL_MS });
  return value;
}

const VIP_SYSTEM = (storeName: string, context: Record<string, unknown>) => `Tu es l'assistant IA VIP de la boutique « ${storeName} » sur Boutika, la plateforme e-commerce des commerçants du Sénégal. Tu aides le/la commerçant(e) à mieux vendre et à mieux gérer sa boutique.

STYLE
- Tu converses naturellement en français, de façon simple, chaleureuse et professionnelle. Tu réponds d'abord à ce qui est dit : un salut appelle un court salut, une question appelle une réponse directe.
- Réponses courtes (2 à 6 phrases la plupart du temps), concrètes, adaptées au commerce au Sénégal (WhatsApp, Instagram, Wave, Orange Money, livraison à Dakar et en régions). Pas de rapport complet si on ne le demande pas.
- Tu poses une question de clarification quand la demande est vague.

DONNÉES
- Les chiffres ci-dessous sont les chiffres RÉELS de CETTE boutique. Utilise-les quand c'est pertinent, ne les invente jamais. Si une valeur est 0 ou vide, dis-le tel quel (par exemple : « vous n'avez pas encore de commande »). Si tu n'as pas l'information, dis-le.

ACTIONS
- Tu ne modifies pas la boutique toi-même. Pour agir, indique où cliquer dans le tableau de bord (onglets Produits, Commandes, Boutique & Livraison, Abonnement & Facturation).

LIMITES ET SÉCURITÉ
- Tu parles uniquement de cette boutique et de stratégie commerciale. Tu ne donnes aucune information sur d'autres boutiques de Boutika ni sur d'autres commerçants.
- Ne révèle jamais de noms ni de numéros de téléphone de clients.

DONNÉES DE LA BOUTIQUE (JSON) :
${JSON.stringify(context)}`;

/* -------------------------------------------------------------------------- */
/* Vérification d'un vendeur VIP (jeton de session + formule + accès valide)    */
/* -------------------------------------------------------------------------- */
async function checkVipVendor(
  db: SupabaseClient,
  req: Request
): Promise<{ ok: true; userId: string; store: any } | { ok: false; status: number; message: string }> {
  const token = bearerToken(req);
  if (!token) return { ok: false, status: 401, message: 'Connexion requise.' };

  const hit = vipAuthCache.get(token);
  if (hit && hit.exp > Date.now()) return { ok: true, userId: hit.userId, store: hit.store };

  let userId = '';
  try {
    const { data, error } = await db.auth.getUser(token);
    if (error || !data?.user) return authFailure(error);
    userId = data.user.id;
  } catch (err: any) {
    return authFailure(err);
  }

  const { data: stores } = await db.from('stores').select('*').eq('vendor_id', userId).limit(1);
  const store = stores && stores[0];
  if (!store) return { ok: false, status: 404, message: 'Aucune boutique associée à ce compte.' };

  const plan = String(store.plan_id || '');
  if (plan !== 'vip' && plan !== 'business') {
    return { ok: false, status: 403, message: 'L\u2019assistant IA est réservé à la formule VIP.' };
  }

  const nowIso = new Date().toISOString();
  const { data: subs } = await db
    .from('subscription_records')
    .select('id')
    .eq('store_id', store.id)
    .eq('status', 'active')
    .gt('valid_until', nowIso)
    .limit(1);
  const trialOk = store.trial_end_date && new Date(store.trial_end_date).getTime() > Date.now();
  if (!(subs && subs.length > 0) && !trialOk) {
    return { ok: false, status: 403, message: 'Votre accès est expiré : activez votre formule pour utiliser l\u2019assistant.' };
  }

  if (vipAuthCache.size > 300) pruneCaches();
  vipAuthCache.set(token, { userId, store, exp: Date.now() + AUTH_TTL_MS });
  return { ok: true, userId, store };
}

function sendAiError(res: Response, err: unknown) {
  if (err instanceof AiError) {
    return res.status(err.status).json({ success: false, message: err.message });
  }
  console.error('[IA] erreur inattendue :', (err as any)?.message || err);
  return res.status(500).json({ success: false, message: 'Erreur interne de l\u2019assistant IA.' });
}

/** Écrit la réponse en continu (texte brut). Les erreurs en cours de route sont ajoutées à la fin. */
async function pipeStream(
  res: Response,
  stream: { first: string; iterator: AsyncIterator<any> }
): Promise<void> {
  res.status(200);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof (res as any).flushHeaders === 'function') (res as any).flushHeaders();
  res.write(stream.first);
  try {
    for (;;) {
      const r = await stream.iterator.next();
      if (r.done) break;
      const t = r.value && r.value.text;
      if (t) res.write(t);
    }
  } catch (err: any) {
    const mapped = mapAiError(err);
    res.write(`\n[[ERREUR]] ${mapped.message}`);
  }
  res.end();
}

/* -------------------------------------------------------------------------- */
/* Routes                                                                      */
/* -------------------------------------------------------------------------- */
export function registerAiRoutes(app: Express, db: SupabaseClient | null, requireSuperAdmin: RequestHandler): void {
  // Kimsi : réponse complète (conservée pour compatibilité)
  app.post('/api/kimsi/chat', requireSuperAdmin, async (req: Request, res: Response) => {
    const messages = sanitizeMessages(req.body?.messages);
    if (!messages) return res.status(400).json({ success: false, message: 'Message vide ou invalide.' });
    const adminId = String((req as any).adminUserId || 'admin');
    if (isRateLimited(`kimsi:${adminId}`, 60, 60 * 60 * 1000)) {
      return res.status(429).json({ success: false, message: 'Trop de messages en peu de temps. Patientez quelques minutes.' });
    }
    try {
      const context = await getAdminContextCached(db);
      const answer = await callGemini({ system: ADMIN_SYSTEM(context), messages });
      res.json({
        success: true,
        answer,
        insights: [`Réponse fondée sur les chiffres réels de la base, relevés à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`]
      });
    } catch (err) {
      sendAiError(res, err);
    }
  });

  // Kimsi : réponse affichée en direct (streaming)
  app.post('/api/kimsi/chat-stream', async (req: Request, res: Response) => {
    const t0 = Date.now();
    const auth = await checkAdminCached(db, req);
    if (!auth.ok) return res.status(auth.status).json({ success: false, message: auth.message });

    const messages = sanitizeMessages(req.body?.messages);
    if (!messages) return res.status(400).json({ success: false, message: 'Message vide ou invalide.' });
    if (isRateLimited(`kimsi:${auth.userId}`, 60, 60 * 60 * 1000)) {
      return res.status(429).json({ success: false, message: 'Trop de messages en peu de temps. Patientez quelques minutes.' });
    }

    try {
      const t1 = Date.now();
      const context = await getAdminContextCached(db);
      const t2 = Date.now();
      const stream = await openGeminiStream({ system: ADMIN_SYSTEM(context), messages });
      const t3 = Date.now();
      await pipeStream(res, stream);
      console.log(`[Kimsi] session ${t1 - t0} ms • données ${t2 - t1} ms • 1er mot ${t3 - t2} ms • total ${Date.now() - t0} ms (${stream.model})`);
    } catch (err) {
      if (!res.headersSent) sendAiError(res, err);
      else res.end();
    }
  });

  // Assistant VIP : conversation complète (conservée pour compatibilité)
  app.post('/api/vip/chat', async (req: Request, res: Response) => {
    if (!db) return res.status(503).json({ success: false, message: 'Serveur non configuré : renseignez la vraie clé SUPABASE_SERVICE_ROLE_KEY dans le fichier .env.' });
    const messages = sanitizeMessages(req.body?.messages);
    if (!messages) return res.status(400).json({ success: false, message: 'Message vide ou invalide.' });
    try {
      const auth = await checkVipVendor(db, req);
      if (!auth.ok) return res.status(auth.status).json({ success: false, message: auth.message });
      if (isRateLimited(`vip:${auth.userId}`, 40, 60 * 60 * 1000)) {
        return res.status(429).json({ success: false, message: 'Vous avez envoyé beaucoup de messages : réessayez dans quelques minutes.' });
      }
      const context = await getStoreContextCached(db, auth.store);
      const answer = await callGemini({ system: VIP_SYSTEM(String(auth.store.name), context), messages });
      res.json({ success: true, answer });
    } catch (err) {
      sendAiError(res, err);
    }
  });

  // Assistant VIP : réponse affichée en direct (streaming)
  app.post('/api/vip/chat-stream', async (req: Request, res: Response) => {
    const t0 = Date.now();
    if (!db) return res.status(503).json({ success: false, message: 'Serveur non configuré : renseignez la vraie clé SUPABASE_SERVICE_ROLE_KEY dans le fichier .env.' });
    const messages = sanitizeMessages(req.body?.messages);
    if (!messages) return res.status(400).json({ success: false, message: 'Message vide ou invalide.' });

    try {
      const auth = await checkVipVendor(db, req);
      if (!auth.ok) return res.status(auth.status).json({ success: false, message: auth.message });
      if (isRateLimited(`vip:${auth.userId}`, 40, 60 * 60 * 1000)) {
        return res.status(429).json({ success: false, message: 'Vous avez envoyé beaucoup de messages : réessayez dans quelques minutes.' });
      }
      const t1 = Date.now();
      const context = await getStoreContextCached(db, auth.store);
      const t2 = Date.now();
      const stream = await openGeminiStream({ system: VIP_SYSTEM(String(auth.store.name), context), messages });
      const t3 = Date.now();
      await pipeStream(res, stream);
      console.log(`[Assistant VIP] session ${t1 - t0} ms • données ${t2 - t1} ms • 1er mot ${t3 - t2} ms • total ${Date.now() - t0} ms (${stream.model})`);
    } catch (err) {
      if (!res.headersSent) sendAiError(res, err);
      else res.end();
    }
  });

  // Assistant VIP : aide à la fiche produit (description, catégorie, prix, tailles, couleurs)
  app.post('/api/vip/product-assist', async (req: Request, res: Response) => {
    if (!db) return res.status(503).json({ success: false, message: 'Serveur non configuré : renseignez la vraie clé SUPABASE_SERVICE_ROLE_KEY dans le fichier .env.' });
    const hint = String(req.body?.hint ?? '').trim().slice(0, 300);
    if (!hint) return res.status(400).json({ success: false, message: 'Décrivez le produit (au moins son nom).' });

    try {
      const auth = await checkVipVendor(db, req);
      if (!auth.ok) return res.status(auth.status).json({ success: false, message: auth.message });
      if (isRateLimited(`vipprod:${auth.userId}`, 30, 60 * 60 * 1000)) {
        return res.status(429).json({ success: false, message: 'Limite atteinte pour l\u2019instant : réessayez dans quelques minutes.' });
      }

      const categories: string[] = Array.isArray(auth.store.categories) ? auth.store.categories : [];
      const system = `Tu es l'assistant e-commerce de la boutique « ${auth.store.name} » (${auth.store.business_type || 'commerce'}, ${auth.store.city || 'Sénégal'}) sur Boutika. Tu rédiges des fiches produit pour le marché sénégalais. Réponds UNIQUEMENT par un objet JSON avec exactement ces clés : {"name": string, "description": string (2 à 3 phrases vendeuses, sans promesse mensongère), "category": string, "suggestedPrice": number (FCFA, réaliste pour le Sénégal), "sizes": string[], "colors": string[]}. Pour "category", choisis parmi ${JSON.stringify(categories)} si la liste n'est pas vide, sinon propose une catégorie courte. Si le produit n'a pas de tailles ou de couleurs, renvoie un tableau vide.`;

      const text = await callGemini({ system, messages: [{ role: 'user', content: `Produit à décrire : ${hint}` }], json: true });
      let parsed: any;
      try {
        parsed = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
      } catch {
        throw new AiError(502, 'La réponse de l\u2019IA n\u2019a pas pu être lue. Réessayez.');
      }

      res.json({
        success: true,
        product: {
          name: String(parsed.name || hint),
          description: String(parsed.description || ''),
          category: String(parsed.category || categories[0] || ''),
          suggestedPrice: Number(parsed.suggestedPrice) > 0 ? Math.round(Number(parsed.suggestedPrice)) : 0,
          sizes: Array.isArray(parsed.sizes) ? parsed.sizes.map(String) : [],
          colors: Array.isArray(parsed.colors) ? parsed.colors.map(String) : []
        }
      });
    } catch (err) {
      sendAiError(res, err);
    }
  });
}
