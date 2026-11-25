import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { registerAiRoutes } from './server-ai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Preserve raw body buffer for byte-exact HMAC-SHA256 signature verification (Wave)
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    }
  })
);

// Valeurs d'exemple laissées par erreur (copiées depuis .env.example) : elles sont ignorées
const isPlaceholder = (value?: string): boolean =>
  !value || /votre[-_ ]|your[-_ ]|exemple|example|xxxx|<.*>/i.test(value.trim());

// Supabase server-side client for durable storage (PostgreSQL Source of Truth)
// Strict rule: SUPABASE_SERVICE_ROLE_KEY is strictly backend-only, never exposed to client, no VITE_ prefix
// L'adresse du projet peut être reprise de VITE_SUPABASE_URL (c'est la même adresse).
const supabaseUrl = [process.env.SUPABASE_URL, process.env.VITE_SUPABASE_URL].find((v) => !isPlaceholder(v));
const supabaseServiceKey = isPlaceholder(process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? undefined
  : process.env.SUPABASE_SERVICE_ROLE_KEY;
const serverSupabase: SupabaseClient | null = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : null;

if (!serverSupabase) {
  const why = isPlaceholder(process.env.SUPABASE_SERVICE_ROLE_KEY)
    ? 'SUPABASE_SERVICE_ROLE_KEY est absente ou contient encore la valeur d’exemple'
    : 'l’adresse du projet Supabase (SUPABASE_URL ou VITE_SUPABASE_URL) est absente ou invalide';
  console.log(`[Supabase Server Architecture Notice]: ${why}. Les routes réservées au Super Admin, les assistants IA et les rappels de fin d’essai sont DÉSACTIVÉS. Renseignez la vraie clé « service_role » (Supabase > Project Settings > API) dans le fichier .env, puis relancez le serveur.`);
} else {
  console.log('[Supabase Server Architecture]: Clé de service Supabase présente côté serveur (la connexion réelle est vérifiée à la première requête d’administration).');
}

if (isPlaceholder(process.env.GEMINI_API_KEY)) {
  console.log('[Assistants IA]: GEMINI_API_KEY n’est pas configurée : Kimsi et l’assistant VIP afficheront un message « hors ligne ». Ajoutez la clé dans le fichier .env pour les activer.');
}

/* -------------------------------------------------------------------------- */
/* AUTHENTIFICATION : routes réservées au Super Admin                          */
/* Le navigateur envoie son jeton de session (Authorization: Bearer ...).      */
/* Le serveur le vérifie auprès de Supabase, puis contrôle le rôle en base.     */
/* -------------------------------------------------------------------------- */
async function checkSuperAdmin(req: Request): Promise<{ ok: true; userId: string } | { ok: false; status: number; message: string }> {
  if (!serverSupabase) {
    return { ok: false, status: 503, message: 'Authentification serveur non configurée : renseignez la vraie clé SUPABASE_SERVICE_ROLE_KEY dans le fichier .env (Supabase > Project Settings > API), puis relancez le serveur.' };
  }
  const header = req.headers['authorization'];
  const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return { ok: false, status: 401, message: 'Authentification requise.' };
  }
  try {
    const { data, error } = await serverSupabase.auth.getUser(token);
    if (error || !data?.user) {
      const msg = String(error?.message || '');
      const status = (error as any)?.status;
      // Supabase injoignable ou clé refusée : ce n'est PAS un problème de session, on le dit clairement
      if (/fetch failed|network|ENOTFOUND|ECONN|api key|apikey|invalid api/i.test(msg) || (typeof status === 'number' && status >= 500)) {
        console.error('[Auth serveur] Supabase injoignable ou clé refusée :', msg);
        return {
          ok: false,
          status: 503,
          message: 'Le serveur ne parvient pas à vérifier votre session auprès de Supabase : contrôlez SUPABASE_SERVICE_ROLE_KEY et l’adresse du projet dans le fichier .env, puis relancez le serveur.'
        };
      }
      return { ok: false, status: 401, message: 'Session invalide ou expirée. Reconnectez-vous.' };
    }
    const { data: profile } = await serverSupabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();
    if (!profile || profile.role !== 'super_admin') {
      return { ok: false, status: 403, message: 'Accès réservé au Super Admin.' };
    }
    return { ok: true, userId: data.user.id };
  } catch (err: any) {
    console.error('[Auth serveur] vérification impossible :', err?.message || err);
    return { ok: false, status: 503, message: 'Vérification de session impossible : le serveur ne joint pas Supabase. Contrôlez le fichier .env.' };
  }
}

const requireSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const result = await checkSuperAdmin(req);
  if (!result.ok) {
    return res.status(result.status).json({ success: false, message: result.message });
  }
  (req as any).adminUserId = result.userId;
  next();
};

// Plafonds de catalogue par formule (même règle que la base : Standard 50, Premium 150, VIP 500)
function maxProductsForPlan(planId: string): number {
  if (planId === 'vip' || planId === 'business') return 500;
  if (planId === 'premium' || planId === 'pro') return 150;
  return 50;
}

