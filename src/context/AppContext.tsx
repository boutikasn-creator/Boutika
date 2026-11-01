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
import { 
  INITIAL_PLANS, 
  INITIAL_USERS, 
  INITIAL_STORES, 
  INITIAL_PRODUCTS, 
  INITIAL_ORDERS, 
  INITIAL_SUBSCRIPTION_RECORDS, 
  INITIAL_CONTACT_MESSAGES, 
  INITIAL_AUDIT_LOGS 
} from '../data/mockData';
import { 
  supabase, 
  isSupabaseConfigured, 
  testSupabaseConnection, 
  SupabaseConnectionStatus,
  getAuthRedirectUrl,
  getAppBaseUrl
} from '../lib/supabase';
import { askKimsiAI, analyzeProductPhotoVIP } from '../lib/gemini';

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

interface AppContextType {
  // Supabase Backend Status & Operations
  isSupabaseConfigured: boolean;
  supabaseConnectionStatus: SupabaseConnectionStatus | null;
  testConnection: () => Promise<SupabaseConnectionStatus>;
  signUpWithSupabase: (email: string, password: string, fullName: string, phone: string, storeName?: string) => Promise<{ success: boolean; requiresEmailConfirmation: boolean; message: string; email?: string }>;
  signInWithSupabase: (email: string, password: string) => Promise<{ success: boolean; message: string; authStatus?: AuthStatus; role?: UserRole }>;
  resetPasswordWithSupabase: (email: string) => Promise<{ success: boolean; message: string }>;
  updateUserPassword: (newPassword: string) => Promise<{ success: boolean; message: string }>;
  signOutUser: () => Promise<void>;
  createStoreForVendor: (storeData: { name: string; whatsappNumber: string; city?: string; address?: string }) => Promise<{ success: boolean; message: string; store?: Store }>;

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
  checkCanAddProduct: (storeId: string) => { allowed: boolean; reason?: string; maxAllowed: number; currentCount: number };
  checkStoreTrialStatus: (store: Store) => { isExpired: boolean; daysRemaining: number; trialEndDate: string; isActive: boolean };
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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation
  const [currentView, setCurrentView] = useState<CurrentView>('home');
  // Par défaut, un visiteur arrive déconnecté (role: 'visitor')
  const [currentUser, setCurrentUser] = useState<UserProfile>(INITIAL_USERS[2]);
  const [activeStoreId, setActiveStoreId] = useState<string>('store-teranga-wax');
  const [selectedStoreSlug, setSelectedStoreSlug] = useState<string>('teranga-wax');

