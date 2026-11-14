import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { 
  UserRole, 
  UserProfile, 
  Store, 
  Product, 
  Order, 
  SubscriptionPlan, 
  SubscriptionRecord, 
  ContactMessage, 
  AuditLog, 
  CartItem,
  OrderStatus,
  AuthStatus,
  PlanTierId,
  KimsiMission,
  KimsiChatMessage
} from '../types';
// Seul le profil "visiteur" reste local. Boutiques, produits, commandes, abonnements,
// messages et audit viennent de Supabase. Les formules viennent d'une source unique.
import { INITIAL_USERS } from '../data/mockData';
import { INITIAL_PLANS, TRIAL_DAYS } from '../data/plans';
import { 
  supabase, 
  isSupabaseConfigured, 
  testSupabaseConnection, 
  SupabaseConnectionStatus,
  getAuthRedirectUrl,
  getAppBaseUrl
} from '../lib/supabase';
import { askKimsiAI, analyzeProductPhotoVIP } from '../lib/gemini';
import {
  DEFAULT_LOGO_URL,
  DEFAULT_BANNER_URL,
  DEFAULT_CATEGORIES,
  DEFAULT_DELIVERY_ZONES,
  rowToStore,
  storeToRow,
  fetchStores,
  fetchProducts,
  fetchOrders,
  fetchSubscriptionRecords,
  fetchContactMessages,
  fetchAuditLogs,
  updateStoreRowDb,
  insertProductDb,
  updateProductDb,
  deleteProductDb,
  insertOrderDb,
  updateOrderDb,
  insertSubscriptionDb,
  updateSubscriptionDb,
  insertContactDb,
  updateContactDb,
  insertAuditLogDb
} from '../lib/db';

export type CurrentView = 
  | 'home' 
  | 'about' 
  | 'how-it-works' 
  | 'pricing' 
  | 'contact' 
  | 'legal-mentions' 
  | 'legal-privacy' 
  | 'legal-terms' 
  | 'vendor-dashboard' 
  | 'admin-dashboard' 
  | 'public-store'
  | 'marketplace'
  | 'architecture'
  | 'register'
  | 'login'
  | 'reset-password'
  | 'auth-callback';

// Informations de boutique saisies à l'inscription (transmises avec le compte, appliquées à la 1re connexion)
export interface StoreSignupExtra {
  description?: string;
  businessType?: string;
  city?: string;
  address?: string;
  planId?: PlanTierId;
}

interface AppContextType {
  // Supabase Backend Status & Operations
  isSupabaseConfigured: boolean;
  supabaseConnectionStatus: SupabaseConnectionStatus | null;
  testConnection: () => Promise<SupabaseConnectionStatus>;
  signUpWithSupabase: (email: string, password: string, fullName: string, phone: string, storeName?: string, storeExtra?: StoreSignupExtra) => Promise<{ success: boolean; requiresEmailConfirmation: boolean; message: string; email?: string }>;
  signInWithSupabase: (email: string, password: string) => Promise<{ success: boolean; message: string; authStatus?: AuthStatus; role?: UserRole }>;
  resetPasswordWithSupabase: (email: string) => Promise<{ success: boolean; message: string }>;
  updateUserPassword: (newPassword: string) => Promise<{ success: boolean; message: string }>;
  signOutUser: () => Promise<void>;
  createStoreForVendor: (storeData: { name: string; whatsappNumber: string; city?: string; address?: string }) => Promise<{ success: boolean; message: string; store?: Store }>;
  refreshData: (role?: UserRole) => Promise<void>;

  // Authentication State
  isAuthenticated: boolean;
  authStatus: AuthStatus;
  authLoading: boolean;
  authCallbackMessage: { type: 'success' | 'error' | 'info'; title: string; detail: string } | null;
  setAuthCallbackMessage: (msg: { type: 'success' | 'error' | 'info'; title: string; detail: string } | null) => void;

  // Navigation & Role
  currentView: CurrentView;
  setCurrentView: (view: CurrentView) => void;
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  activeStoreId: string;
  setActiveStoreId: (storeId: string) => void;
  selectedStoreSlug: string;
  setSelectedStoreSlug: (slug: string) => void;

  // Stores & Products
  stores: Store[];
  activeStore: Store;
  products: Product[];
  storeProducts: Product[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => { success: boolean; message?: string };
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  updateStoreProfile: (storeId: string, updates: Partial<Store>) => void;
  updateFoundingStore: (storeId: string, isFounding: boolean, order?: number) => void;
  updateVipPromotion: (storeId: string, isPromoted: boolean, order?: number, badge?: string) => void;
  setStorePlan: (storeId: string, planId: PlanTierId) => Promise<{ success: boolean; message: string }>;
  checkCanAddProduct: (storeId: string) => { allowed: boolean; reason?: string; maxAllowed: number; currentCount: number };
  checkStoreTrialStatus: (store: Store) => { isExpired: boolean; daysRemaining: number; trialEndDate: string; isActive: boolean; isPaid?: boolean };
  purgeDemoData: () => { success: boolean; message: string; purgedCounts: Record<string, number> };
  exportPlatformBackup: () => void;
  restorePlatformBackup: (jsonContent: string) => { success: boolean; message: string; restoredCounts?: Record<string, number> };

  // Orders
  orders: Order[];
  storeOrders: Order[];
  createOrder: (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus, notes?: string) => void;

  // Cart for Public Store
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, variantId?: string, size?: string, color?: string) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;

  // Plans & Subscriptions
  plans: SubscriptionPlan[];
  updatePlan: (id: string, updates: Partial<SubscriptionPlan>) => void;
  subscriptionRecords: SubscriptionRecord[];
  simulateServerPaymentUpgrade: (planId: PlanTierId, gateway: 'Wave' | 'Orange Money' | 'Carte Bancaire') => Promise<{ success: boolean; message: string }>;
  activateSubscriptionRecord: (recordId: string) => Promise<{ success: boolean; message: string }>;

  // Contact Messages & Support
  contactMessages: ContactMessage[];
  submitContactMessage: (name: string, email: string, phone: string, subject: string, message: string) => void;
  updateMessageStatus: (id: string, status: 'nouveau' | 'traite' | 'archive') => void;
  replyToContactMessage: (id: string, replyText: string) => void;

  // Audit Logs
  auditLogs: AuditLog[];
  addAuditLog: (action: string, target: string, details: string, severity?: 'info' | 'warning' | 'critical') => void;

  // Kimsi AI Private Agent & Missions (Super Admin only)
  kimsiMissions: KimsiMission[];
  startKimsiMission: (title: string, objective: string, durationHours: number) => KimsiMission;
  stopKimsiMission: (missionId: string) => void;
  kimsiMessages: KimsiChatMessage[];
  sendKimsiPrompt: (prompt: string) => Promise<{ answer: string; insights: string[] }>;
  analyzeProductWithAi: (imageHint: string) => Promise<{ name: string; description: string; category: string; suggestedPrice: number; sizes: string[]; colors: string[] }>;