// Disk persistence paths (local container cache / fallback)
const DATA_DIR = path.resolve(__dirname, 'data');
const MISSIONS_FILE = path.resolve(DATA_DIR, 'server_missions.json');
const IDEMPOTENCY_FILE = path.resolve(DATA_DIR, 'processed_webhooks.json');
const PAYMENT_EVENTS_FILE = path.resolve(DATA_DIR, 'payment_events.json');
const PLATFORM_STATE_FILE = path.resolve(DATA_DIR, 'platform_state.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-flight concurrency lock to prevent parallel race conditions
const inFlightWebhooks = new Set<string>();

// Interfaces
export interface ServerKimsiMission {
  id: string;
  title: string;
  targetObjective: string;
  durationHours: number;
  startedAt: string;
  expiresAt: string;
  status: 'active' | 'completed' | 'failed' | 'expired';
  missionType?: 'gateways_surveillance' | 'quotas_rls_audit' | 'support_surveillance' | 'general';
  lastAuditRunAt?: string;
  auditRunCount?: number;
  logs: Array<{ timestamp: string; action: string; details: string }>;
  summaryReport?: string;
}

export interface PaymentEventRecord {
  id: string;
  gateway: 'wave' | 'orange_money' | 'simulation';
  eventType: string;
  orderNumber?: string;
  orderId?: string;
  amount: number;
  currency: string;
  status: 'paye' | 'echec';
  receivedAt: string;
  rawEventId: string;
  integrityNote?: string;
}

export interface PlatformState {
  stores: Array<{ id: string; name: string; planId: string; status: string; trialUsed?: boolean }>;
  products: Array<{ id: string; storeId: string; name: string; price: number; stock: number }>;
  orders: Array<{ id: string; orderNumber: string; storeId: string; total: number; paymentStatus: string; status: string }>;
  contactMessages: Array<{ id: string; subject: string; status: string; createdAt?: string }>;
  lastSyncedAt?: string;
}

// Storage helpers
function loadJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`[Storage] Erreur de lecture sur ${path.basename(filePath)}:`, err);
  }
  return fallback;
}

function saveJsonFile<T>(filePath: string, content: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[Storage] Erreur d’écriture sur ${path.basename(filePath)}:`, err);
  }
}

// Plus aucune donnée de démonstration : l'état de la plateforme démarre vide et se remplit
// uniquement avec les vraies données envoyées par le Super Admin connecté.
function loadPlatformState(): PlatformState {
  const fallback: PlatformState = {
    stores: [],
    products: [],
    orders: [],
    contactMessages: [],
    lastSyncedAt: new Date().toISOString()
  };
  return loadJsonFile<PlatformState>(PLATFORM_STATE_FILE, fallback);
}

function loadPaymentEvents(): PaymentEventRecord[] {
  return loadJsonFile<PaymentEventRecord[]>(PAYMENT_EVENTS_FILE, []);
}

function savePaymentEvents(events: PaymentEventRecord[]): void {
  saveJsonFile(PAYMENT_EVENTS_FILE, events);
  // Asynchronously mirror to Supabase if configured
  if (serverSupabase && events.length > 0) {
    const latest = events[0];
    serverSupabase
      .from('payment_events')
      .upsert({
        idempotency_key: latest.rawEventId,
        gateway: latest.gateway,
        event_type: latest.eventType,
        order_number: latest.orderNumber,
        order_id: latest.orderId,
        amount: latest.amount,
        currency: latest.currency,
        status: latest.status,
        raw_payload: latest
      })
      .then(
        ({ error }) => {
          if (error) console.error('[Supabase Payment Sync Notice]:', error.message);
        },
        () => {}
      );
  }
}

function loadProcessedWebhooks(): Set<string> {
  const list = loadJsonFile<string[]>(IDEMPOTENCY_FILE, []);
  return new Set(list);
}

function recordProcessedWebhook(eventId: string): void {
  const current = loadProcessedWebhooks();
  current.add(eventId);
  const list = Array.from(current).slice(-1000);
  saveJsonFile(IDEMPOTENCY_FILE, list);
}

// Kimsi mission initialization with crash/restart recovery
function loadServerMissions(): ServerKimsiMission[] {
  const now = Date.now();
  const defaultList: ServerKimsiMission[] = [
    {
      id: 'server-mission-01',
      title: 'Surveillance serveur des Webhooks Wave & Orange Money',
      targetObjective: 'Écoute continue des webhooks marchands et contrôle de latence des passerelles de paiement.',
      durationHours: 24,
      startedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      status: 'active',
      missionType: 'gateways_surveillance',
      auditRunCount: 1,
      lastAuditRunAt: new Date().toISOString(),
      logs: [
        {
          timestamp: new Date().toISOString(),
          action: 'SERVER_DAEMON_INITIALIZED',
          details: 'Démon Kimsi serveur initialisé sur disque. Surveillance active.'
        }
      ]
    }
  ];

  const loaded = loadJsonFile<ServerKimsiMission[]>(MISSIONS_FILE, defaultList);

  // Recovery after server interruption: handle missions that expired or remained active during downtime
  let modified = false;
  loaded.forEach((m) => {
    if (m.status === 'active') {
      const expTime = new Date(m.expiresAt).getTime();
      if (now >= expTime) {
        m.status = 'completed';
        m.summaryReport = `Mission clôturée à l'échéance (${new Date(expTime).toLocaleTimeString('fr-FR')}). Audits exécutés pendant la période active.`;
        m.logs.push({
          timestamp: new Date().toISOString(),
          action: 'RESUMED_AND_CLOSED',
          details: 'Le processus serveur a redémarré après expiration de la mission. Clôture automatique enregistrée.'
        });
        modified = true;
      }
    }
  });

  if (modified || !fs.existsSync(MISSIONS_FILE)) {
    saveJsonFile(MISSIONS_FILE, loaded);
  }

  return loaded;
}