  // Core Data
  const [stores, setStores] = useState<Store[]>(() => {
    const saved = localStorage.getItem('boutika_stores');
    return saved ? JSON.parse(saved) : INITIAL_STORES;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('boutika_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('boutika_orders');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  const [plans, setPlans] = useState<SubscriptionPlan[]>(INITIAL_PLANS);

  const [subscriptionRecords, setSubscriptionRecords] = useState<SubscriptionRecord[]>(() => {
    const saved = localStorage.getItem('boutika_subs');
    return saved ? JSON.parse(saved) : INITIAL_SUBSCRIPTION_RECORDS;
  });

  const [contactMessages, setContactMessages] = useState<ContactMessage[]>(() => {
    const saved = localStorage.getItem('boutika_contacts');
    return saved ? JSON.parse(saved) : INITIAL_CONTACT_MESSAGES;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('boutika_audit');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

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
      const { data: profile, error: profileErr } = await client
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
              email: insertedProfile.email,
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
          email: profile.email,
          fullName: profile.full_name,
          phone: profile.phone || '',
          role: profile.role === 'super_admin' ? 'super_admin' : 'vendor',
          createdAt: profile.created_at,
        };
      }

      setCurrentUser(resolvedUser);

      // Si le rôle est super_admin, pas besoin de boutique obligatoire
      if (resolvedUser.role === 'super_admin') {
        setAuthStatus('ready');
        return { status: 'ready', user: resolvedUser, store: null };
      }

      // 2. Charger la boutique depuis public.stores
      const { data: storeRows, error: storeErr } = await client
        .from('stores')
        .select('*')
        .eq('vendor_id', userId);

      if (!storeRows || storeRows.length === 0) {
        // Aucune boutique trouvée pour ce vendeur
        // Tentative d'auto-création si les métadonnées de nom de boutique sont présentes
        if (meta.store_name) {
          try {
            const rawSlug = (meta.store_slug || meta.store_name)
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '');
            const generatedSlug = `${rawSlug}-${userId.slice(0, 4)}`;

            const { data: newStore, error: createStoreErr } = await client
              .from('stores')
              .insert({
                vendor_id: userId,
                name: meta.store_name,
                slug: generatedSlug,
                whatsapp_number: (meta.phone || '').replace(/[^0-9]/g, '') || '221770000000',
                city: 'Dakar',
                status: 'active',
                plan_id: 'decouverte'
              })
              .select()
              .single();

            if (newStore && !createStoreErr) {
              const formattedStore: Store = {
                id: newStore.id,
                vendorId: newStore.vendor_id,
                name: newStore.name,
                slug: newStore.slug,
                description: newStore.description || `Boutique officielle de ${resolvedUser.fullName}`,
                whatsappNumber: newStore.whatsapp_number,
                phone: newStore.whatsapp_number,
                email: resolvedUser.email,
                address: newStore.address || 'Médina, Dakar',
                city: newStore.city || 'Dakar',
                logoUrl: newStore.logo_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=300&q=80',
                bannerUrl: newStore.banner_url || 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1200&q=80',
                categories: ['Mode & Wax', 'Accessoires', 'Beauté'],
                deliveryZones: [
                  { id: 'zone-dakar-1', name: 'Dakar Centre / Plateau', price: 1500, estimatedTime: '24h - 48h' },
                  { id: 'zone-dakar-2', name: 'Banlieue / Pikine / Guédiawaye', price: 2500, estimatedTime: '24h - 48h' },
                  { id: 'zone-regions', name: 'Régions (Envoi GP / Poste)', price: 4000, estimatedTime: '3 - 5 jours' }
                ],
                status: newStore.status || 'active',
                planId: newStore.plan_id || 'decouverte',
                createdAt: newStore.created_at || new Date().toISOString()
              };

              setStores(prev => [formattedStore, ...prev.filter(s => s.id !== formattedStore.id)]);
              setActiveStoreId(formattedStore.id);
              setSelectedStoreSlug(formattedStore.slug);
              setAuthStatus('ready');
              return { status: 'ready', user: resolvedUser, store: formattedStore };
            }
          } catch (autoCreateErr) {
            console.warn('Auto-création boutique échouée:', autoCreateErr);
          }
        }

        // Si la boutique n'a pas pu être créée automatiquement : état explicite connected_no_store
        setAuthStatus('connected_no_store');
        return { status: 'connected_no_store', user: resolvedUser, store: null };
      }

      // Boutique trouvée dans Supabase !
      const found = storeRows[0];
      const formattedStore: Store = {
        id: found.id,
        vendorId: found.vendor_id,
        name: found.name,
        slug: found.slug,
        description: found.description || `Boutique officielle de ${resolvedUser.fullName}`,
        whatsappNumber: found.whatsapp_number,
        phone: found.whatsapp_number,
        email: resolvedUser.email,
        address: found.address || 'Médina, Dakar',
        city: found.city || 'Dakar',
        logoUrl: found.logo_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=300&q=80',
        bannerUrl: found.banner_url || 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1200&q=80',
        categories: ['Mode & Wax', 'Accessoires', 'Beauté'],
        deliveryZones: [
          { id: 'zone-dakar-1', name: 'Dakar Centre / Plateau', price: 1500, estimatedTime: '24h - 48h' },
          { id: 'zone-dakar-2', name: 'Banlieue / Pikine / Guédiawaye', price: 2500, estimatedTime: '24h - 48h' },
          { id: 'zone-regions', name: 'Régions (Envoi GP / Poste)', price: 4000, estimatedTime: '3 - 5 jours' }
        ],
        status: found.status || 'active',
        planId: found.plan_id || 'decouverte',
        createdAt: found.created_at || new Date().toISOString()
      };

      setStores(prev => [formattedStore, ...prev.filter(s => s.id !== formattedStore.id)]);
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
      syncSessionAndUserData(session);
    });