  // Auth Modal
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: 'login' | 'register';
  setAuthModalMode: (mode: 'login' | 'register') => void;

  // Toast feedback
  toastMessage: string | null;
  showToast: (msg: string) => void;

  // Formatters
  formatFCFA: (amount: number) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Identifiant unique de type UUID v4. La base utilise des colonnes uuid (produits, commandes...) :
// un identifiant du type "prod-xxxx" serait refusé. Le paramètre est conservé pour compatibilité.
const uid = (_prefix?: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const PAID_PLAN_IDS = ['standard', 'premium', 'vip'];

// Boutique "vide" utilisée tant qu'aucune boutique réelle n'est chargée (évite les plantages)
const EMPTY_STORE: Store = {
  id: '',
  vendorId: '',
  name: 'Boutique',
  slug: '',
  description: '',
  whatsappNumber: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  logoUrl: DEFAULT_LOGO_URL,
  bannerUrl: DEFAULT_BANNER_URL,
  categories: DEFAULT_CATEGORIES,
  deliveryZones: DEFAULT_DELIVERY_ZONES,
  status: 'active',
  planId: 'standard',
  createdAt: new Date(0).toISOString()
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation
  const [currentView, setCurrentView] = useState<CurrentView>('home');
  // Par défaut, un visiteur arrive déconnecté (role: 'visitor')
  const [currentUser, setCurrentUser] = useState<UserProfile>(INITIAL_USERS[2]);
  const [activeStoreId, setActiveStoreId] = useState<string>('');
  const [selectedStoreSlug, setSelectedStoreSlug] = useState<string>('');

  // Core Data : vide au départ, rempli depuis Supabase (aucune donnée de démonstration)
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [subscriptionRecords, setSubscriptionRecords] = useState<SubscriptionRecord[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // La grille tarifaire vient UNIQUEMENT du code (src/data/plans.ts) : plus de copie enregistrée
  // dans le navigateur, qui pouvait afficher d'anciens prix ou d'anciens textes.
  const [plans, setPlans] = useState<SubscriptionPlan[]>(INITIAL_PLANS);

  // Cart for Public Store
  const [cart, setCart] = useState<CartItem[]>([]);

  // Auth modal (kept for compatibility, though register/login pages are now primary)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Supabase connection status
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseConnectionStatus | null>(null);

  // Auth Status machine : loading | unauthenticated | connected_no_profile | connected_no_store | ready
  const [authStatus, setAuthStatus] = useState<AuthStatus>(isSupabaseConfigured ? 'loading' : 'unauthenticated');
  const [authCallbackMessage, setAuthCallbackMessage] = useState<{ type: 'success' | 'error' | 'info'; title: string; detail: string } | null>(null);

  // Helper isAuthenticated : vrai si prêt ou profil sans boutique encore à configurer
  const isAuthenticated = authStatus === 'ready' || authStatus === 'connected_no_store' || (currentUser.role !== 'visitor' && Boolean(currentUser.email));
  const authLoading = authStatus === 'loading';

  // Connection tester
  const testConnection = async (): Promise<SupabaseConnectionStatus> => {
    const status = await testSupabaseConnection();
    setSupabaseStatus(status);
    return status;
  };

  /**
   * Recharge toutes les données depuis Supabase. Les droits sont appliqués par la RLS :
   * - visiteur : boutiques actives + produits en ligne
   * - vendeur  : + ses commandes, ses abonnements
   * - super admin : tout, y compris messages de contact et journal d'audit
   */
  const refreshData = async (role: UserRole = 'visitor'): Promise<void> => {
    if (!isSupabaseConfigured || !supabase) return;
    const isLoggedIn = role !== 'visitor';
    const isAdmin = role === 'super_admin';

    const [s, p, o, sub, c, a] = await Promise.all([
      fetchStores(),
      fetchProducts(),
      isLoggedIn ? fetchOrders() : Promise.resolve([] as Order[]),
      isLoggedIn ? fetchSubscriptionRecords() : Promise.resolve([] as SubscriptionRecord[]),
      isAdmin ? fetchContactMessages() : Promise.resolve([] as ContactMessage[]),
      isAdmin ? fetchAuditLogs() : Promise.resolve([] as AuditLog[])
    ]);

    setStores(s);
    setProducts(p);
    setOrders(o);
    setSubscriptionRecords(sub);
    setContactMessages(c);
    setAuditLogs(a);
  };

  // Construit la boutique du vendeur connecté à partir d'une ligne de la base
  const buildVendorStore = (row: any, user: UserProfile): Store => ({
    ...rowToStore(row),
    email: row.email || user.email,
    description: row.description || `Boutique officielle de ${user.fullName}`,
    address: row.address || 'Médina, Dakar',
    city: row.city || 'Dakar'
  });

  /**
   * Synchronise la session Supabase, charge le profil utilisateur et la boutique associée.
   * Gère de façon robuste les cas :
   * - unauthenticated : aucun utilisateur
   * - connected_no_profile : compte Auth existant mais profil non inséré dans public.profiles
   * - connected_no_store : compte vendeur valide mais aucune boutique dans public.stores
   * - ready : profil et boutique chargés avec succès
   */
  const syncSessionAndUserData = async (session: Session | null): Promise<{
    status: AuthStatus;
    user: UserProfile | null;
    store: Store | null;
  }> => {
    if (!session?.user) {
      setCurrentUser(INITIAL_USERS[2]);
      setAuthStatus('unauthenticated');
      return { status: 'unauthenticated', user: null, store: null };
    }

    if (!isSupabaseConfigured || !supabase) {
      setAuthStatus('unauthenticated');
      return { status: 'unauthenticated', user: null, store: null };
    }

    try {
      const client = supabase;
      const userId = session.user.id;
      const userEmail = session.user.email || '';
      const meta = session.user.user_metadata || {};

      // 1. Charger le profil depuis public.profiles
      const { data: profile } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      let resolvedUser: UserProfile;

      if (!profile) {
        // Le profil n'existe pas encore dans public.profiles (tentative d'auto-guérison)
        try {
          const { data: insertedProfile } = await client
            .from('profiles')
            .upsert({
              id: userId,
              email: userEmail,
              full_name: meta.full_name || 'Vendeur Boutika',
              phone: meta.phone || '',
              role: 'vendor'
            })
            .select()
            .single();

          if (insertedProfile) {
            resolvedUser = {
              id: insertedProfile.id,
              email: insertedProfile.email || userEmail,
              fullName: insertedProfile.full_name,
              phone: insertedProfile.phone || '',
              role: insertedProfile.role === 'super_admin' ? 'super_admin' : 'vendor',
              createdAt: insertedProfile.created_at,
            };
          } else {
            resolvedUser = {
              id: userId,
              email: userEmail,
              fullName: meta.full_name || 'Utilisateur',
              phone: meta.phone || '',
              role: 'vendor',
              createdAt: session.user.created_at,
            };
            setCurrentUser(resolvedUser);
            setAuthStatus('connected_no_profile');
            return { status: 'connected_no_profile', user: resolvedUser, store: null };
          }
        } catch {
          resolvedUser = {
            id: userId,
            email: userEmail,
            fullName: meta.full_name || 'Utilisateur',
            phone: meta.phone || '',
            role: 'vendor',
            createdAt: session.user.created_at,
          };
          setCurrentUser(resolvedUser);
          setAuthStatus('connected_no_profile');
          return { status: 'connected_no_profile', user: resolvedUser, store: null };
        }
      } else {
        resolvedUser = {
          id: profile.id,
          // La table profiles n'a pas de colonne e-mail : on prend celui du compte de connexion
          email: profile.email || userEmail,
          fullName: profile.full_name,
          phone: profile.phone || '',
          role: profile.role === 'super_admin' ? 'super_admin' : 'vendor',
          createdAt: profile.created_at,
        };
      }

      setCurrentUser(resolvedUser);

      // Si le rôle est super_admin, pas besoin de boutique obligatoire
      if (resolvedUser.role === 'super_admin') {
        await refreshData('super_admin');
        setAuthStatus('ready');
        return { status: 'ready', user: resolvedUser, store: null };
      }

      // 2. Charger la boutique depuis public.stores
      const { data: storeRows } = await client
        .from('stores')
        .select('*')
        .eq('vendor_id', userId);

      if (!storeRows || storeRows.length === 0) {
        // Aucune boutique trouvée pour ce vendeur : création automatique à partir des informations
        // saisies à l'inscription (nom, description, type de commerce, lieu, formule choisie).
        // L'essai de 3 jours est posé par la base de données (trigger enforce_store_trial_rules).
        if (meta.store_name) {
          try {
            const rawSlug = (meta.store_slug || meta.store_name)
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '');
            const generatedSlug = `${rawSlug}-${userId.slice(0, 4)}`;
            const chosenPlan = PAID_PLAN_IDS.includes(meta.plan_id) ? meta.plan_id : 'standard';

            const { data: newStore, error: createStoreErr } = await client
              .from('stores')
              .insert({
                vendor_id: userId,
                name: meta.store_name,
                slug: generatedSlug,
                description: meta.store_description || null,
                business_type: meta.business_type || null,
                whatsapp_number: (meta.phone || '').replace(/[^0-9]/g, '') || '221770000000',
                city: meta.city || 'Dakar',
                address: meta.address || null,
                status: 'active',
                plan_id: chosenPlan
              })
              .select()
              .single();

            if (newStore && !createStoreErr) {
              const formattedStore = buildVendorStore(newStore, resolvedUser);
              await refreshData(resolvedUser.role);
              setStores(prev => prev.some(s => s.id === formattedStore.id) ? prev : [formattedStore, ...prev]);
              setActiveStoreId(formattedStore.id);
              setSelectedStoreSlug(formattedStore.slug);
              setAuthStatus('ready');
              return { status: 'ready', user: resolvedUser, store: formattedStore };
            }
            if (createStoreErr) {
              console.warn('Création boutique refusée:', createStoreErr.message);
            }
          } catch (autoCreateErr) {
            console.warn('Auto-création boutique échouée:', autoCreateErr);
          }
        }

        // Si la boutique n'a pas pu être créée automatiquement : état explicite connected_no_store
        await refreshData(resolvedUser.role);
        setAuthStatus('connected_no_store');
        return { status: 'connected_no_store', user: resolvedUser, store: null };
      }

      // Boutique trouvée dans Supabase !
      const formattedStore = buildVendorStore(storeRows[0], resolvedUser);
      await refreshData(resolvedUser.role);
      setStores(prev => prev.some(s => s.id === formattedStore.id) ? prev : [formattedStore, ...prev]);
      setActiveStoreId(formattedStore.id);
      setSelectedStoreSlug(formattedStore.slug);
      setAuthStatus('ready');
      return { status: 'ready', user: resolvedUser, store: formattedStore };

    } catch (err) {
      console.error('Erreur synchronisation session Supabase:', err);
      setAuthStatus('unauthenticated');
      return { status: 'unauthenticated', user: null, store: null };
    }
  };

  // Traitement des retours d'authentification par e-mail (confirmation ou récupération de mot de passe)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash || '';
    const search = window.location.search || '';

    // 1. Détection d'erreur dans le lien de confirmation
    if (hash.includes('error=') || search.includes('error=')) {
      const params = new URLSearchParams(hash.replace(/^#/, '') || search.replace(/^\?/, ''));
      const errorDesc = params.get('error_description') || params.get('error') || 'Lien de confirmation invalide ou expiré.';
      setAuthCallbackMessage({
        type: 'error',
        title: 'Lien invalide ou expiré',
        detail: decodeURIComponent(errorDesc.replace(/\+/g, ' '))
      });
      setCurrentView('auth-callback');
      return;
    }

    // 2. Détection de récupération de mot de passe (#type=recovery ou ?auth_callback=recovery)
    if (hash.includes('type=recovery') || search.includes('auth_callback=recovery')) {
      setCurrentView('reset-password');
      return;
    }

    // 3. Détection de confirmation de compte réussie (#type=signup ou ?auth_callback=signup)
    if (hash.includes('type=signup') || search.includes('auth_callback=signup') || (hash.includes('access_token=') && !hash.includes('type=recovery'))) {
      setAuthCallbackMessage({
        type: 'success',
        title: 'E-mail confirmé avec succès !',
        detail: 'Votre compte Boutika est activé. Vous pouvez dès à présent accéder à votre espace commerçant.'
      });
      setCurrentView('auth-callback');
      return;
    }
  }, []);

  // Écoute de l'état d'authentification Supabase et récupération de session active
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthStatus('unauthenticated');
      return;
    }
    const client = supabase;

    testSupabaseConnection().then(setSupabaseStatus);

    // Récupération de la session existante au chargement
    client.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        syncSessionAndUserData(session);
      } else {
        // Visiteur : on charge uniquement les boutiques et produits publics
        setAuthStatus('unauthenticated');
        refreshData('visitor');
      }
    });

    // Synchronisation en direct sur les événements Auth
    const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(INITIAL_USERS[2]);
        setAuthStatus('unauthenticated');
        setOrders([]);
        setSubscriptionRecords([]);
        setContactMessages([]);
        setAuditLogs([]);
        refreshData('visitor');
      } else if (session) {
        await syncSessionAndUserData(session);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Synchronisation des missions d'arrière-plan de Kimsi avec le serveur Node.js
  useEffect(() => {
    fetch('/api/kimsi/missions')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.missions) && data.missions.length > 0) {
          setKimsiMissions(data.missions);
        }
      })
      .catch(() => {});
  }, []);

  // Synchronisation des métriques plateforme avec le démon serveur : réservée au Super Admin
  useEffect(() => {
    if (currentUser.role !== 'super_admin') return;
    fetch('/api/platform/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stores: stores.map((s) => ({ id: s.id, name: s.name, planId: s.planId, status: s.status, trialUsed: s.trialUsed })),
        products: products.map((p) => ({ id: p.id, storeId: p.storeId, name: p.name, price: p.price, stock: p.stock })),
        orders: orders.map((o) => ({ id: o.id, orderNumber: o.orderNumber, storeId: o.storeId, total: o.total, paymentStatus: o.paymentStatus, status: o.status })),
        contactMessages: contactMessages.map((m) => ({ id: m.id, subject: m.subject, status: m.status }))
      })
    }).catch(() => {});
  }, [currentUser.role, stores.length, products.length, orders.length, contactMessages.length]);

  const createStoreForVendor = async (storeData: {
    name: string;
    whatsappNumber: string;
    city?: string;
    address?: string;
  }): Promise<{ success: boolean; message: string; store?: Store }> => {
    if (!isSupabaseConfigured || !supabase || !currentUser.id || currentUser.id === 'usr-visitor') {
      return { success: false, message: 'Session invalide ou Supabase non configuré.' };
    }

    try {
      const client = supabase;
      const rawSlug = storeData.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      const uniqueSlug = `${rawSlug}-${currentUser.id.slice(0, 4)}`;

      const { data: newRow, error } = await client
        .from('stores')
        .insert({
          vendor_id: currentUser.id,
          name: storeData.name,
          slug: uniqueSlug,
          whatsapp_number: storeData.whatsappNumber.replace(/[^0-9]/g, ''),
          city: storeData.city || 'Dakar',
          address: storeData.address || 'Dakar',
          status: 'active',
          plan_id: 'standard'
        })
        .select()
        .single();

      if (error) {
        return { success: false, message: error.message };
      }

      const formattedStore = buildVendorStore(newRow, currentUser);

      setStores(prev => [formattedStore, ...prev.filter(s => s.id !== formattedStore.id)]);
      setActiveStoreId(formattedStore.id);
      setSelectedStoreSlug(formattedStore.slug);
      setAuthStatus('ready');
      showToast(`Boutique "${formattedStore.name}" créée avec succès !`);
      return { success: true, message: 'Boutique créée avec succès !', store: formattedStore };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Erreur lors de la création de la boutique.' };
    }
  };

  const signUpWithSupabase = async (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    storeName?: string,
    storeExtra?: StoreSignupExtra
  ): Promise<{ success: boolean; requiresEmailConfirmation: boolean; message: string; email?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        requiresEmailConfirmation: false,
        message: 'Supabase n’est pas configuré. Veuillez définir VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY.'
      };
    }

    try {
      const redirectUrl = getAuthRedirectUrl('signup');
      const cleanPhone = phone.replace(/[^0-9+]/g, '');
      const rawSlug = (storeName || 'ma-boutique')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            phone: cleanPhone,
            store_name: storeName || 'Ma Boutique',
            store_slug: rawSlug,
            store_description: storeExtra?.description || '',
            business_type: storeExtra?.businessType || '',
            city: storeExtra?.city || '',
            address: storeExtra?.address || '',
            plan_id: storeExtra?.planId && PAID_PLAN_IDS.includes(storeExtra.planId) ? storeExtra.planId : 'standard'
          }
        }
      });

      if (error) {
        return { success: false, requiresEmailConfirmation: false, message: error.message };
      }

      // Si la confirmation d'email est activée dans Supabase, data.session est null
      const requiresEmailConfirmation = Boolean(data.user && !data.session);

      if (data.session) {
        await syncSessionAndUserData(data.session);
      }

      addAuditLog('SUPABASE_AUTH_SIGNUP', data.user?.id || 'new_user', `Inscription demandée pour ${email}`);
      return {
        success: true,
        requiresEmailConfirmation,
        email,
        message: requiresEmailConfirmation
          ? `Compte créé avec succès ! Un e-mail de confirmation sécurisé a été envoyé à ${email}.`
          : 'Votre boutique a été créée avec succès !'
      };
    } catch (err: any) {
      return {
        success: false,
        requiresEmailConfirmation: false,
        message: err?.message || 'Erreur lors de l’inscription.'
      };
    }
  };

  const signInWithSupabase = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; message: string; authStatus?: AuthStatus; role?: UserRole }> => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        message: 'Supabase Auth n’est pas configuré. Veuillez renseigner VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY dans l’environnement pour activer l’authentification sécurisée des commerçants et du Super Admin.'
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (!data.session || !data.user) {
        return { success: false, message: 'Impossible d’établir la session avec Supabase.' };
      }

      // CRITICAL: Synchroniser le profil et la boutique avant de déclarer la connexion réussie !
      const syncResult = await syncSessionAndUserData(data.session);

      addAuditLog('SUPABASE_AUTH_SIGNIN', data.user.id, `Connexion Supabase réussie pour ${email}`);
      return {
        success: true,
        message: 'Connexion réussie via Supabase !',
        authStatus: syncResult.status,
        role: syncResult.user?.role || 'vendor'
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Erreur lors de la connexion.'
      };
    }
  };

  const resetPasswordWithSupabase = async (email: string): Promise<{ success: boolean; message: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        message: 'Supabase n’est pas configuré. Veuillez définir les variables d’environnement.'
      };
    }

    try {
      const redirectUrl = getAuthRedirectUrl('recovery');
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      if (error) {
        return { success: false, message: error.message };
      }
      return {
        success: true,
        message: `Si un compte est associé à ${email}, un lien de réinitialisation sécurisé vient de vous être envoyé.`
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Erreur lors de la demande de réinitialisation.'
      };
    }
  };

  const updateUserPassword = async (newPassword: string): Promise<{ success: boolean; message: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, message: 'Supabase non configuré.' };
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        return { success: false, message: error.message };
      }
      return { success: true, message: 'Mot de passe modifié avec succès.' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Erreur lors de la mise à jour du mot de passe.' };
    }
  };

  const signOutUser = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Erreur déconnexion Supabase:', e);
      }
    }
    setCurrentUser(INITIAL_USERS[2]);
    setAuthStatus('unauthenticated');
    // Aucune donnée privée ne doit rester en mémoire après la déconnexion
    setOrders([]);
    setSubscriptionRecords([]);
    setContactMessages([]);
    setAuditLogs([]);
    setActiveStoreId('');
    setSelectedStoreSlug('');
    setCurrentView('home');
    showToast('Vous avez été déconnecté avec succès.');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const formatFCFA = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  // Boutique active : celle choisie, sinon la première boutique active, sinon une boutique vide
  const activeStore =
    stores.find((s) => s.id === activeStoreId) ||
    stores.find((s) => s.status === 'active') ||
    EMPTY_STORE;
  const storeProducts = products.filter((p) => p.storeId === activeStore.id);
  const storeOrders = orders.filter((o) => o.storeId === activeStore.id);

  const addAuditLog = (
    action: string, 
    target: string, 
    details: string, 
    severity: 'info' | 'warning' | 'critical' = 'info'
  ) => {
    const newLog: AuditLog = {
      id: uid('aud'),
      timestamp: new Date().toISOString(),
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      action,
      target,
      details,
      ipAddress: 'non collectée',
      severity
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    // Les actions des visiteurs anonymes ne sont pas écrites en base (évite le spam du journal)
    if (currentUser.role !== 'visitor') {
      insertAuditLogDb(newLog).catch(() => {});
    }
  };

  /**
   * Accès d'une boutique : AUCUNE formule n'est gratuite.
   *  - une formule activée (abonnement actif non échu) donne l'accès ;
   *  - sinon, l'essai gratuit de 3 jours (dates posées par la base) donne l'accès ;
   *  - sinon l'accès est bloqué jusqu'à l'activation d'une formule.
   */
  const checkStoreTrialStatus = (store: Store) => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();

    // 1. Abonnement actif
    const activeSub = subscriptionRecords.find(
      (s) => s.storeId === store.id && s.status === 'active' && new Date(s.validUntil).getTime() > now
    );
    if (activeSub) {
      return {
        isExpired: false,
        daysRemaining: Math.max(0, Math.ceil((new Date(activeSub.validUntil).getTime() - now) / DAY_MS)),
        trialEndDate: activeSub.validUntil,
        isActive: true,
        isPaid: true
      };
    }

    // 2. Essai gratuit de 3 jours (une seule fois par vendeur, posé par la base)
    const startMs = new Date(store.trialStartDate || store.createdAt).getTime();
    const endMs = store.trialEndDate
      ? new Date(store.trialEndDate).getTime()
      : startMs + TRIAL_DAYS * DAY_MS;
    const diffMs = endMs - now;
    const isExpired = diffMs <= 0;

    return {
      isExpired,
      daysRemaining: Math.max(0, Math.ceil(diffMs / DAY_MS)),
      trialEndDate: new Date(endMs).toISOString(),
      isActive: !isExpired,
      isPaid: false
    };
  };

  // Product Plan Limits Check (Standard: 50, Premium: 150, VIP: 500)
  // Le trigger SQL guard_product_store_quota applique la même règle côté base.
  const checkCanAddProduct = (storeId: string) => {
    const store = stores.find((s) => s.id === storeId) || activeStore;
    const currentCount = products.filter((p) => p.storeId === storeId).length;

    let maxAllowed = 50;
    if (store.planId === 'vip' || store.planId === 'business') {
      maxAllowed = 500;
    } else if (store.planId === 'premium' || store.planId === 'pro') {
      maxAllowed = 150;
    }

    // Essai terminé et aucune formule active : plus d'ajout (l'accès est de toute façon bloqué)
    const trialStatus = checkStoreTrialStatus(store);
    if (trialStatus.isExpired) {
      return {
        allowed: false,
        reason: 'Votre essai gratuit est terminé. Activez une formule pour continuer à ajouter des produits.',
        maxAllowed,
        currentCount
      };
    }

    if (currentCount >= maxAllowed) {
      return {
        allowed: false,
        reason: `Vous avez atteint la limite de ${maxAllowed} produits de votre formule ${store.planId.toUpperCase()}. Passez à la formule supérieure pour étendre votre catalogue.`,
        maxAllowed,
        currentCount
      };
    }

    return { allowed: true, maxAllowed, currentCount };
  };

  const addProduct = (prodData: Omit<Product, 'id' | 'createdAt'>): { success: boolean; message?: string } => {
    const limitCheck = checkCanAddProduct(prodData.storeId);
    if (!limitCheck.allowed) {
      showToast(limitCheck.reason || 'Ajout impossible');
      return { success: false, message: limitCheck.reason };
    }

    const newProduct: Product = {
      ...prodData,
      id: uid('prod'),
      createdAt: new Date().toISOString()
    };

    // Affichage immédiat, puis écriture en base ; annulation si la base refuse (quota, droits...)
    setProducts((prev) => [newProduct, ...prev]);
    insertProductDb(newProduct).then((res) => {
      if (!res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== newProduct.id));
        showToast(`Produit non enregistré : ${res.error}`);
      }
    });

    addAuditLog('PRODUCT_CREATED', newProduct.id, `Produit ajouté: "${newProduct.name}" (${formatFCFA(newProduct.price)})`);
    showToast(`Produit "${newProduct.name}" ajouté avec succès.`);
    return { success: true };
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    const target = products.find((p) => p.id === id);
    if (target) {
      const store = stores.find((s) => s.id === target.storeId);
      if (store && currentUser.role !== 'super_admin' && checkStoreTrialStatus(store).isExpired) {
        showToast('Essai gratuit terminé. Activez une formule pour modifier votre catalogue.');
        return;
      }
    }

    const previous = target;
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
    updateProductDb(id, updates).then((res) => {
      if (!res.ok) {
        if (previous) setProducts((prev) => prev.map((p) => (p.id === id ? previous : p)));
        showToast(`Modification refusée : ${res.error}`);
      }
    });
    addAuditLog('PRODUCT_UPDATED', id, `Mise à jour des informations du produit ${id}`);
    showToast('Produit mis à jour.');
  };

  const deleteProduct = (id: string) => {
    const target = products.find((p) => p.id === id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    deleteProductDb(id).then((res) => {
      if (!res.ok) {
        if (target) setProducts((prev) => [target, ...prev]);
        showToast(`Suppression refusée : ${res.error}`);
      }
    });
    addAuditLog('PRODUCT_DELETED', id, `Suppression du produit: "${target?.name || id}"`, 'warning');
    showToast('Produit supprimé du catalogue.');
  };

  const updateStoreProfile = (storeId: string, updates: Partial<Store>) => {
    const previous = stores.find((s) => s.id === storeId);
    setStores((prev) =>
      prev.map((s) => (s.id === storeId ? { ...s, ...updates } : s))
    );
    updateStoreRowDb(storeId, storeToRow(updates)).then((res) => {
      if (!res.ok) {
        if (previous) setStores((prev) => prev.map((s) => (s.id === storeId ? previous : s)));
        showToast(`Modification refusée : ${res.error}`);
      }
    });
    addAuditLog('STORE_UPDATED', storeId, `Modification des coordonnées de la boutique`);
    showToast('Paramètres de la boutique enregistrés.');
  };

  // Founding Stores Manager (Top 5 Pinned Stores)
  const updateFoundingStore = (storeId: string, isFounding: boolean, order?: number) => {
    const current = stores.find((s) => s.id === storeId);
    const rank = order !== undefined ? order : current?.foundingOrder || 1;
    const badge = isFounding ? `Boutique Fondatrice #${order || 1}` : undefined;

    setStores((prev) =>
      prev.map((s) =>
        s.id === storeId
          ? { ...s, isFoundingStore: isFounding, foundingOrder: rank, promotionBadge: badge }
          : s
      )
    );
    updateStoreRowDb(storeId, {
      is_founding_store: isFounding,
      founding_order: rank,
      promotion_badge: badge ?? null
    }).then((res) => {
      if (!res.ok) showToast(`Mise en avant non enregistrée : ${res.error}`);
    });
    addAuditLog('ADMIN_FOUNDING_STORE_UPDATED', storeId, `Boutique fondatrice mise à jour: ${isFounding ? `Ordre #${order}` : 'Retirée'}`);
    showToast('Mise en avant des boutiques fondatrices mise à jour.');
  };

  // VIP Promoted Stores Manager
  const updateVipPromotion = (storeId: string, isPromoted: boolean, order?: number, badge?: string) => {
    const current = stores.find((s) => s.id === storeId);
    const rank = order !== undefined ? order : current?.vipPromotionOrder || 1;
    const nextBadge = badge || (isPromoted ? (current?.promotionBadge || 'Boutique VIP à l’Honneur') : undefined);

    setStores((prev) =>
      prev.map((s) =>
        s.id === storeId
          ? { ...s, isVipPromoted: isPromoted, vipPromotionOrder: rank, promotionBadge: nextBadge }
          : s
      )
    );
    updateStoreRowDb(storeId, {
      is_vip_promoted: isPromoted,
      vip_promotion_order: rank,
      promotion_badge: nextBadge ?? null
    }).then((res) => {
      if (!res.ok) showToast(`Promotion VIP non enregistrée : ${res.error}`);
    });
    addAuditLog('ADMIN_VIP_PROMOTION_UPDATED', storeId, `Promotion VIP: ${isPromoted ? `Active (Rang #${order || 1})` : 'Désactivée'}`);
    showToast('Visibilité VIP mise à jour.');
  };

  // Changement de formule par le Super Admin : applique la formule ET ouvre 30 jours d'accès
  // (enregistré comme activation manuelle dans les abonnements).
  const setStorePlan = async (storeId: string, planId: PlanTierId): Promise<{ success: boolean; message: string }> => {
    if (currentUser.role !== 'super_admin') {
      return { success: false, message: 'Action réservée au Super Admin.' };
    }
    const res = await updateStoreRowDb(storeId, { plan_id: planId });
    if (!res.ok) {
      showToast(`Changement de formule refusé : ${res.error}`);
      return { success: false, message: res.error || 'Erreur' };
    }

    const store = stores.find((s) => s.id === storeId);
    const plan = plans.find((p) => p.id === planId);
    const manualRecord: SubscriptionRecord = {
      id: uid('sub'),
      storeId,
      storeName: store?.name || '',
      planId,
      planName: plan?.name || planId,
      amount: 0,
      currency: 'XOF',
      status: 'active',
      paymentGateway: 'Gratuit',
      transactionRef: 'ACTIVATION-MANUELLE-ADMIN',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    };
    const subRes = await insertSubscriptionDb(manualRecord);
    if (subRes.ok) {
      setSubscriptionRecords((prev) => [manualRecord, ...prev]);
    }

    setStores((prev) => prev.map((s) => (s.id === storeId ? { ...s, planId } : s)));
    addAuditLog('ADMIN_STORE_PLAN_CHANGED', storeId, `Formule de la boutique ${storeId} fixée sur "${planId}" (30 jours d'accès)`, 'warning');
    showToast('Formule de la boutique mise à jour.');
    return { success: true, message: 'Formule mise à jour.' };
  };

  // Export de sécurité des données actuellement chargées
  const exportPlatformBackup = () => {
    const backupSnapshot = {
      version: '3.0.0',
      exportedAt: new Date().toISOString(),
      platform: 'Boutika Sénégal',
      databaseType: 'PostgreSQL / Supabase (export des données visibles par ce compte)',
      coverageNotice: 'Export JSON des données chargées pour ce compte. Pour une sauvegarde complète de la base (dont auth.users), utilisez les sauvegardes Supabase (Database > Backups) ou pg_dump.',
      data: {
        stores,
        products,
        orders,
        subscriptionRecords,
        contactMessages,
        auditLogs,
        plans,
        kimsiMissions,
        users: [currentUser]
      }
    };
    const jsonStr = JSON.stringify(backupSnapshot, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `boutika-platform-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    addAuditLog('PLATFORM_BACKUP_DOWNLOADED', 'system', 'Export JSON des données téléchargé par le Super Admin');
    showToast('Export de sécurité généré et téléchargé.');
  };

  // La restauration depuis un fichier est désactivée : les données vivent en base.
  const restorePlatformBackup = (_jsonContent: string): { success: boolean; message: string; restoredCounts?: Record<string, number> } => {
    return {
      success: false,
      message: 'Restauration désactivée : les données sont dans Supabase. Utilisez Database > Backups dans Supabase pour restaurer.'
    };
  };

  // Plus aucune donnée de démonstration n'est chargée par l'application.
  // Le nettoyage des comptes de test en base se fait avec supabase/scripts/cleanup_test_data.sql
  const purgeDemoData = (): { success: boolean; message: string; purgedCounts: Record<string, number> } => {
    showToast('Aucune donnée de démonstration n’est chargée. Pour supprimer les comptes de test, utilisez le script SQL fourni.');
    return {
      success: true,
      message: 'Aucune donnée de démonstration locale. Nettoyage des comptes de test : script SQL cleanup_test_data.sql.',
      purgedCounts: { stores: 0 }
    };
  };

  const createOrder = (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>): Order => {
    const now = new Date();
    const newOrder: Order = {
      ...orderData,
      id: uid('ord'),
      orderNumber: `BK-${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(10000 + Math.random() * 90000)}`,
      createdAt: now.toISOString()
    };

    // Un visiteur ne relit pas les commandes (RLS) : on ne garde la commande en mémoire que pour un compte connecté
    setOrders((prev) => [newOrder, ...prev]);

    // Mise à jour immédiate de l'affichage du stock (la base le décrémente via un trigger)
    orderData.items.forEach((item) => {
      setProducts((prevProds) =>
        prevProds.map((p) => {
          if (p.id === item.productId) {
            const nextStock = Math.max(0, p.stock - item.quantity);
            let nextVariants = p.variants;
            if (item.variantId && p.variants) {
              nextVariants = p.variants.map((v) =>
                v.id === item.variantId ? { ...v, stock: Math.max(0, v.stock - item.quantity) } : v
              );
            }
            return { ...p, stock: nextStock, variants: nextVariants };
          }
          return p;
        })
      );
    });

    insertOrderDb(newOrder).then((res) => {
      if (!res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== newOrder.id));
        showToast('La commande n’a pas pu être enregistrée. Contactez la boutique directement sur WhatsApp.');
        console.warn('[db] insertOrder:', res.error);
      }
    });

    addAuditLog('ORDER_PLACED', newOrder.id, `Nouvelle commande reçue: ${newOrder.orderNumber} (${formatFCFA(newOrder.total)})`);
    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus, notes?: string) => {
    const previous = orders.find((o) => o.id === orderId);
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status, notes: notes || o.notes } : o))
    );
    updateOrderDb(orderId, notes ? { status, notes } : { status }).then((res) => {
      if (!res.ok) {
        if (previous) setOrders((prev) => prev.map((o) => (o.id === orderId ? previous : o)));
        showToast(`Statut non enregistré : ${res.error}`);
      }
    });
    addAuditLog('ORDER_STATUS_CHANGED', orderId, `Statut commande modifié -> ${status.toUpperCase()}`);
    showToast(`Statut de la commande mis à jour: ${status}`);
  };

  // Cart Management
  const addToCart = (product: Product, quantity = 1, variantId?: string, size?: string, color?: string) => {
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.product.id === product.id && item.variantId === variantId && item.selectedSize === size && item.selectedColor === color
      );
      if (existing) {
        return prev.map((item) =>
          item === existing
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity, variantId, selectedSize: size, selectedColor: color }];
    });
    showToast(`"${product.name}" ajouté au panier.`);
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Plans Management (modification valable pour la session en cours ; les tarifs officiels sont dans src/data/plans.ts)
  const updatePlan = (id: string, updates: Partial<SubscriptionPlan>) => {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    addAuditLog('PLAN_UPDATED', id, `Mise à jour de la grille tarifaire de la formule ${id}`, 'warning');
    showToast('Formule modifiée pour cette session. Les tarifs officiels se changent dans le code (src/data/plans.ts).');
  };

  // Le vendeur ne peut pas s'attribuer une formule lui-même : il envoie une DEMANDE,
  // activée ensuite par le Super Admin (le paiement réel Wave/Orange Money viendra ensuite).
  const simulateServerPaymentUpgrade = async (
    planId: PlanTierId,
    gateway: 'Wave' | 'Orange Money' | 'Carte Bancaire'
  ): Promise<{ success: boolean; message: string }> => {
    const targetPlan = plans.find((p) => p.id === planId) || plans[1];
    if (!activeStore.id) {
      return { success: false, message: 'Aucune boutique active.' };
    }

    const txRef = `DEMANDE-${gateway.slice(0, 4).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const newRecord: SubscriptionRecord = {
      id: uid('sub'),
      storeId: activeStore.id,
      storeName: activeStore.name,
      planId,
      planName: targetPlan.name,
      amount: targetPlan.priceMonthly,
      currency: 'XOF',
      status: 'en_attente_validation',
      paymentGateway: gateway,
      transactionRef: txRef,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    };

    const res = await insertSubscriptionDb(newRecord);
    if (!res.ok) {
      return { success: false, message: `Demande non enregistrée : ${res.error}` };
    }

    setSubscriptionRecords((prev) => [newRecord, ...prev]);
    addAuditLog(
      'SUBSCRIPTION_REQUESTED',
      activeStore.id,
      `Demande de passage à "${targetPlan.name}" (${formatFCFA(targetPlan.priceMonthly)}) via ${gateway}. Réf: ${txRef}. En attente de validation.`,
      'info'
    );

    return {
      success: true,
      message: `Demande envoyée pour la formule ${targetPlan.name}. Elle sera activée par l’équipe Boutika dès réception de votre paiement.`
    };
  };

  // Super Admin : valide une demande d'abonnement et applique la formule à la boutique
  const activateSubscriptionRecord = async (recordId: string): Promise<{ success: boolean; message: string }> => {
    if (currentUser.role !== 'super_admin') {
      return { success: false, message: 'Action réservée au Super Admin.' };
    }
    const record = subscriptionRecords.find((r) => r.id === recordId);
    if (!record) return { success: false, message: 'Demande introuvable.' };

    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const subRes = await updateSubscriptionDb(recordId, { status: 'active', valid_until: validUntil });
    if (!subRes.ok) {
      showToast(`Activation refusée : ${subRes.error}`);
      return { success: false, message: subRes.error || 'Erreur' };
    }
    const storeRes = await updateStoreRowDb(record.storeId, { plan_id: record.planId });
    if (!storeRes.ok) {
      showToast(`Formule non appliquée à la boutique : ${storeRes.error}`);
      return { success: false, message: storeRes.error || 'Erreur' };
    }

    setSubscriptionRecords((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, status: 'active', validUntil } : r))
    );
    setStores((prev) => prev.map((s) => (s.id === record.storeId ? { ...s, planId: record.planId } : s)));
    addAuditLog('ADMIN_SUBSCRIPTION_ACTIVATED', record.storeId, `Abonnement "${record.planName}" activé pour ${record.storeName}`, 'warning');
    showToast(`Abonnement ${record.planName} activé pour ${record.storeName}.`);
    return { success: true, message: 'Abonnement activé.' };
  };

  // Support & Contact
  const submitContactMessage = (name: string, email: string, phone: string, subject: string, message: string) => {
    const newMsg: ContactMessage = {
      id: uid('msg'),
      senderName: name,
      senderEmail: email,
      senderPhone: phone,
      subject,
      message,
      status: 'nouveau',
      createdAt: new Date().toISOString()
    };
    setContactMessages((prev) => [newMsg, ...prev]);
    insertContactDb(newMsg).then((res) => {
      if (!res.ok) {
        setContactMessages((prev) => prev.filter((m) => m.id !== newMsg.id));
        showToast('Votre message n’a pas pu être envoyé. Réessayez dans un instant.');
        console.warn('[db] insertContact:', res.error);
      }
    });
    addAuditLog('CONTACT_MESSAGE_RECEIVED', newMsg.id, `Nouveau message de contact de ${name} (${email})`);
    showToast('Votre message a été transmis à l’équipe Boutika.');
  };

  const updateMessageStatus = (id: string, status: 'nouveau' | 'traite' | 'archive') => {
    setContactMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status } : m))
    );
    updateContactDb(id, { status }).then((res) => {
      if (!res.ok) showToast(`Statut non enregistré : ${res.error}`);
    });
    showToast(`Message marqué comme ${status}.`);
  };

  const replyToContactMessage = (id: string, replyText: string) => {
    const repliedAt = new Date().toISOString();
    setContactMessages((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, status: 'traite', adminReply: replyText, repliedAt }
          : m
      )
    );
    updateContactDb(id, { status: 'traite', admin_reply: replyText, replied_at: repliedAt }).then((res) => {
      if (!res.ok) showToast(`Réponse non enregistrée : ${res.error}`);
    });
    addAuditLog('ADMIN_SUPPORT_REPLY', id, `Réponse envoyée au commerçant: "${replyText.slice(0, 60)}..."`);
    showToast('Réponse enregistrée et transmise au commerçant.');
  };

  // Kimsi AI State & Missions (Private Super Admin Agent)
  const [kimsiMissions, setKimsiMissions] = useState<KimsiMission[]>(() => {
    try {
      const saved = localStorage.getItem('boutika_kimsi_missions');
      if (saved) return JSON.parse(saved);
    } catch {
      /* ignore */
    }
    return [];
  });

  const [kimsiMessages, setKimsiMessages] = useState<KimsiChatMessage[]>([
    {
      id: 'k-welcome',
      sender: 'kimsi',
      content: 'Bonjour Super Administrateur. Je suis Kimsi, votre agent IA privé et exclusif pour la gouvernance de Boutika. Je surveille les indicateurs en temps réel, audite les règles de sécurité, analyse les comptes et prépare vos décisions stratégiques. Comment puis-je vous assister aujourd’hui ?',
      timestamp: new Date().toISOString()
    }
  ]);

  const startKimsiMission = (title: string, objective: string, durationHours: number): KimsiMission => {
    const newMission: KimsiMission = {
      id: `msn-${Date.now()}`,
      title,
      targetObjective: objective,
      durationHours,
      startedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + durationHours * 3600 * 1000).toISOString(),
      status: 'active',
      logs: [
        {
          timestamp: new Date().toISOString(),
          action: 'MISSION_LAUNCHED',
          details: `Mission Kimsi lancée pour une durée de ${durationHours} heure(s). Surveillance continue et consignation des logs.`
        }
      ]
    };

    // Propager au serveur pour persistance disque et exécution en arrière-plan
    fetch('/api/kimsi/missions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        targetObjective: objective,
        durationHours
      })
    })
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success && resData.mission) {
          setKimsiMissions((prev) => [resData.mission, ...prev.filter((m) => m.id !== resData.mission.id)]);
        } else if (resData.message) {
          showToast(resData.message);
        }
      })
      .catch(() => {});

    const nextMissions = [newMission, ...kimsiMissions.filter((m) => m.id !== newMission.id)];
    setKimsiMissions(nextMissions);
    localStorage.setItem('boutika_kimsi_missions', JSON.stringify(nextMissions));
    addAuditLog('KIMSI_MISSION_STARTED', newMission.id, `Mission "${title}" activée pour ${durationHours}h`);
    showToast(`Mission "${title}" confiée à Kimsi (${durationHours}h)`);
    return newMission;
  };

  const stopKimsiMission = (missionId: string) => {
    fetch(`/api/kimsi/missions/${missionId}/stop`, { method: 'POST' }).catch(() => {});

    setKimsiMissions((prev) => {
      const updated = prev.map((m) =>
        m.id === missionId
          ? {
              ...m,
              status: 'completed' as const,
              summaryReport: `Mission clôturée à ${new Date().toLocaleTimeString('fr-FR')}. Tous les paramètres sont normaux.`
            }
          : m
      );
      localStorage.setItem('boutika_kimsi_missions', JSON.stringify(updated));
      return updated;
    });
    addAuditLog('KIMSI_MISSION_STOPPED', missionId, `Mission Kimsi terminée.`);
    showToast('Mission de Kimsi terminée.');
  };

  const sendKimsiPrompt = async (prompt: string): Promise<{ answer: string; insights: string[] }> => {
    // Append user message
    const userMsg: KimsiChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'admin',
      content: prompt,
      timestamp: new Date().toISOString()
    };
    setKimsiMessages((prev) => [...prev, userMsg]);

    // Live platform summary : seuls les abonnements ACTIFS comptent dans le revenu
    const summaryRevenue = subscriptionRecords
      .filter((r) => r.status === 'active')
      .reduce((sum, r) => sum + r.amount, 0);
    const recentLogs = auditLogs.slice(0, 5).map((l) => `${l.action}: ${l.details}`);
    const newTickets = contactMessages.filter((m) => m.status === 'nouveau').length;

    const result = await askKimsiAI(prompt, {
      storesCount: stores.length,
      activeStoresCount: stores.filter((s) => s.status === 'active').length,
      productsCount: products.length,
      ordersCount: orders.length,
      subscriptionRevenue: summaryRevenue,
      newTicketsCount: newTickets,
      recentAuditLogs: recentLogs
    });

    const aiMsg: KimsiChatMessage = {
      id: `ai-${Date.now()}`,
      sender: 'kimsi',
      content: result.answer,
      timestamp: new Date().toISOString(),
      insights: result.insights
    };
    setKimsiMessages((prev) => [...prev, aiMsg]);

    addAuditLog('KIMSI_PROMPT_EXECUTED', 'kimsi_core', `Requête Super Admin traitée par Kimsi.`);
    return result;
  };

  const analyzeProductWithAi = async (imageHint: string) => {
    return await analyzeProductPhotoVIP(imageHint);
  };

  return (
    <AppContext.Provider
      value={{
        // Supabase backend properties
        isSupabaseConfigured,
        supabaseConnectionStatus: supabaseStatus,
        testConnection,
        signUpWithSupabase,
        signInWithSupabase,
        resetPasswordWithSupabase,
        updateUserPassword,
        signOutUser,
        createStoreForVendor,
        refreshData,

        // Authentication State
        isAuthenticated,
        authStatus,
        authLoading,
        authCallbackMessage,
        setAuthCallbackMessage,

        currentView,
        setCurrentView,
        currentUser,
        setCurrentUser,
        activeStoreId,
        setActiveStoreId,
        selectedStoreSlug,
        setSelectedStoreSlug,
        stores,
        activeStore,
        products,
        storeProducts,
        addProduct,
        updateProduct,
        deleteProduct,
        updateStoreProfile,
        updateFoundingStore,
        updateVipPromotion,
        setStorePlan,
        checkCanAddProduct,
        checkStoreTrialStatus,
        purgeDemoData,
        exportPlatformBackup,
        restorePlatformBackup,
        orders,
        storeOrders,
        createOrder,
        updateOrderStatus,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartTotal,
        cartCount,
        plans,
        updatePlan,
        subscriptionRecords,
        simulateServerPaymentUpgrade,
        activateSubscriptionRecord,
        contactMessages,
        submitContactMessage,
        updateMessageStatus,
        replyToContactMessage,
        auditLogs,
        addAuditLog,

        // Kimsi AI
        kimsiMissions,
        startKimsiMission,
        stopKimsiMission,
        kimsiMessages,
        sendKimsiPrompt,
        analyzeProductWithAi,

        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        toastMessage,
        showToast,
        formatFCFA
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