// Asynchronously mirror missions to Supabase if configured
function persistMissions(missions: ServerKimsiMission[]): void {
  saveJsonFile(MISSIONS_FILE, missions);
  if (serverSupabase && missions.length > 0) {
    const records = missions.slice(0, 10).map((m) => ({
      id: m.id,
      title: m.title,
      target_objective: m.targetObjective,
      duration_hours: m.durationHours,
      started_at: m.startedAt,
      expires_at: m.expiresAt,
      status: m.status,
      mission_type: m.missionType || 'general',
      audit_run_count: m.auditRunCount || 1,
      last_audit_run_at: m.lastAuditRunAt || new Date().toISOString(),
      logs: m.logs,
      summary_report: m.summaryReport || null,
      updated_at: new Date().toISOString()
    }));

    serverSupabase
      .from('kimsi_missions')
      .upsert(records)
      .then(
        ({ error }) => {
          if (error) console.error('[Supabase Kimsi Sync Notice]:', error.message);
        },
        () => {}
      );
  }
}

// REAL Action Execution for Kimsi Missions
function executeMissionAuditActions(mission: ServerKimsiMission): { actionName: string; details: string; severity: 'info' | 'warning' | 'critical' } {
  try {
    const state = loadPlatformState();
    const paymentEvents = loadPaymentEvents();
    const lowerTitle = mission.title.toLowerCase();
    const lowerObjective = mission.targetObjective.toLowerCase();

    // 1. Gateways / Webhooks Audit
    if (lowerTitle.includes('webhook') || lowerTitle.includes('wave') || lowerTitle.includes('orange') || lowerObjective.includes('paiement') || mission.missionType === 'gateways_surveillance') {
      const hasWaveSecret = Boolean(process.env.WAVE_WEBHOOK_SECRET);
      const hasOMKey = Boolean(process.env.ORANGE_MONEY_MERCHANT_KEY);
      const hasWhatsApp = Boolean(process.env.WHATSAPP_VERIFY_TOKEN);

      const paidWaveCount = paymentEvents.filter((e) => e.gateway === 'wave' && e.status === 'paye').length;
      const paidOMCount = paymentEvents.filter((e) => e.gateway === 'orange_money' && e.status === 'paye').length;
      const failedCount = paymentEvents.filter((e) => e.status === 'echec').length;

      let details = `Audit passerelles exécuté : Wave ${hasWaveSecret ? 'Prêt (HMAC)' : 'Standby (WAVE_WEBHOOK_SECRET absent)'}, Orange Money ${hasOMKey ? 'Prêt' : 'Standby (ORANGE_MONEY_MERCHANT_KEY absent)'}, WhatsApp ${hasWhatsApp ? 'Vérifié' : 'Standby'}. Paiements validés par webhooks : ${paidWaveCount + paidOMCount}, échecs/rejets : ${failedCount}.`;

      if (!hasWaveSecret && !hasOMKey) {
        details += ' [Note de gouvernance : Les passerelles restent en mode sécurisé Standby 503 tant que les clés marchandes bancaires ne sont pas injectées.]';
      }

      return {
        actionName: 'GATEWAY_WEBHOOK_AUDIT',
        details,
        severity: (!hasWaveSecret || !hasOMKey) ? 'warning' : 'info'
      };
    }

    // 2. Quotas & RLS Audit (quotas officiels : Standard=50, Premium=150, VIP=500 ; aucune formule gratuite)
    if (lowerTitle.includes('quota') || lowerTitle.includes('rls') || lowerTitle.includes('conformité') || lowerObjective.includes('quota') || mission.missionType === 'quotas_rls_audit') {
      const totalStores = state.stores.length;
      const standardStores = state.stores.filter((s) => s.planId === 'standard' || s.planId === 'decouverte');
      const premiumStores = state.stores.filter((s) => s.planId === 'premium' || s.planId === 'pro');
      const vipStores = state.stores.filter((s) => s.planId === 'vip' || s.planId === 'business');

      const quotaViolations: string[] = [];
      state.stores.forEach((s) => {
        const prodCount = state.products.filter((p) => p.storeId === s.id).length;
        const maxAllowed = maxProductsForPlan(s.planId);
        if (prodCount > maxAllowed) {
          quotaViolations.push(`${s.name} (${prodCount}/${maxAllowed} produits - Formule ${s.planId.toUpperCase()})`);
        }
      });

      let details = `Audit des quotas officiels : ${totalStores} boutiques inspectées (Standard 50 max : ${standardStores.length}, Premium 150 max : ${premiumStores.length}, VIP 500 max : ${vipStores.length}).`;
      if (quotaViolations.length === 0) {
        details += ' 100% des catalogues respectent les plafonds contractuels. Aucun dépassement de quota.';
        return { actionName: 'QUOTA_RLS_AUDIT_PASS', details, severity: 'info' };
      } else {
        details += ` Écarts détectés sans suppression automatique : ${quotaViolations.join(', ')}. Nouvel ajout verrouillé côté serveur.`;
        return { actionName: 'QUOTA_RLS_AUDIT_ALERT', details, severity: 'warning' };
      }
    }

    // 3. Support & Tickets Audit
    if (lowerTitle.includes('support') || lowerTitle.includes('ticket') || lowerTitle.includes('alerte') || mission.missionType === 'support_surveillance') {
      const pendingTickets = state.contactMessages.filter((m) => m.status === 'en_attente' || m.status === 'nouveau');
      const details = `Audit support : ${state.contactMessages.length} tickets analysés. ${pendingTickets.length} ticket(s) en attente de réponse.`;
      return {
        actionName: 'SUPPORT_TICKETS_AUDIT',
        details,
        severity: pendingTickets.length > 5 ? 'warning' : 'info'
      };
    }

    // 4. Default System Health Audit
    const details = `Supervision générale : Uptime ${Math.floor(process.uptime())}s, ${state.stores.length} boutiques, ${state.orders.length} commandes enregistrées. Démon serveur stable.`;
    return { actionName: 'SYSTEM_HEALTH_AUDIT', details, severity: 'info' };
  } catch (err: any) {
    return {
      actionName: 'AUDIT_ACTION_FAILED',
      details: `Échec d'exécution de l'audit: ${err?.message || 'Erreur interne'}`,
      severity: 'critical'
    };
  }
}