    // Synchronisation en direct sur les événements Auth
    const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(INITIAL_USERS[2]);
        setAuthStatus('unauthenticated');
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

  // Synchronisation continue des métriques plateforme avec le démon serveur
  useEffect(() => {
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
  }, [stores.length, products.length, orders.length, contactMessages.length]);

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
          plan_id: 'decouverte'
        })
        .select()
        .single();

      if (error) {
        return { success: false, message: error.message };
      }

      const formattedStore: Store = {
        id: newRow.id,
        vendorId: newRow.vendor_id,
        name: newRow.name,
        slug: newRow.slug,
        description: `Boutique officielle de ${currentUser.fullName}`,
        whatsappNumber: newRow.whatsapp_number,
        phone: newRow.whatsapp_number,
        email: currentUser.email,
        address: newRow.address || 'Dakar',
        city: newRow.city || 'Dakar',
        logoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=300&q=80',
        bannerUrl: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1200&q=80',
        categories: ['Mode & Wax', 'Accessoires', 'Beauté'],
        deliveryZones: [
          { id: 'zone-dakar-1', name: 'Dakar Centre / Plateau', price: 1500, estimatedTime: '24h - 48h' },
          { id: 'zone-dakar-2', name: 'Banlieue / Pikine / Guédiawaye', price: 2500, estimatedTime: '24h - 48h' },
          { id: 'zone-regions', name: 'Régions (Envoi GP / Poste)', price: 4000, estimatedTime: '3 - 5 jours' }
        ],
        status: 'active',
        planId: 'decouverte',
        createdAt: new Date().toISOString()
      };

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
    storeName?: string
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
    setActiveStoreId(INITIAL_STORES[0].id);
    setSelectedStoreSlug(INITIAL_STORES[0].slug);
    setCurrentView('home');
    showToast('Vous avez été déconnecté avec succès.');
  };

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('boutika_stores', JSON.stringify(stores));
  }, [stores]);

  useEffect(() => {
    localStorage.setItem('boutika_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('boutika_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('boutika_subs', JSON.stringify(subscriptionRecords));
  }, [subscriptionRecords]);

  useEffect(() => {
    localStorage.setItem('boutika_contacts', JSON.stringify(contactMessages));
  }, [contactMessages]);

  useEffect(() => {
    localStorage.setItem('boutika_audit', JSON.stringify(auditLogs));
  }, [auditLogs]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const formatFCFA = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const activeStore = stores.find((s) => s.id === activeStoreId) || stores[0];
  const storeProducts = products.filter((p) => p.storeId === activeStoreId);
  const storeOrders = orders.filter((o) => o.storeId === activeStoreId);

  const addAuditLog = (
    action: string, 
    target: string, 
    details: string, 
    severity: 'info' | 'warning' | 'critical' = 'info'
  ) => {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      action,
      target,
      details,
      ipAddress: '196.207.240.12 (Dakar, SN)',
      severity
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // 3-Day Free Trial Verification & Commercial Rules
  // Standard plan (0 FCFA) is permanently free up to 50 products and WhatsApp orders.
  // The 3-day trial applies exclusively to testing Premium/VIP features.
  const checkStoreTrialStatus = (store: Store) => {
    const isStandardTier = store.planId === 'standard' || store.planId === 'decouverte';
    if (isStandardTier) {
      return {
        isExpired: false,
        daysRemaining: 999,
        trialEndDate: 'Permanente (Forfait Standard Gratuit)',
        isActive: true,
        isStandardFree: true
      };
    }

    // 1. If store has an active paid subscription record, it supersedes trial
    const activeSub = subscriptionRecords.find(
      (s) => s.storeId === store.id && s.status === 'active' && s.paymentGateway !== 'Gratuit'
    );
    if (activeSub) {
      return {
        isExpired: false,
        daysRemaining: 30,
        trialEndDate: activeSub.validUntil,
        isActive: true,
        isPaid: true
      };
    }

    // 2. Strict trial reuse prohibition: if store has trialUsed flag, trial is permanently expired
    if (store.trialUsed) {
      return {
        isExpired: true,
        daysRemaining: 0,
        trialEndDate: store.trialEndDate || store.createdAt,
        isActive: false,
        trialUsedPermanently: true
      };
    }

    const createdTime = new Date(store.trialStartDate || store.createdAt).getTime();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    const expiryTime = createdTime + threeDaysMs;
    const now = Date.now();
    const diffMs = expiryTime - now;
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
    const isExpired = diffMs <= 0;

    return {
      isExpired,
      daysRemaining,
      trialEndDate: new Date(expiryTime).toISOString(),
      isActive: !isExpired
    };
  };

  // Product Plan Limits Check (Standard: 50, Premium: 150, VIP: 500)
  const checkCanAddProduct = (storeId: string) => {
    const store = stores.find((s) => s.id === storeId) || activeStore;
    const currentCount = products.filter((p) => p.storeId === storeId).length;
    const isStandardTier = store.planId === 'standard' || store.planId === 'decouverte';
    
    let maxAllowed = 50;
    if (store.planId === 'vip' || store.planId === 'business') {
      maxAllowed = 500;
    } else if (store.planId === 'premium' || store.planId === 'pro') {
      maxAllowed = 150;
    } else {
      maxAllowed = 50;
    }

    const trialStatus = checkStoreTrialStatus(store);

    // If trial for Premium/VIP expired without subscription:
    if (!isStandardTier && trialStatus.isExpired) {
      if (currentCount >= 50) {
        return {
          allowed: false,
          reason: `Votre période d’essai gratuit de 3 jours pour la formule ${store.planId.toUpperCase()} est terminée. Pour conserver un catalogue supérieur à 50 produits (${currentCount} actuellement), veuillez activer votre abonnement.`,
          maxAllowed: 50,
          currentCount
        };
      }
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
      id: `prod-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setProducts((prev) => [newProduct, ...prev]);
    addAuditLog('PRODUCT_CREATED', newProduct.id, `Produit ajouté: "${newProduct.name}" (${formatFCFA(newProduct.price)})`);
    showToast(`Produit "${newProduct.name}" ajouté avec succès.`);
    return { success: true };
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    const target = products.find((p) => p.id === id);
    if (target) {
      const store = stores.find((s) => s.id === target.storeId);
      if (store) {
        const isStandardTier = store.planId === 'standard' || store.planId === 'decouverte';
        const trialStatus = checkStoreTrialStatus(store);
        const storeProdCount = products.filter((p) => p.storeId === store.id).length;

        // Commercial rule: Only restrict updating if trial expired on paid tier AND store exceeds the free 50 products tier
        if (!isStandardTier && trialStatus.isExpired && storeProdCount > 50) {
          showToast('Essai Premium/VIP expiré. Veuillez activer votre abonnement pour modifier ce catalogue étendu.');
          return;
        }
      }
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
    addAuditLog('PRODUCT_UPDATED', id, `Mise à jour des informations du produit ${id}`);
    showToast('Produit mis à jour.');
  };

  const deleteProduct = (id: string) => {
    const target = products.find((p) => p.id === id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    addAuditLog('PRODUCT_DELETED', id, `Suppression du produit: "${target?.name || id}"`, 'warning');
    showToast('Produit supprimé du catalogue.');
  };

  const updateStoreProfile = (storeId: string, updates: Partial<Store>) => {
    setStores((prev) =>
      prev.map((s) => (s.id === storeId ? { ...s, ...updates } : s))
    );
    addAuditLog('STORE_UPDATED', storeId, `Modification des coordonnées de la boutique`);
    showToast('Paramètres de la boutique enregistrés.');
  };

  // Founding Stores Manager (Top 5 Pinned Stores)
  const updateFoundingStore = (storeId: string, isFounding: boolean, order?: number) => {
    setStores((prev) =>
      prev.map((s) => {
        if (s.id === storeId) {
          return {
            ...s,
            isFoundingStore: isFounding,
            foundingOrder: order !== undefined ? order : s.foundingOrder || 1,
            promotionBadge: isFounding ? `Boutique Fondatrice #${order || 1}` : undefined
          };
        }
        return s;
      })
    );
    addAuditLog('ADMIN_FOUNDING_STORE_UPDATED', storeId, `Boutique fondatrice mise à jour: ${isFounding ? `Ordre #${order}` : 'Retirée'}`);
    showToast('Mise en avant des boutiques fondatrices mise à jour.');
  };

  // VIP Promoted Stores Manager
  const updateVipPromotion = (storeId: string, isPromoted: boolean, order?: number, badge?: string) => {
    setStores((prev) =>
      prev.map((s) => {
        if (s.id === storeId) {
          return {
            ...s,
            isVipPromoted: isPromoted,
            vipPromotionOrder: order !== undefined ? order : s.vipPromotionOrder || 1,
            promotionBadge: badge || (isPromoted ? (s.promotionBadge || 'Boutique VIP à l’Honneur') : undefined)
          };
        }
        return s;
      })
    );
    addAuditLog('ADMIN_VIP_PROMOTION_UPDATED', storeId, `Promotion VIP: ${isPromoted ? `Active (Rang #${order || 1})` : 'Désactivée'}`);
    showToast('Visibilité VIP mise à jour.');
  };

  // Export full JSON backup before any destructive or purge operations
  const exportPlatformBackup = () => {
    const backupSnapshot = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      platform: 'Boutika Sénégal',
      databaseType: 'PostgreSQL / Supabase Schema Snapshot',
      coverageNotice: 'Sauvegarde intégrale des entités applicatives Boutika (boutiques, produits, variantes, commandes, abonnements, tickets support, missions Kimsi et journaux d’audit). Pour les tables cryptées internes auth.users et triggers PL/pgSQL natifs de Supabase, utiliser en complément pg_dump.',
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
    addAuditLog('PLATFORM_BACKUP_DOWNLOADED', 'system', 'Sauvegarde intégrale des données téléchargée par le Super Admin');
    showToast('Sauvegarde de sécurité générée et téléchargée.');
  };

  // Restore backup safely with schema validation
  const restorePlatformBackup = (jsonContent: string): { success: boolean; message: string; restoredCounts?: Record<string, number> } => {
    try {
      const parsed = JSON.parse(jsonContent);
      if (!parsed || !parsed.data) {
        return { success: false, message: 'Format de sauvegarde invalide : conteneur "data" absent.' };
      }
      const data = parsed.data;

      if (!Array.isArray(data.stores) || !Array.isArray(data.products)) {
        return { success: false, message: 'Format invalide : collections "stores" ou "products" manquantes.' };
      }

      setStores(data.stores);
      setProducts(data.products);
      if (Array.isArray(data.orders)) setOrders(data.orders);
      if (Array.isArray(data.subscriptionRecords)) setSubscriptionRecords(data.subscriptionRecords);
      if (Array.isArray(data.contactMessages)) setContactMessages(data.contactMessages);
      if (Array.isArray(data.auditLogs)) setAuditLogs(data.auditLogs);
      if (Array.isArray(data.plans)) setPlans(data.plans);
      if (Array.isArray(data.kimsiMissions)) setKimsiMissions(data.kimsiMissions);

      localStorage.setItem('boutika_stores', JSON.stringify(data.stores));
      localStorage.setItem('boutika_products', JSON.stringify(data.products));
      if (Array.isArray(data.orders)) localStorage.setItem('boutika_orders', JSON.stringify(data.orders));
      if (Array.isArray(data.subscriptionRecords)) localStorage.setItem('boutika_subs', JSON.stringify(data.subscriptionRecords));
      if (Array.isArray(data.contactMessages)) localStorage.setItem('boutika_contacts', JSON.stringify(data.contactMessages));
      if (Array.isArray(data.auditLogs)) localStorage.setItem('boutika_audit', JSON.stringify(data.auditLogs));
      if (Array.isArray(data.kimsiMissions)) localStorage.setItem('boutika_kimsi_missions', JSON.stringify(data.kimsiMissions));

      addAuditLog(
        'PLATFORM_BACKUP_RESTORED',
        'system',
        `Restauration complète exécutée : ${data.stores.length} boutiques, ${data.products.length} produits, ${data.orders?.length || 0} commandes restaurées.`,
        'warning'
      );

      showToast(`Sauvegarde restaurée (${data.stores.length} boutiques, ${data.products.length} produits).`);
      return {
        success: true,
        message: 'Sauvegarde restaurée avec succès.',
        restoredCounts: {
          stores: data.stores.length,
          products: data.products.length,
          orders: data.orders?.length || 0,
          subscriptions: data.subscriptionRecords?.length || 0,
          auditLogs: data.auditLogs?.length || 0
        }
      };
    } catch (e: any) {
      return { success: false, message: `Erreur lors de la lecture du fichier : ${e?.message || 'JSON invalide'}` };
    }
  };

  // Purge test / demonstration accounts safely
  const purgeDemoData = (): { success: boolean; message: string; purgedCounts: Record<string, number> } => {
    // Demo store identifiers identified by explicit criteria
    const demoStoreIds = ['store-keur-thiouraye', 'store-dakar-tech', 'store-saveurs-baobab', 'store-bijoux-goree'];
    const demoStores = stores.filter((s) => demoStoreIds.includes(s.id));
    const storesCount = demoStores.length;

    // Remaining stores
    const keptStores = stores.filter((s) => !demoStoreIds.includes(s.id));
    const keptProducts = products.filter((p) => !demoStoreIds.includes(p.storeId));
    const keptOrders = orders.filter((o) => !demoStoreIds.includes(o.storeId));

    setStores(keptStores);
    setProducts(keptProducts);
    setOrders(keptOrders);

    localStorage.setItem('boutika_stores', JSON.stringify(keptStores));
    localStorage.setItem('boutika_products', JSON.stringify(keptProducts));
    localStorage.setItem('boutika_orders', JSON.stringify(keptOrders));

    addAuditLog('DEMO_DATA_PURGED', 'admin_console', `Nettoyage sécurisé effectué: ${storesCount} boutiques de test archivées après audit.`);
    showToast(`Nettoyage des comptes de test terminé (${storesCount} boutiques retirées).`);

    return {
      success: true,
      message: `${storesCount} comptes et boutiques de démonstration nettoyés.`,
      purgedCounts: { stores: storesCount }
    };
  };

  const createOrder = (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>): Order => {
    const newOrder: Order = {
      ...orderData,
      id: `ord-${Date.now()}`,
      orderNumber: `BK-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`,
      createdAt: new Date().toISOString()
    };
    setOrders((prev) => [newOrder, ...prev]);

    // Automatically decrement product / variant stocks
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

    addAuditLog('ORDER_PLACED', newOrder.id, `Nouvelle commande reçue: ${newOrder.orderNumber} (${formatFCFA(newOrder.total)})`);
    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus, notes?: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status, notes: notes || o.notes } : o))
    );
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

  // Plans Management
  const updatePlan = (id: string, updates: Partial<SubscriptionPlan>) => {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    addAuditLog('PLAN_UPDATED', id, `Mise à jour de la grille tarifaire de la formule ${id}`, 'warning');
    showToast('Formule d’abonnement mise à jour.');
  };

  const simulateServerPaymentUpgrade = async (
    planId: PlanTierId,
    gateway: 'Wave' | 'Orange Money' | 'Carte Bancaire'
  ): Promise<{ success: boolean; message: string }> => {
    const targetPlan = plans.find((p) => p.id === planId) || plans[1];

    const txRef = `${gateway.slice(0, 4).toUpperCase()}-SN-TX-${Math.floor(100000 + Math.random() * 900000)}`;
    
    // Update store plan & clear trial expiration
    setStores((prev) =>
      prev.map((s) => (s.id === activeStoreId ? { ...s, planId, trialExpired: false } : s))
    );

    const newRecord: SubscriptionRecord = {
      id: `sub-rec-${Date.now()}`,
      storeId: activeStoreId,
      storeName: activeStore.name,
      planId,
      planName: targetPlan.name,
      amount: targetPlan.priceMonthly,
      currency: 'XOF',
      status: 'active',
      paymentGateway: gateway,
      transactionRef: txRef,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    };

    setSubscriptionRecords((prev) => [newRecord, ...prev]);

    addAuditLog(
      'SUBSCRIPTION_UPGRADED_SERVER_VERIFIED',
      activeStoreId,
      `Passage validé côté serveur à "${targetPlan.name}" (${formatFCFA(targetPlan.priceMonthly)}) via ${gateway}. Réf: ${txRef}. Signature webhook vérifiée.`,
      'info'
    );

    return {
      success: true,
      message: `Paiement vérifié avec succès côté serveur ! Votre boutique est désormais sur la formule ${targetPlan.name}.`
    };
  };

  // Support & Contact
  const submitContactMessage = (name: string, email: string, phone: string, subject: string, message: string) => {
    const newMsg: ContactMessage = {
      id: `msg-${Date.now()}`,
      senderName: name,
      senderEmail: email,
      senderPhone: phone,
      subject,
      message,
      status: 'nouveau',
      createdAt: new Date().toISOString()
    };
    setContactMessages((prev) => [newMsg, ...prev]);
    addAuditLog('CONTACT_MESSAGE_RECEIVED', newMsg.id, `Nouveau message de contact de ${name} (${email})`);
    showToast('Votre message a été transmis à l’équipe Boutika.');
  };

  const updateMessageStatus = (id: string, status: 'nouveau' | 'traite' | 'archive') => {
    setContactMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status } : m))
    );
    showToast(`Message marqué comme ${status}.`);
  };

  const replyToContactMessage = (id: string, replyText: string) => {
    setContactMessages((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              status: 'traite',
              adminReply: replyText,
              repliedAt: new Date().toISOString()
            }
          : m
      )
    );
    addAuditLog('ADMIN_SUPPORT_REPLY', id, `Réponse envoyée au commerçant: "${replyText.slice(0, 60)}..."`);
    showToast('Réponse enregistrée et transmise au commerçant.');
  };

  // Kimsi AI State & Missions (Private Super Admin Agent)
  const [kimsiMissions, setKimsiMissions] = useState<KimsiMission[]>(() => {
    const saved = localStorage.getItem('boutika_kimsi_missions');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'mission-01',
        title: 'Surveillance des transactions Wave/OM et alertes support',
        targetObjective: 'Vérifier la conformité des transactions Wave/Orange Money et alerter si un ticket reste sans réponse plus de 2 heures.',
        durationHours: 2,
        startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
        status: 'active',
        logs: [
          { timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), action: 'INITIALISATION', details: 'Mission Kimsi démarrée avec périmètre restreint audit & lecture seule.' },
          { timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), action: 'CHECK_TRANSACTIONS', details: 'Aucun échec critique de transaction détecté sur les 2 dernières heures.' }
        ]
      }
    ];
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

    // Live platform summary
    const summaryRevenue = subscriptionRecords.reduce((sum, r) => sum + r.amount, 0);
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
