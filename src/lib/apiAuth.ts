import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Ajoute automatiquement le jeton de session Supabase (Authorization: Bearer ...) aux appels
 * vers les routes /api/ du serveur Boutika. Le serveur s'en sert pour réserver ses routes
 * d'administration au Super Admin. Les appels vers d'autres sites ne sont jamais modifiés.
 */
let installed = false;

export function installApiAuth(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      let path = '';
      if (typeof input === 'string') {
        path = input;
      } else if (input instanceof URL) {
        path = input.origin === window.location.origin ? input.pathname : '';
      } else {
        const reqUrl = (input as Request).url || '';
        path = reqUrl.startsWith(window.location.origin) ? reqUrl.slice(window.location.origin.length) : '';
      }

      if (path.startsWith('/api/') && isSupabaseConfigured && supabase) {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) {
          const headers = new Headers(
            init?.headers || (typeof input !== 'string' && !(input instanceof URL) ? (input as Request).headers : undefined)
          );
          if (!headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
          }
          return originalFetch(input, { ...init, headers });
        }
      }
    } catch {
      /* en cas de problème, on laisse passer l'appel tel quel */
    }
    return originalFetch(input, init);
  };
}