// Background Daemon Loop (Interval: runs every 30 seconds independently of browser)
let serverMissions: ServerKimsiMission[] = loadServerMissions();

setInterval(() => {
  const now = Date.now();
  let hasChanges = false;

  serverMissions.forEach((m) => {
    if (m.status === 'active') {
      const expiryTime = new Date(m.expiresAt).getTime();

      // Check if expired
      if (now >= expiryTime) {
        m.status = 'completed';
        const finalAudit = executeMissionAuditActions(m);
        m.logs.push({
          timestamp: new Date().toISOString(),
          action: 'MISSION_AUTO_COMPLETED',
          details: `Durée impartie (${m.durationHours}h) écoulée. Bilan de clôture : ${finalAudit.details}`
        });
        m.summaryReport = `Mission clôturée à ${new Date(expiryTime).toLocaleTimeString('fr-FR')}. ${m.auditRunCount || 1} cycle(s) d'audit exécuté(s). ${finalAudit.details}`;
        hasChanges = true;
      } else {
        // Run periodic audit if more than 60 seconds elapsed since last audit
        const lastRun = m.lastAuditRunAt ? new Date(m.lastAuditRunAt).getTime() : 0;
        if (now - lastRun >= 60000) {
          const auditResult = executeMissionAuditActions(m);
          m.lastAuditRunAt = new Date().toISOString();
          m.auditRunCount = (m.auditRunCount || 0) + 1;
          m.logs.push({
            timestamp: new Date().toISOString(),
            action: auditResult.actionName,
            details: auditResult.details
          });
          if (m.logs.length > 20) {
            m.logs = m.logs.slice(-20);
          }
          hasChanges = true;
        }
      }
    }
  });

  if (hasChanges) {
    persistMissions(serverMissions);
  }
}, 30000);

/* -------------------------------------------------------------------------- */
/* RAPPELS DE FIN D'ESSAI (e-mail + WhatsApp) — la veille de la fin de l'essai  */
/*                                                                            */
/* Variables d'environnement (toutes facultatives : sans elles, le canal est   */
/* simplement ignoré) :                                                       */
/*   E-mail   : RESEND_API_KEY, MAIL_FROM  (ex: "Boutika <noreply@votre-domaine>") */
/*   WhatsApp : WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID,               */
/*              WHATSAPP_TRIAL_TEMPLATE (modèle approuvé par Meta, 2 variables : */
/*              {{1}} nom de la boutique, {{2}} heures restantes),             */
/*              WHATSAPP_TEMPLATE_LANG (défaut : fr)                           */
/* -------------------------------------------------------------------------- */
const PLAN_LABELS: Record<string, string> = { standard: 'Standard', premium: 'Premium', vip: 'VIP', decouverte: 'Standard' };

async function getVendorEmail(userId: string): Promise<string | null> {
  if (!serverSupabase) return null;
  try {
    const { data } = await serverSupabase.auth.admin.getUserById(userId);
    return data?.user?.email || null;
  } catch {
    return null;
  }
}

function normalizeWhatsAppNumber(raw: string | null | undefined): string | null {
  const digits = String(raw || '').replace(/[^0-9]/g, '');
  if (!digits) return null;
  if (digits.length === 9) return `221${digits}`; // numéro sénégalais saisi sans l'indicatif
  return digits;
}

