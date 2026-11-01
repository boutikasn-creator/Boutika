import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Récupération sécurisée des variables d'environnement publiques (Vite)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// Supporte à la fois VITE_SUPABASE_PUBLISHABLE_KEY et VITE_SUPABASE_ANON_KEY
const supabasePublishableKey = 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  import.meta.env.VITE_SUPABASE_ANON_KEY;

// Vérification de la validité de la configuration
const isPlaceholder = (val?: string) => 
  !val || 
  val.includes('votre-projet') || 
  val.includes('votre_cle_publique') || 
  val.trim() === '';

export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl && 
  supabasePublishableKey && 
  !isPlaceholder(supabaseUrl) && 
  !isPlaceholder(supabasePublishableKey)
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabasePublishableKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Calcule l'URL de base de l'application de façon sécurisée et dynamique.
 * 1. Priorité à la variable VITE_APP_URL si configurée (domaine personnalisé / prévisualisation).
 * 2. Repli dynamique sur window.location.origin (garantit l'URL exacte du navigateur).
 * Évite formellement les redirections intempestives vers localhost en production / prévisualisation.
 */
export function getAppBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_APP_URL as string | undefined)?.trim();
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return '';
}

/**
 * Génère l'URL de redirection sécurisée pour les e-mails Supabase (confirmation, réinitialisation de mot de passe).
 */
export function getAuthRedirectUrl(type: 'signup' | 'recovery' | 'callback' = 'signup'): string {
  const base = getAppBaseUrl();
  if (!base) return '';
  return `${base}?auth_callback=${type}`;
}

export interface SupabaseConnectionStatus {
  isConfigured: boolean;
  url: string | null;
  isConnected: boolean;
  message: string;
  error?: string;
}

/**
 * Teste la connectivité réelle au projet Supabase.
 * Ne modifie aucune donnée et n'effectue aucun contournement de sécurité.
 */
export async function testSupabaseConnection(): Promise<SupabaseConnectionStatus> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      isConfigured: false,
      url: supabaseUrl || null,
      isConnected: false,
      message: 'Supabase n’est pas configuré. Renseignez VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY dans les variables d’environnement.',
    };
  }

  try {
    // Test 1: Vérification du service d'authentification
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError) {
      return {
        isConfigured: true,
        url: supabaseUrl,
        isConnected: false,
        message: 'Échec de connexion au service Auth Supabase.',
        error: authError.message,
      };
    }

    // Test 2: Requête légère sur la table 'stores' (sans altération de données)
    const { error: dbError } = await supabase.from('stores').select('id').limit(1);

    if (dbError && dbError.code !== 'PGRST116') {
      // Note: Même si RLS bloque la lecture, une réponse de code 401/403 ou requête prouve que le serveur PostgreSQL répond
      return {
        isConfigured: true,
        url: supabaseUrl,
        isConnected: true,
        message: `Connecté à Supabase. Base accessible (vérification RLS : ${dbError.message}).`,
      };
    }

    return {
      isConfigured: true,
      url: supabaseUrl,
      isConnected: true,
      message: 'Connexion à Supabase réussie avec succès (Auth & Database opérationnels).',
    };
  } catch (err: any) {
    return {
      isConfigured: true,
      url: supabaseUrl,
      isConnected: false,
      message: 'Erreur réseau lors de la tentative de connexion à Supabase.',
      error: err?.message || String(err),
    };
  }
}