async function sendTrialReminderEmail(to: string, storeName: string, planLabel: string, hoursLeft: number): Promise<{ ok: boolean; detail: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (isPlaceholder(key) || isPlaceholder(from)) {
    return { ok: false, detail: 'non configuré : RESEND_API_KEY / MAIL_FROM absents' };
  }
  try {
    const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1c1917">
      <h2 style="color:#b45309">Votre essai gratuit Boutika se termine bientôt</h2>
      <p>Bonjour,</p>
      <p>L'essai gratuit de votre boutique <strong>${storeName}</strong> (formule <strong>${planLabel}</strong>) se termine dans environ <strong>${hoursLeft} heure(s)</strong>.</p>
      <p>Pour garder l'accès à votre tableau de bord, activez votre formule depuis l'onglet <em>Abonnement &amp; Facturation</em>. Vos produits et vos commandes sont conservés.</p>
      <p style="color:#78716c;font-size:12px">— L'équipe Boutika</p>
    </div>`;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        subject: 'Votre essai gratuit Boutika se termine demain',
        html
      })
    });
    if (!res.ok) {
      return { ok: false, detail: `Resend ${res.status} : ${(await res.text()).slice(0, 200)}` };
    }
    return { ok: true, detail: 'e-mail envoyé' };
  } catch (err: any) {
    return { ok: false, detail: `Resend injoignable : ${err?.message || 'erreur réseau'}` };
  }
}

async function sendTrialReminderWhatsApp(phone: string, storeName: string, hoursLeft: number): Promise<{ ok: boolean; detail: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const template = process.env.WHATSAPP_TRIAL_TEMPLATE;
  const lang = process.env.WHATSAPP_TEMPLATE_LANG || 'fr';
  if (isPlaceholder(token) || isPlaceholder(phoneId) || isPlaceholder(template)) {
    return { ok: false, detail: 'non configuré : WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_TRIAL_TEMPLATE absents' };
  }
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: template,
          language: { code: lang },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: storeName },
                { type: 'text', text: String(hoursLeft) }
              ]
            }
          ]
        }
      })
    });
    if (!res.ok) {
      return { ok: false, detail: `WhatsApp ${res.status} : ${(await res.text()).slice(0, 200)}` };
    }
    return { ok: true, detail: 'message WhatsApp envoyé' };
  } catch (err: any) {
    return { ok: false, detail: `WhatsApp injoignable : ${err?.message || 'erreur réseau'}` };
  }
}

async function runTrialReminders(): Promise<{ checked: number; notified: number; details: string[] }> {
  const summary = { checked: 0, notified: 0, details: [] as string[] };
  if (!serverSupabase) {
    summary.details.push('Rappels désactivés : SUPABASE_SERVICE_ROLE_KEY non configurée.');
    return summary;
  }

  const nowIso = new Date().toISOString();
  const limitIso = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

  // Boutiques dont l'essai se termine dans les 24 prochaines heures et qui n'ont pas encore été prévenues
  const { data: stores, error } = await serverSupabase
    .from('stores')
    .select('id, name, vendor_id, plan_id, whatsapp_number, trial_end_date')
    .is('trial_reminder_sent_at', null)
    .gt('trial_end_date', nowIso)
    .lte('trial_end_date', limitIso);

  if (error) {
    summary.details.push(`Lecture des boutiques impossible : ${error.message} (la migration 20261101000005 est-elle appliquée ?)`);
    return summary;
  }

  for (const s of stores || []) {
    summary.checked++;

    // Un abonnement déjà actif : inutile de prévenir
    const { data: subs } = await serverSupabase
      .from('subscription_records')
      .select('id')
      .eq('store_id', s.id)
      .eq('status', 'active')
      .gt('valid_until', nowIso)
      .limit(1);
    if (subs && subs.length > 0) continue;

    const hoursLeft = Math.max(1, Math.round((new Date(s.trial_end_date).getTime() - Date.now()) / 3600000));
    const planLabel = PLAN_LABELS[String(s.plan_id)] || String(s.plan_id || 'Standard');
    const results: Array<{ channel: string; ok: boolean; detail: string }> = [];

    const email = await getVendorEmail(String(s.vendor_id));
    if (email) {
      const r = await sendTrialReminderEmail(email, String(s.name), planLabel, hoursLeft);
      results.push({ channel: 'email', ...r });
    }

    const phone = normalizeWhatsAppNumber(s.whatsapp_number);
    if (phone) {
      const r = await sendTrialReminderWhatsApp(phone, String(s.name), hoursLeft);
      results.push({ channel: 'whatsapp', ...r });
    }

    // Journal : on n'écrit pas les canaux simplement non configurés (évite le bruit à chaque passage)
    for (const r of results) {
      if (r.detail.startsWith('non configuré')) continue;
      await serverSupabase.from('trial_notifications').insert({
        store_id: s.id,
        channel: r.channel,
        status: r.ok ? 'sent' : 'failed',
        detail: r.detail
      });
    }

    if (results.some((r) => r.ok)) {
      await serverSupabase
        .from('stores')
        .update({ trial_reminder_sent_at: new Date().toISOString() })
        .eq('id', s.id);
      summary.notified++;
    } else {
      summary.details.push(`${s.name} : aucun rappel envoyé (${results.map((r) => `${r.channel} : ${r.detail}`).join(' ; ') || 'aucun canal disponible'})`);
    }
  }

  return summary;
}

// Passage automatique toutes les 6 heures (premier passage 60 secondes après le démarrage)
setTimeout(() => {
  runTrialReminders()
    .then((s) => { if (s.checked > 0) console.log('[Rappels fin d\'essai]', JSON.stringify(s)); })
    .catch((e) => console.error('[Rappels fin d\'essai] erreur :', e?.message || e));
}, 60 * 1000);
setInterval(() => {
  runTrialReminders()
    .then((s) => { if (s.checked > 0) console.log('[Rappels fin d\'essai]', JSON.stringify(s)); })
    .catch((e) => console.error('[Rappels fin d\'essai] erreur :', e?.message || e));
}, 6 * 3600 * 1000);

// 1. API Health Check : public et minimal (la configuration détaillée est réservée au Super Admin)
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health/details', requireSuperAdmin, (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    platform: 'Boutika Backend API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: {
      storageModel: serverSupabase ? 'PostgreSQL (Supabase Direct) + Local Resilient Cache' : 'Local Ephemeral JSON Cache',
    },
    geminiConfigured: !isPlaceholder(process.env.GEMINI_API_KEY),
    supabaseConfigured: Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_PUBLISHABLE_KEY),
    serviceRoleConfigured: Boolean(serverSupabase),
    waveWebhookConfigured: Boolean(process.env.WAVE_WEBHOOK_SECRET),
    orangeMoneyConfigured: Boolean(process.env.ORANGE_MONEY_MERCHANT_KEY),
    metaSocialConfigured: Boolean(process.env.META_PAGE_ACCESS_TOKEN),
    whatsappWebhookConfigured: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
    emailRemindersConfigured: !isPlaceholder(process.env.RESEND_API_KEY) && !isPlaceholder(process.env.MAIL_FROM),
    whatsappRemindersConfigured: !isPlaceholder(process.env.WHATSAPP_ACCESS_TOKEN) && !isPlaceholder(process.env.WHATSAPP_PHONE_NUMBER_ID) && !isPlaceholder(process.env.WHATSAPP_TRIAL_TEMPLATE)
  });
});

// Lancement manuel des rappels de fin d'essai (bouton du panneau admin)
app.post('/api/admin/trial-reminders/run', requireSuperAdmin, async (_req: Request, res: Response) => {
  const summary = await runTrialReminders();
  res.json({ success: true, ...summary });
});

// 2. Persistent Kimsi Background Missions API (Server Authoritative) : Super Admin uniquement
app.get('/api/kimsi/missions', requireSuperAdmin, (_req: Request, res: Response) => {
  serverMissions = loadServerMissions();
  res.json({ success: true, missions: serverMissions });
});

app.post('/api/kimsi/missions', requireSuperAdmin, (req: Request, res: Response) => {
  const { title, name, targetObjective, durationHours } = req.body;
  const missionTitle = (typeof title === 'string' ? title : typeof name === 'string' ? name : '').trim();
  if (!missionTitle) {
    return res.status(400).json({ success: false, message: 'Le titre de la mission est requis.' });
  }

  serverMissions = loadServerMissions();

  // Guard against duplicate identical active missions
  const normalizedTitle = missionTitle.toLowerCase();
  const existingActive = serverMissions.find(
    (m) => m.status === 'active' && m.title.trim().toLowerCase() === normalizedTitle
  );

  if (existingActive) {
    return res.status(409).json({
      success: false,
      message: `Une mission active avec l'intitulé "${existingActive.title}" est déjà en cours d'exécution. Clôturez-la avant d'en relancer une identique.`,
      activeMissionId: existingActive.id
    });
  }

  const hours = Number(durationHours) || 2;
  const newMission: ServerKimsiMission = {
    id: `srv-msn-${Date.now()}`,
    title: missionTitle,
    targetObjective: targetObjective || 'Surveillance continue de la plateforme',
    durationHours: hours,
    startedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + hours * 3600 * 1000).toISOString(),
    status: 'active',
    auditRunCount: 1,
    lastAuditRunAt: new Date().toISOString(),
    logs: [
      {
        timestamp: new Date().toISOString(),
        action: 'SERVER_MISSION_LAUNCHED',
        details: `Mission enregistrée sur disque et prise en charge par le démon serveur Node.js. L'exécution persistera même après déconnexion ou fermeture du navigateur.`
      }
    ]
  };

  // Run immediate first audit
  const initialAudit = executeMissionAuditActions(newMission);
  newMission.logs.push({
    timestamp: new Date().toISOString(),
    action: initialAudit.actionName,
    details: initialAudit.details
  });

  serverMissions.unshift(newMission);
  persistMissions(serverMissions);
  res.status(201).json({ success: true, mission: newMission });
});

app.post('/api/kimsi/missions/:id/stop', requireSuperAdmin, (req: Request, res: Response) => {
  const missionId = req.params.id;
  serverMissions = loadServerMissions();
  const mission = serverMissions.find((m) => m.id === missionId);

  if (!mission) {
    return res.status(404).json({ success: false, message: 'Mission introuvable.' });
  }

  const finalAudit = executeMissionAuditActions(mission);
  mission.status = 'completed';
  mission.summaryReport = `Mission clôturée manuellement par l'administrateur à ${new Date().toLocaleTimeString('fr-FR')}. Bilan final : ${finalAudit.details}`;
  mission.logs.push({
    timestamp: new Date().toISOString(),
    action: 'SERVER_MISSION_STOPPED',
    details: 'Arrêt forcé et archivage de la mission exécuté côté serveur.'
  });

  persistMissions(serverMissions);
  res.json({ success: true, message: 'Mission Kimsi arrêtée avec succès.', mission });
});

// 3. Platform State Synchronization & Quota Discrepancy Monitoring : Super Admin uniquement
app.post('/api/platform/sync', requireSuperAdmin, (req: Request, res: Response) => {
  const { stores, products, orders, contactMessages } = req.body;
  const current = loadPlatformState();

  const updated: PlatformState = {
    stores: Array.isArray(stores) ? stores : current.stores,
    products: Array.isArray(products) ? products : current.products,
    orders: Array.isArray(orders) ? orders : current.orders,
    contactMessages: Array.isArray(contactMessages) ? contactMessages : current.contactMessages,
    lastSyncedAt: new Date().toISOString()
  };

  // Inspect quotas non-destructively: flag discrepancies without auto-deleting any existing products
  const quotaNotices: string[] = [];
  updated.stores.forEach((s) => {
    const prodCount = updated.products.filter((p) => p.storeId === s.id).length;
    const maxAllowed = maxProductsForPlan(s.planId);
    if (prodCount > maxAllowed) {
      quotaNotices.push(`Boutique "${s.name}" : ${prodCount}/${maxAllowed} produits. Catalogue conservé, nouvel ajout bloqué.`);
    }
  });

  saveJsonFile(PLATFORM_STATE_FILE, updated);
  res.json({
    success: true,
    syncedAt: updated.lastSyncedAt,
    quotaCompliant: quotaNotices.length === 0,
    quotaNotices
  });
});

// Server-Authoritative Product Quota Validation (Standard=50, Premium=150, VIP=500)
// (la véritable garantie est le trigger SQL guard_product_store_quota de la base)
app.post('/api/products/validate-quota', (req: Request, res: Response) => {
  const { storeId } = req.body;
  if (!storeId || typeof storeId !== 'string') {
    return res.status(400).json({ success: false, message: 'Identifiant storeId requis.' });
  }

  const pState = loadPlatformState();
  const store = pState.stores.find((s) => s.id === storeId);
  if (!store) {
    return res.status(404).json({ success: false, message: 'Boutique introuvable.' });
  }

  const currentCount = pState.products.filter((p) => p.storeId === storeId).length;
  const maxAllowed = maxProductsForPlan(store.planId);

  if (currentCount >= maxAllowed) {
    return res.status(403).json({
      success: false,
      allowed: false,
      reason: `Quota de catalogue atteint : Votre formule ${store.planId.toUpperCase()} autorise au maximum ${maxAllowed} produits (${currentCount} actuellement enregistrés).`,
      maxAllowed,
      currentCount
    });
  }

  res.json({
    success: true,
    allowed: true,
    maxAllowed,
    currentCount,
    remainingSlots: maxAllowed - currentCount
  });
});

app.get('/api/platform/state', requireSuperAdmin, (_req: Request, res: Response) => {
  res.json({ success: true, state: loadPlatformState() });
});

// 4. Wave Senegal Merchant Webhook Endpoint (Raw-Body HMAC-SHA256 & Concurrency-Safe Idempotency)
app.post('/api/webhooks/wave', (req: Request, res: Response) => {
  const waveSignature = req.headers['wave-signature'] as string | undefined;
  const webhookSecret = process.env.WAVE_WEBHOOK_SECRET || (process.env.NODE_ENV !== 'production' ? 'wave_sec_sandbox_test_sn' : undefined);

  if (!webhookSecret) {
    return res.status(503).json({
      success: false,
      message: 'Passerelle Wave en mode Standby. WAVE_WEBHOOK_SECRET non configuré dans les variables d’environnement.'
    });
  }

  if (!waveSignature) {
    return res.status(400).json({ success: false, message: 'En-tête Wave-Signature manquant.' });
  }

  // Parse signature header: t=<timestamp>,v1=<hash>
  const parts = waveSignature.split(',').reduce((acc, part) => {
    const [k, v] = part.split('=');
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {} as Record<string, string>);

  const timestamp = parts['t'];
  const expectedHash = parts['v1'];

  if (!timestamp || !expectedHash) {
    return res.status(400).json({ success: false, message: 'Format d’en-tête Wave-Signature invalide.' });
  }

  // Exact raw body buffer preservation for HMAC-SHA256 (no JSON.stringify reordering)
  const rawPayloadString = (req as any).rawBody ? (req as any).rawBody.toString('utf8') : JSON.stringify(req.body);
  const signedPayload = `${timestamp}.${rawPayloadString}`;
  const computedHash = crypto.createHmac('sha256', webhookSecret).update(signedPayload).digest('hex');

  let isValid = false;
  try {
    isValid = crypto.timingSafeEqual(
      Buffer.from(computedHash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );
  } catch {
    isValid = false;
  }

  if (!isValid) {
    return res.status(401).json({ success: false, message: 'Signature Wave invalide. Rejet de sécurité.' });
  }

  const eventId = req.body?.id || req.body?.data?.id || `${timestamp}-${computedHash.slice(0, 16)}`;

  // Concurrency-safe idempotency locking
  if (inFlightWebhooks.has(eventId)) {
    return res.status(200).json({ received: true, inFlightDuplicate: true });
  }

  const processed = loadProcessedWebhooks();
  if (processed.has(eventId)) {
    return res.status(200).json({ received: true, idempotentDuplicate: true });
  }

  inFlightWebhooks.add(eventId);

  try {
    recordProcessedWebhook(eventId);

    // Extract payment details and record server-side payment event
    const orderRef = req.body?.client_reference || req.body?.data?.client_reference || req.body?.data?.order_id;
    const eventType = req.body?.type || 'checkout.session.completed';
    const amount = Number(req.body?.amount || req.body?.data?.amount || 0);
    const currency = (req.body?.currency || req.body?.data?.currency || 'XOF').toUpperCase();
    const isSuccess = eventType === 'checkout.session.completed' || eventType === 'payment.succeeded';

    let finalPaymentStatus: 'paye' | 'echec' = isSuccess ? 'paye' : 'echec';
    let integrityNote = '';

    // Currency verification: Senegalese CFA Franc (XOF) only
    if (currency !== 'XOF' && currency !== 'CFA') {
      finalPaymentStatus = 'echec';
      integrityNote = `Alerte devise invalide : Reçu ${currency}, attendu XOF. Paiement rejeté.`;
    }

    // Strict order & amount check:
    if (orderRef && finalPaymentStatus !== 'echec') {
      const pState = loadPlatformState();
      const targetOrder = pState.orders.find((o) => o.orderNumber === orderRef || o.id === orderRef);
      if (targetOrder) {
        if (targetOrder.paymentStatus === 'paye') {
          // Status Transition Protection: an already-paid order cannot be downgraded or re-credited
          finalPaymentStatus = 'paye';
          integrityNote = `Commande ${orderRef} déjà confirmée payée. Aucun changement de statut.`;
        } else if (isSuccess && amount < targetOrder.total) {
          finalPaymentStatus = 'echec';
          integrityNote = `Alerte montant insuffisant : Reçu ${amount} FCFA, attendu ${targetOrder.total} FCFA. Paiement refusé.`;
        } else if (isSuccess) {
          targetOrder.paymentStatus = 'paye';
          saveJsonFile(PLATFORM_STATE_FILE, pState);
        }
      } else {
        finalPaymentStatus = 'echec';
        integrityNote = `Commande introuvable pour la référence ${orderRef}`;
      }
    }

    const paymentRecord: PaymentEventRecord = {
      id: `pay-wave-${Date.now()}`,
      gateway: 'wave',
      eventType,
      orderNumber: orderRef,
      orderId: orderRef,
      amount,
      currency: 'XOF',
      status: finalPaymentStatus,
      receivedAt: new Date().toISOString(),
      rawEventId: eventId,
      integrityNote: integrityNote || undefined
    };

    const events = loadPaymentEvents();
    events.unshift(paymentRecord);
    savePaymentEvents(events);

    console.log('[Wave Webhook Processed Validated]:', eventId, eventType, 'Order:', orderRef, 'Status:', finalPaymentStatus);
    res.status(200).json({ received: true, status: finalPaymentStatus, orderReference: orderRef, integrityNote });
  } finally {
    inFlightWebhooks.delete(eventId);
  }
});

// 5. Orange Money Senegal Web Pay Webhook Endpoint (Concurrency-Safe)
app.post('/api/webhooks/orange-money', (req: Request, res: Response) => {
  const merchantKey = process.env.ORANGE_MONEY_MERCHANT_KEY || (process.env.NODE_ENV !== 'production' ? 'om_sec_sandbox_test_sn' : undefined);

  if (!merchantKey) {
    return res.status(503).json({
      success: false,
      message: 'Passerelle Orange Money en mode Standby. ORANGE_MONEY_MERCHANT_KEY non configuré.'
    });
  }

  // La clé marchande est OBLIGATOIRE : une notification sans clé est refusée (avant, elle était acceptée)
  const authHeader = req.headers['authorization'] || req.headers['x-merchant-key'];
  if (!authHeader || (authHeader !== merchantKey && authHeader !== `Bearer ${merchantKey}`)) {
    return res.status(401).json({ success: false, message: 'Clé marchande Orange Money absente ou non reconnue.' });
  }

  const notifToken = req.body?.notif_token || req.body?.order_id || `om-${Date.now()}`;

  if (inFlightWebhooks.has(notifToken)) {
    return res.status(200).json({ status: 'SUCCESS', inFlightDuplicate: true });
  }

  const processed = loadProcessedWebhooks();
  if (processed.has(notifToken)) {
    return res.status(200).json({ status: 'SUCCESS', duplicate: true });
  }

  inFlightWebhooks.add(notifToken);

  try {
    recordProcessedWebhook(notifToken);

    const orderId = req.body?.order_id;
    const statusStr = (req.body?.status || 'SUCCESS').toUpperCase();
    const isSuccess = statusStr === 'SUCCESS';
    const amount = Number(req.body?.amount || 0);

    const currency = (req.body?.currency || 'XOF').toUpperCase();
    let finalStatus: 'paye' | 'echec' = isSuccess ? 'paye' : 'echec';
    let integrityNote = '';

    if (currency !== 'XOF' && currency !== 'CFA') {
      finalStatus = 'echec';
      integrityNote = `Alerte devise Orange Money : Reçu ${currency}, attendu XOF. Paiement rejeté.`;
    }

    if (orderId && finalStatus !== 'echec') {
      const pState = loadPlatformState();
      const targetOrder = pState.orders.find((o) => o.orderNumber === orderId || o.id === orderId);
      if (targetOrder) {
        if (targetOrder.paymentStatus === 'paye') {
          finalStatus = 'paye';
          integrityNote = `Commande Orange Money ${orderId} déjà confirmée payée. Aucun changement de statut.`;
        } else if (isSuccess && amount < targetOrder.total) {
          finalStatus = 'echec';
          integrityNote = `Alerte montant Orange Money insuffisant : Reçu ${amount} FCFA, attendu ${targetOrder.total} FCFA.`;
        } else if (isSuccess) {
          targetOrder.paymentStatus = 'paye';
          saveJsonFile(PLATFORM_STATE_FILE, pState);
        }
      } else {
        finalStatus = 'echec';
        integrityNote = `Commande Orange Money introuvable : ${orderId}`;
      }
    }

    const paymentRecord: PaymentEventRecord = {
      id: `pay-om-${Date.now()}`,
      gateway: 'orange_money',
      eventType: `om.notification.${statusStr.toLowerCase()}`,
      orderNumber: orderId,
      orderId,
      amount,
      currency: 'XOF',
      status: finalStatus,
      receivedAt: new Date().toISOString(),
      rawEventId: notifToken,
      integrityNote: integrityNote || undefined
    };

    const events = loadPaymentEvents();
    events.unshift(paymentRecord);
    savePaymentEvents(events);

    console.log('[Orange Money Webhook Validated]:', notifToken, 'Order:', orderId, 'Status:', finalStatus);
    res.status(200).json({ status: 'SUCCESS', paymentStatus: finalStatus, integrityNote });
  } finally {
    inFlightWebhooks.delete(notifToken);
  }
});

// 6. WhatsApp Business Cloud API Webhook Handshake & Inbound
app.get('/api/webhooks/whatsapp', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token && expectedToken && token === expectedToken) {
    console.log('[WhatsApp Webhook] Handshake Meta validé avec succès.');
    return res.status(200).send(challenge);
  }

  if (!expectedToken) {
    return res.status(503).json({
      error: 'WHATSAPP_VERIFY_TOKEN non configuré dans les variables d’environnement.'
    });
  }

  return res.status(403).json({ error: 'Échec de vérification du jeton WhatsApp.' });
});

app.post('/api/webhooks/whatsapp', (req: Request, res: Response) => {
  console.log('[WhatsApp Webhook Message]:', JSON.stringify(req.body));
  res.status(200).send('EVENT_RECEIVED');
});

// 7. Vérification publique d'un paiement : ne renvoie que l'essentiel (pas de détails internes)
app.get('/api/payments/status/:orderRef', (req: Request, res: Response) => {
  const orderRef = req.params.orderRef;
  const events = loadPaymentEvents();
  const payment = events.find((e) => e.orderNumber === orderRef || e.orderId === orderRef);

  if (!payment) {
    return res.json({ paid: false, status: 'en_attente', message: 'Aucun paiement confirmé par webhook pour cette commande.' });
  }

  res.json({
    paid: payment.status === 'paye',
    status: payment.status,
    verifiedAt: payment.receivedAt
  });
});

// Historique complet des paiements : Super Admin uniquement
app.get('/api/payments/events', requireSuperAdmin, (_req: Request, res: Response) => {
  res.json({ success: true, events: loadPaymentEvents() });
});

// Assistants IA (Kimsi pour le Super Admin, assistant de discussion pour les vendeurs VIP)
registerAiRoutes(app, serverSupabase, requireSuperAdmin);

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Boutika Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Boutika server:', err);
  process.exit(1);
});
