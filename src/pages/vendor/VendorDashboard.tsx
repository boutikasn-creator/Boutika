import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, Store, OrderStatus, Order, DeliveryZone, PlanTierId, ProductVariant } from '../../types';
import { 
  Store as StoreIcon, 
  Package, 
  ShoppingBag, 
  Settings, 
  CreditCard, 
  HelpCircle, 
  Plus, 
  Edit, 
  Trash2, 
  ExternalLink, 
  Share2, 
  Check, 
  AlertTriangle,
  Phone,
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Image,
  DollarSign,
  RefreshCw,
  Sparkles,
  Bot,
  Zap,
  Tag
} from 'lucide-react';

type VendorTab = 'overview' | 'products' | 'orders' | 'settings' | 'subscription' | 'support';

export const VendorDashboard: React.FC = () => {
  const { 
    activeStore, 
    updateStoreProfile, 
    storeProducts, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    storeOrders, 
    updateOrderStatus, 
    plans,
    subscriptionRecords,
    simulateServerPaymentUpgrade,
    setCurrentView, 
    formatFCFA, 
    showToast,
    submitContactMessage,
    isAuthenticated,
    authStatus,
    authLoading,
    createStoreForVendor,
    currentUser,
    checkCanAddProduct,
    checkStoreTrialStatus,
    analyzeProductWithAi
  } = useApp();

  const [activeTab, setActiveTab] = useState<VendorTab>('overview');

  // Store creation sub-form state when user is connected but has no store in stores table
  const [newStoreName, setNewStoreName] = useState('');
  const [newStorePhone, setNewStorePhone] = useState(currentUser.phone || '+221 ');
  const [newStoreCity, setNewStoreCity] = useState('Dakar');
  const [isCreatingStore, setIsCreatingStore] = useState(false);
  const [storeCreationError, setStoreCreationError] = useState<string | null>(null);

  // 1. Guard: Loading state
  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center animate-spin">
          <RefreshCw className="w-7 h-7" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="font-heading font-bold text-lg text-stone-900">
            Chargement de votre espace vendeur...
          </h3>
          <p className="text-xs text-stone-500">
            Vérification de la session et synchronisation avec Supabase.
          </p>
        </div>
      </div>
    );
  }

  // 2. Guard: Unauthenticated
  if (!isAuthenticated || authStatus === 'unauthenticated') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <StoreIcon className="w-7 h-7" />
          </div>
          <h2 className="font-heading font-black text-2xl text-stone-900">
            Espace Vendeur Protégé
          </h2>
          <p className="text-xs text-stone-600 leading-relaxed">
            Vous devez être connecté avec votre compte commerçant pour accéder au tableau de bord, à vos articles et à vos commandes.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => setCurrentView('login')}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors cursor-pointer"
            >
              Se connecter à mon compte
            </button>
            <button
              onClick={() => setCurrentView('register')}
              className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              Créer ma boutique gratuitement
            </button>
            <button
              onClick={() => setCurrentView('home')}
              className="w-full py-2 text-xs text-stone-400 hover:text-stone-700 font-semibold cursor-pointer"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Guard: Connected but missing store in stores table (Solves Problem 2 for existing accounts)
  if (authStatus === 'connected_no_store') {
    const handleCreateInitialStore = async (e: React.FormEvent) => {
      e.preventDefault();
      setStoreCreationError(null);
      const name = newStoreName.trim() || `Boutique de ${currentUser.fullName || 'Vendeur'}`;
      const phone = newStorePhone.trim() || currentUser.phone || '221770000000';

      setIsCreatingStore(true);
      const res = await createStoreForVendor({
        name,
        whatsappNumber: phone,
        city: newStoreCity
      });
      setIsCreatingStore(false);

      if (!res.success) {
        setStoreCreationError(res.message);
      }
    };

    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-amber-200 shadow-xl space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center mx-auto shadow-md">
            <StoreIcon className="w-7 h-7" />
          </div>

          <div className="text-center space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              Bienvenue sur Boutika
            </span>
            <h2 className="font-heading font-black text-2xl text-stone-900">
              Configurez votre boutique
            </h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              Votre compte est validé (<strong>{currentUser.email}</strong>). Renseignez le nom de votre boutique pour commencer à vendre en ligne.
            </p>
          </div>

          {storeCreationError && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{storeCreationError}</span>
            </div>
          )}

          <form onSubmit={handleCreateInitialStore} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Nom commercial de votre boutique
              </label>
              <input
                type="text"
                required
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                placeholder="Ex : Teranga Wax Dakar"
                className="w-full px-3.5 py-3 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Numéro WhatsApp pour les commandes
              </label>
              <input
                type="tel"
                required
                value={newStorePhone}
                onChange={(e) => setNewStorePhone(e.target.value)}
                placeholder="+221 77 123 45 67"
                className="w-full px-3.5 py-3 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Ville principale de livraison
              </label>
              <input
                type="text"
                value={newStoreCity}
                onChange={(e) => setNewStoreCity(e.target.value)}
                placeholder="Ex : Dakar, Thiès, Saint-Louis"
                className="w-full px-3.5 py-3 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isCreatingStore}
              className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isCreatingStore ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Création de votre boutique...</span>
                </>
              ) : (
                <>
                  <span>Créer ma boutique et ouvrir le tableau de bord</span>
                  <Check className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Product modal (Add or Edit)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: 15000,
    compareAtPrice: 0,
    category: activeStore.categories[0] || 'Boubous & Robes',
    images: ['https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=800&q=80'],
    stock: 10,
    isActive: true,
    isFeatured: false,
    sku: '',
    sizes: 'M, L, XL',
    colors: 'Wax Indigo, Ocre Doré'
  });

  // Settings form
  const [storeForm, setStoreForm] = useState({
    name: activeStore.name,
    slug: activeStore.slug,
    description: activeStore.description,
    whatsappNumber: activeStore.whatsappNumber,
    phone: activeStore.phone,
    address: activeStore.address,
    city: activeStore.city,
    logoUrl: activeStore.logoUrl,
    bannerUrl: activeStore.bannerUrl
  });

  // Support form inside vendor dashboard
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSubject, setSupportSubject] = useState('Question technique');

  // Subscription upgrade modal simulation
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<PlanTierId>('premium');
  const [selectedPaymentGateway, setSelectedPaymentGateway] = useState<'Wave' | 'Orange Money' | 'Carte Bancaire'>('Wave');
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Statistics calculation
  const totalRevenue = storeOrders
    .filter((o) => o.status !== 'annulee')
    .reduce((sum, o) => sum + o.total, 0);
  const totalOrdersCount = storeOrders.length;
  const pendingOrdersCount = storeOrders.filter((o) => o.status === 'nouvelle' || o.status === 'en_preparation').length;
  const lowStockCount = storeProducts.filter((p) => p.stock <= 5).length;

  const currentPlan = plans.find((p) => p.id === activeStore.planId) || plans[0];
  const trialStatus = checkStoreTrialStatus(activeStore);

  const handleOpenAddProduct = () => {
    // Check product quota & trial status
    const limitCheck = checkCanAddProduct(activeStore.id);
    if (!limitCheck.allowed) {
      showToast(limitCheck.reason || 'Ajout impossible');
      return;
    }
    setEditingProductId(null);
    setAiFeedback(null);
    setProductForm({
      name: '',
      description: '',
      price: 15000,
      compareAtPrice: 0,
      category: activeStore.categories[0] || 'Boubous & Robes',
      images: ['https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80'],
      stock: 15,
      isActive: true,
      isFeatured: false,
      sku: `BTK-${Math.floor(1000 + Math.random() * 9000)}`,
      sizes: 'M, L, XL',
      colors: 'Wax Indigo, Ocre Doré'
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProductId(prod.id);
    setAiFeedback(null);
    setProductForm({
      name: prod.name,
      description: prod.description,
      price: prod.price,
      compareAtPrice: prod.compareAtPrice || 0,
      category: prod.category,
      images: prod.images,
      stock: prod.stock,
      isActive: prod.isActive,
      isFeatured: prod.isFeatured || false,
      sku: prod.sku || `BTK-${prod.id.slice(-4)}`,
      sizes: prod.sizes ? prod.sizes.join(', ') : 'M, L, XL',
      colors: prod.colors ? prod.colors.join(', ') : 'Indigo, Noir'
    });
    setIsProductModalOpen(true);
  };

  const handleTriggerAiAssistance = async () => {
    if (activeStore.planId !== 'vip' && activeStore.planId !== 'business') {
      showToast("L'assistance IA de description et analyse photo est une exclusivité de la formule VIP (19 000 FCFA/mois). Passez à la formule VIP pour l'utiliser !");
      return;
    }

    const hint = productForm.name || productForm.category || 'Article wax traditionnel sénégalais';
    setIsAiGenerating(true);
    setAiFeedback(null);

    try {
      const result = await analyzeProductWithAi(hint);
      setProductForm((prev) => ({
        ...prev,
        name: prev.name || result.name,
        description: result.description,
        price: prev.price || result.suggestedPrice,
        category: prev.category || result.category,
        sizes: result.sizes.join(', '),
        colors: result.colors.join(', ')
      }));
      setAiFeedback(`Généré avec succès : Prix conseillé ${formatFCFA(result.suggestedPrice)}, tailles [${result.sizes.join(', ')}].`);
      showToast('Descriptif et variantes générés par l\'Assistant VIP Boutika !');
    } catch (e) {
      showToast('Génération temporairement indisponible.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name) {
      showToast('Le nom du produit est requis.');
      return;
    }

    const isStandardTier = activeStore.planId === 'standard' || activeStore.planId === 'decouverte';
    if (!isStandardTier && trialStatus.isExpired && storeProducts.length > 50) {
      showToast('Votre période d’essai gratuit de 3 jours a expiré pour ce catalogue étendu. Activez votre abonnement pour modifier ou ajouter des produits.');
      return;
    }

    const sizesArray = productForm.sizes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const colorsArray = productForm.colors
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    // Build structured variants
    const variants: ProductVariant[] = [];
    if (sizesArray.length > 0 && colorsArray.length > 0) {
      let vIdx = 0;
      const count = sizesArray.length * colorsArray.length;
      const stockPerVar = Math.max(1, Math.floor(Number(productForm.stock) / count));
      sizesArray.forEach((sz) => {
        colorsArray.forEach((col) => {
          variants.push({
            id: `var-${Date.now()}-${vIdx++}`,
            sku: `${productForm.sku || 'PROD'}-${sz.slice(0, 3).toUpperCase()}-${col.slice(0, 3).toUpperCase()}`,
            size: sz,
            color: col,
            stock: stockPerVar,
            priceDelta: 0
          });
        });
      });
    } else if (sizesArray.length > 0) {
      sizesArray.forEach((sz, idx) => {
        variants.push({
          id: `var-${Date.now()}-${idx}`,
          sku: `${productForm.sku || 'PROD'}-${sz.toUpperCase()}`,
          size: sz,
          color: 'Standard',
          stock: Math.max(1, Math.floor(Number(productForm.stock) / sizesArray.length)),
          priceDelta: 0
        });
      });
    } else if (colorsArray.length > 0) {
      colorsArray.forEach((col, idx) => {
        variants.push({
          id: `var-${Date.now()}-${idx}`,
          sku: `${productForm.sku || 'PROD'}-${col.slice(0, 3).toUpperCase()}`,
          size: 'Standard',
          color: col,
          stock: Math.max(1, Math.floor(Number(productForm.stock) / colorsArray.length)),
          priceDelta: 0
        });
      });
    }

    if (editingProductId) {
      updateProduct(editingProductId, {
        name: productForm.name,
        description: productForm.description,
        price: Number(productForm.price),
        compareAtPrice: productForm.compareAtPrice ? Number(productForm.compareAtPrice) : undefined,
        category: productForm.category,
        images: productForm.images,
        stock: Number(productForm.stock),
        isActive: productForm.isActive,
        isFeatured: productForm.isFeatured,
        sku: productForm.sku,
        sizes: sizesArray,
        colors: colorsArray,
        variants: variants.length > 0 ? variants : undefined
      });
    } else {
      addProduct({
        storeId: activeStore.id,
        name: productForm.name,
        description: productForm.description,
        price: Number(productForm.price),
        compareAtPrice: productForm.compareAtPrice ? Number(productForm.compareAtPrice) : undefined,
        category: productForm.category,
        images: productForm.images,
        stock: Number(productForm.stock),
        isActive: productForm.isActive,
        isFeatured: productForm.isFeatured,
        sku: productForm.sku,
        sizes: sizesArray,
        colors: colorsArray,
        variants: variants.length > 0 ? variants : undefined
      });
    }
    setIsProductModalOpen(false);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateStoreProfile(activeStore.id, storeForm);
  };

  const handlePerformUpgrade = async () => {
    setIsUpgrading(true);
    const res = await simulateServerPaymentUpgrade(selectedPlanForUpgrade, selectedPaymentGateway);
    setIsUpgrading(false);
    setIsUpgradeModalOpen(false);
    showToast(res.message);
  };

  const handleSendSupport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage) return;
    submitContactMessage(
      activeStore.name,
      activeStore.email,
      activeStore.phone,
      `[Support Vendeur] ${supportSubject}`,
      supportMessage
    );
    setSupportMessage('');
    showToast('Votre ticket d’assistance a été envoyé à l’équipe Boutika.');
  };

  return (
    <div className="min-h-screen bg-stone-100/60 pb-20">
      
      {/* Subheader / Vendor Banner */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img 
              src={activeStore.logoUrl} 
              alt={activeStore.name} 
              className="w-12 h-12 rounded-xl object-cover border border-stone-200 shadow-xs"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading font-black text-xl text-stone-900">
                  {activeStore.name}
                </h1>
                <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  {currentPlan.name}
                </span>
              </div>
              <p className="text-xs text-stone-500 font-mono">
                Lien public : https://boutika.sn/v/{activeStore.slug}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentView('public-store')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Voir ma boutique publique</span>
            </button>

            <button
              onClick={() => {
                navigator.clipboard?.writeText(`https://boutika.sn/v/${activeStore.slug}`);
                showToast('Lien de la boutique copié ! Prêt à être collé sur vos statuts WhatsApp.');
              }}
              className="p-2 text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl"
              title="Copier le lien pour WhatsApp"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 overflow-x-auto border-t border-stone-100 scrollbar-none">
          {[
            { id: 'overview', label: 'Vue d’ensemble', icon: TrendingUp },
            { id: 'products', label: `Produits (${storeProducts.length})`, icon: Package },
            { id: 'orders', label: `Commandes (${storeOrders.length})`, icon: ShoppingBag },
            { id: 'settings', label: 'Boutique & Livraison', icon: Settings },
            { id: 'subscription', label: 'Abonnement & Facturation', icon: CreditCard },
            { id: 'support', label: 'Assistance', icon: HelpCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as VendorTab)}
                className={`flex items-center gap-2 py-3 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
                  isActive
                    ? 'border-amber-600 text-amber-700 bg-amber-50/40'
                    : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Contents */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Commercial Status & Trial Banner */}
        {activeStore.planId === 'standard' || activeStore.planId === 'decouverte' ? (
          <div className="bg-emerald-50 border border-emerald-200 p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-heading font-black text-sm text-emerald-950">
                    Formule Standard Permanente (0 FCFA / mois)
                  </h4>
                  <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 font-bold text-[10px] rounded-full uppercase tracking-wider">
                    {storeProducts.length} / 50 articles
                  </span>
                </div>
                <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                  Votre boutique bénéficie de la formule Standard gratuite à vie : réception des commandes sur WhatsApp et jusqu'à 50 produits. Pour étendre votre catalogue jusqu'à 150 ou 500 articles et bénéficier du panier complet, passez à Premium ou VIP.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveTab('subscription');
                setIsUpgradeModalOpen(true);
              }}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shrink-0 shadow-xs transition-colors cursor-pointer self-stretch sm:self-auto text-center"
            >
              Passer à Premium
            </button>
          </div>
        ) : trialStatus.isExpired ? (
          <div className="bg-amber-50 border border-amber-200 p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-heading font-black text-sm text-amber-950">
                    Essai gratuit de 3 jours ({activeStore.planId.toUpperCase()}) terminé
                  </h4>
                  <span className="px-2 py-0.5 bg-amber-200/80 text-amber-900 font-bold text-[10px] rounded-full uppercase tracking-wider">
                    Basculé en Forfait Standard
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Votre boutique continue de fonctionner normalement avec les commandes WhatsApp gratuites dans la limite de 50 articles. Activez votre abonnement payant pour conserver les fonctionnalités avancées et un catalogue élargi.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveTab('subscription');
                setIsUpgradeModalOpen(true);
              }}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shrink-0 shadow-xs transition-colors cursor-pointer self-stretch sm:self-auto text-center"
            >
              Activer mon abonnement
            </button>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-heading font-black text-sm text-stone-900">
                    Période d'essai gratuit active ({activeStore.planId.toUpperCase()})
                  </h4>
                  <span className="px-2.5 py-0.5 bg-amber-200/90 text-amber-950 font-bold text-[10px] rounded-full uppercase tracking-wider">
                    {trialStatus.daysRemaining} jour{trialStatus.daysRemaining > 1 ? 's' : ''} restant{trialStatus.daysRemaining > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-xs text-stone-600 mt-1">
                  Profitez de toutes les fonctionnalités avancées de votre formule. Vos articles sont prêts pour les commandes WhatsApp.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('subscription')}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shrink-0 transition-colors cursor-pointer self-stretch sm:self-auto text-center"
            >
              Voir les formules
            </button>
          </div>
        )}
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Chiffre d’affaires
                </span>
                <p className="font-heading font-black text-2xl text-stone-900 mt-1">
                  {formatFCFA(totalRevenue)}
                </p>
                <span className="text-[10px] text-emerald-600 font-bold mt-1 inline-block">
                  Depuis la création
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Commandes totales
                </span>
                <p className="font-heading font-black text-2xl text-stone-900 mt-1">
                  {totalOrdersCount}
                </p>
                <span className="text-[10px] text-amber-700 font-bold mt-1 inline-block">
                  {pendingOrdersCount} à traiter d'urgence
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Articles en ligne
                </span>
                <p className="font-heading font-black text-2xl text-stone-900 mt-1">
                  {storeProducts.length} <span className="text-xs font-normal text-stone-400">/ {currentPlan.maxProducts}</span>
                </p>
                <span className="text-[10px] text-stone-500 font-medium mt-1 inline-block">
                  Quota formule active
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Alerte Stock Faible
                </span>
                <p className={`font-heading font-black text-2xl mt-1 ${lowStockCount > 0 ? 'text-amber-600' : 'text-stone-900'}`}>
                  {lowStockCount}
                </p>
                <span className="text-[10px] text-stone-500 font-medium mt-1 inline-block">
                  Articles ≤ 5 unités
                </span>
              </div>
            </div>

            {/* Quick Action Banner */}
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center md:text-left">
                <h3 className="font-heading font-bold text-lg">
                  Prêt à recevoir plus de commandes aujourd'hui ?
                </h3>
                <p className="text-xs text-amber-100">
                  Partagez le lien de votre boutique dans votre story Instagram ou sur votre statut WhatsApp.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleOpenAddProduct}
                  className="px-4 py-2 bg-stone-950 text-white rounded-xl text-xs font-bold hover:bg-stone-900 transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>Ajouter un article</span>
                </button>
                <button
                  onClick={() => setCurrentView('public-store')}
                  className="px-4 py-2 bg-white text-stone-900 rounded-xl text-xs font-bold hover:bg-stone-100 transition-colors"
                >
                  Tester la commande WhatsApp
                </button>
              </div>
            </div>

            {/* Recent Orders Overview */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-base text-stone-900">
                  Dernières commandes reçues
                </h3>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs font-bold text-amber-700 hover:underline"
                >
                  Voir toutes les commandes ({storeOrders.length})
                </button>
              </div>

              {storeOrders.length === 0 ? (
                <p className="text-xs text-stone-500 py-4 text-center">Aucune commande pour le moment.</p>
              ) : (
                <div className="divide-y divide-stone-100">
                  {storeOrders.slice(0, 3).map((order) => (
                    <div key={order.id} className="py-3 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-stone-900">{order.orderNumber}</span>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            order.status === 'nouvelle' ? 'bg-amber-100 text-amber-900' :
                            order.status === 'en_preparation' ? 'bg-blue-100 text-blue-900' :
                            order.status === 'livree' ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-100 text-stone-700'
                          }`}>
                            {order.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-stone-600">Client : <strong>{order.customerName}</strong> ({order.customerPhone})</p>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-stone-900">{formatFCFA(order.total)}</p>
                        <p className="text-[10px] text-stone-400">{order.deliveryZone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: PRODUCTS */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <div>
                <h2 className="font-heading font-bold text-lg text-stone-900">
                  Catalogue de vos produits
                </h2>
                <p className="text-xs text-stone-500">
                  {storeProducts.length} article(s) enregistrés (Quota formule : {currentPlan.maxProducts} max)
                </p>
              </div>

              <button
                onClick={handleOpenAddProduct}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter un produit</span>
              </button>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider border-b border-stone-200">
                    <tr>
                      <th className="py-3 px-4">Article</th>
                      <th className="py-3 px-4">Catégorie</th>
                      <th className="py-3 px-4">Prix</th>
                      <th className="py-3 px-4">Stock</th>
                      <th className="py-3 px-4">Statut</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-700">
                    {storeProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3 px-4 flex items-center gap-3">
                          <img 
                            src={product.images[0]} 
                            alt={product.name}
                            className="w-12 h-12 rounded-lg object-cover border border-stone-200" 
                          />
                          <div>
                            <p className="font-bold text-stone-900">{product.name}</p>
                            <p className="text-[11px] text-stone-400 line-clamp-1">{product.description}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium">{product.category}</td>
                        <td className="py-3 px-4 font-bold text-stone-900">{formatFCFA(product.price)}</td>
                        <td className="py-3 px-4">
                          <span className={`font-bold ${product.stock <= 5 ? 'text-amber-600' : 'text-stone-700'}`}>
                            {product.stock} unités
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            product.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                          }`}>
                            {product.isActive ? 'En ligne' : 'Désactivé'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          <button
                            onClick={() => handleOpenEditProduct(product)}
                            className="p-1.5 text-stone-600 hover:text-amber-700 hover:bg-stone-100 rounded-lg"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteProduct(product.id)}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
              <div>
                <h2 className="font-heading font-bold text-lg text-stone-900">
                  Commandes reçues ({storeOrders.length})
                </h2>
                <p className="text-xs text-stone-500">
                  Gérez le statut de vos commandes et relancez vos clients directement sur WhatsApp.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {storeOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm text-stone-900">
                        {order.orderNumber}
                      </span>
                      <span className="text-xs text-stone-400">
                        {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    {/* Status Dropdown */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-500 font-medium">Statut :</span>
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                        className={`text-xs font-bold rounded-lg px-2.5 py-1 border outline-none cursor-pointer ${
                          order.status === 'nouvelle' ? 'bg-amber-50 text-amber-900 border-amber-300' :
                          order.status === 'en_preparation' ? 'bg-blue-50 text-blue-900 border-blue-300' :
                          order.status === 'expediee' ? 'bg-indigo-50 text-indigo-900 border-indigo-300' :
                          order.status === 'livree' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' :
                          'bg-stone-100 text-stone-600 border-stone-300'
                        }`}
                      >
                        <option value="nouvelle">Nouvelle commande</option>
                        <option value="en_preparation">En préparation</option>
                        <option value="expediee">Expédiée (En livraison)</option>
                        <option value="livree">Livrée & Réglée</option>
                        <option value="annulee">Annulée</option>
                      </select>
                    </div>
                  </div>

                  {/* Customer details & Items */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                      <p className="font-bold text-stone-900">Informations de livraison :</p>
                      <p className="text-stone-700">Client : <strong>{order.customerName}</strong></p>
                      <p className="text-stone-700">Téléphone : <strong>{order.customerPhone}</strong></p>
                      <p className="text-stone-700">Zone : {order.deliveryZone} ({formatFCFA(order.deliveryFee)})</p>
                      <p className="text-stone-700">Adresse exacte : {order.deliveryAddress}</p>
                      {order.notes && (
                        <p className="text-amber-800 bg-amber-50 p-1.5 rounded text-[11px] font-medium border border-amber-100">
                          Note client : {order.notes}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 bg-stone-50 p-3.5 rounded-xl border border-stone-200 flex flex-col justify-between">
                      <div>
                        <p className="font-bold text-stone-900 mb-1">Articles commandés :</p>
                        {order.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-stone-600">
                            <span>{it.quantity}x {it.productName}</span>
                            <span className="font-semibold">{formatFCFA(it.price * it.quantity)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-stone-200 flex justify-between font-black text-stone-900 text-sm">
                        <span>Total :</span>
                        <span className="text-amber-700">{formatFCFA(order.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for Vendor: Contact Customer on WhatsApp */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100">
                    <span className="text-[11px] text-stone-500">
                      Mode de règlement : <strong>{order.paymentMethod.replace('_', ' ')}</strong> ({order.paymentStatus})
                    </span>

                    <a
                      href={`https://wa.me/${order.customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        `Bonjour ${order.customerName}, ici la boutique ${activeStore.name}. Nous préparons votre commande ${order.orderNumber} d'un montant de ${formatFCFA(order.total)}. Votre livreur partira bientôt !`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Écrire au client sur WhatsApp</span>
                    </a>
                  </div>

                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-6 max-w-3xl">
            <div>
              <h2 className="font-heading font-bold text-xl text-stone-900">
                Paramètres de votre boutique
              </h2>
              <p className="text-xs text-stone-500">
                Personnalisez les coordonnées visibles par vos clients sur votre catalogue en ligne.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Nom de la boutique
                  </label>
                  <input
                    type="text"
                    value={storeForm.name}
                    onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                    className="w-full p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Adresse Web personnalisée (Slug)
                  </label>
                  <div className="flex items-center">
                    <span className="bg-stone-100 border border-r-0 border-stone-300 px-2.5 py-2.5 rounded-l-xl text-stone-500 text-[11px]">
                      boutika.sn/v/
                    </span>
                    <input
                      type="text"
                      value={storeForm.slug}
                      onChange={(e) => setStoreForm({ ...storeForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      className="w-full p-2.5 border border-stone-300 rounded-r-xl outline-none focus:ring-1 focus:ring-amber-500 font-mono font-medium"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Description de votre activité
                </label>
                <textarea
                  rows={3}
                  value={storeForm.description}
                  onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })}
                  className="w-full p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Numéro WhatsApp commercial (+221...)
                  </label>
                  <input
                    type="tel"
                    value={storeForm.whatsappNumber}
                    onChange={(e) => setStoreForm({ ...storeForm, whatsappNumber: e.target.value })}
                    placeholder="221776543210"
                    className="w-full p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Quartier & Ville (Dakar)
                  </label>
                  <input
                    type="text"
                    value={storeForm.address}
                    onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                    placeholder="Médina Rue 14"
                    className="w-full p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold shadow-xs transition-colors"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 5: SUBSCRIPTION */}
        {activeTab === 'subscription' && (
          <div className="space-y-6 max-w-4xl">
            {/* Current Plan Card */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                      Formule active
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 uppercase">
                      {currentPlan.name}
                    </span>
                  </div>
                  <h2 className="font-heading font-black text-2xl text-stone-900 mt-1">
                    {currentPlan.priceMonthly === 0 ? 'Gratuit (0 FCFA)' : `${formatFCFA(currentPlan.priceMonthly)} / mois`}
                  </h2>
                  <p className="text-xs text-stone-500">
                    Limite actuelle : <strong>{currentPlan.maxProducts} produits max</strong> • {storeProducts.length} actuellement en ligne
                  </p>
                </div>

                <button
                  onClick={() => setIsUpgradeModalOpen(true)}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Changer de formule d'abonnement
                </button>
              </div>

              {/* 3-Tier Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
                {plans.map((p) => {
                  const isCurrent = p.id === activeStore.planId;
                  return (
                    <div
                      key={p.id}
                      className={`rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                        isCurrent
                          ? 'border-amber-600 bg-amber-50/50 shadow-xs'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-heading font-black text-sm text-stone-900">{p.name}</h4>
                          {isCurrent && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-600 text-white">
                              Actif
                            </span>
                          )}
                        </div>
                        <p className="font-black text-base text-stone-900">
                          {p.priceMonthly === 0 ? '0 FCFA' : `${formatFCFA(p.priceMonthly)}`}
                          <span className="text-xs font-normal text-stone-400">/mois</span>
                        </p>
                        <ul className="text-[11px] text-stone-600 space-y-1.5 pt-1">
                          <li className="flex items-center gap-1.5 font-bold text-stone-900">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Jusqu'à {p.maxProducts} produits</span>
                          </li>
                          {p.id === 'standard' && (
                            <>
                              <li className="flex items-center gap-1.5 text-stone-600">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Commandes WhatsApp directes</span>
                              </li>
                              <li className="flex items-center gap-1.5 text-stone-600">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Partage de lien catalogue</span>
                              </li>
                            </>
                          )}
                          {p.id === 'premium' && (
                            <>
                              <li className="flex items-center gap-1.5 text-stone-600">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Checkout multi-étapes</span>
                              </li>
                              <li className="flex items-center gap-1.5 text-stone-600">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Boutons de partage réseaux sociaux</span>
                              </li>
                              <li className="flex items-center gap-1.5 text-stone-600">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Analytics de conversion</span>
                              </li>
                            </>
                          )}
                          {p.id === 'vip' && (
                            <>
                              <li className="flex items-center gap-1.5 text-amber-900 font-semibold">
                                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                <span>Assistante IA Queency intégrée</span>
                              </li>
                              <li className="flex items-center gap-1.5 text-amber-900 font-semibold">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Analyse photo & descriptions auto</span>
                              </li>
                              <li className="flex items-center gap-1.5 text-amber-900 font-semibold">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Support prioritaire VIP 24/7</span>
                              </li>
                            </>
                          )}
                        </ul>
                      </div>

                      <div className="pt-4">
                        {isCurrent ? (
                          <div className="text-center py-2 text-[11px] font-bold text-amber-800 bg-amber-100/70 rounded-xl">
                            Votre formule courante
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedPlanForUpgrade(p.id as PlanTierId);
                              setIsUpgradeModalOpen(true);
                            }}
                            className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            Passer à {p.name}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Architecture / Security Note on Payments */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Règle d'intégration des paiements (Wave & Orange Money) :</span>
              </div>
              <p className="text-amber-800 leading-relaxed">
                Conformément aux exigences d'architecture sécurisée, l'activation des fonctionnalités d'abonnement payantes repose sur une confirmation webhook signée (HMAC SHA-256) côté serveur avec vérification d'idempotence. Aucune validation purement côté client n'est acceptée en production.
              </p>
            </div>

            {/* Payment history */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-4">
              <h3 className="font-heading font-bold text-base text-stone-900">
                Historique des paiements de souscription
              </h3>

              <div className="divide-y divide-stone-100 text-xs">
                {subscriptionRecords.map((rec) => (
                  <div key={rec.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-stone-900">{rec.planName}</p>
                      <p className="text-stone-400 text-[11px]">
                        Passerelle : {rec.paymentGateway} • Réf: {rec.transactionRef || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-stone-900">{formatFCFA(rec.amount)}</p>
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold text-[10px]">
                        {rec.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SUPPORT */}
        {activeTab === 'support' && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-6 max-w-2xl">
            <div>
              <h2 className="font-heading font-bold text-xl text-stone-900">
                Assistance & Support Vendeur
              </h2>
              <p className="text-xs text-stone-500">
                Une question sur la gestion de votre boutique ou un problème technique ? Écrivez directement à l'équipe d'astreinte Boutika.
              </p>
            </div>

            <form onSubmit={handleSendSupport} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Sujet de votre demande
                </label>
                <select
                  value={supportSubject}
                  onChange={(e) => setSupportSubject(e.target.value)}
                  className="w-full p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                >
                  <option value="Question technique">Question technique ou bug d'affichage</option>
                  <option value="Aide ajout de produits">Aide pour le catalogue ou photos</option>
                  <option value="Paiements & Abonnements">Paiements Wave / Orange Money</option>
                  <option value="Partenariat logistique">Partenariat livreurs Dakar</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Détaillez votre message
                </label>
                <textarea
                  rows={4}
                  required
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  placeholder="Décrivez précisément ce qui se passe..."
                  className="w-full p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-xs transition-colors"
              >
                Envoyer ma demande au support
              </button>
            </form>
          </div>
        )}

      </div>

      {/* Product Add / Edit Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-stone-200 my-8">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div>
                <h3 className="font-heading font-bold text-base text-stone-900">
                  {editingProductId ? 'Modifier le produit' : 'Ajouter un nouvel article'}
                </h3>
                <p className="text-[11px] text-stone-500">
                  Fiche produit détaillée avec gestion des déclinaisons et tailles.
                </p>
              </div>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              
              {/* VIP AI Assistant Banner */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-300/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-stone-900">Assistant VIP Boutika</span>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-500 text-slate-950">
                        VIP
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Génère le descriptif commercial et suggère tailles & prix.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isAiGenerating}
                  onClick={handleTriggerAiAssistance}
                  className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-400 text-white font-bold rounded-xl text-[11px] flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  {isAiGenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyse en cours...</span>
                    </>
                  ) : (
                    <>
                      <Bot className="w-3.5 h-3.5 text-amber-400" />
                      <span>Générer par IA</span>
                    </>
                  )}
                </button>
              </div>

              {aiFeedback && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{aiFeedback}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Nom de l'article *
                </label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="ex: Boubou Wax Brodé Teranga"
                  className="w-full p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Prix de vente (FCFA) *
                  </label>
                  <input
                    type="number"
                    required
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                    className="w-full p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Prix barré promo (Optionnel)
                  </label>
                  <input
                    type="number"
                    value={productForm.compareAtPrice}
                    onChange={(e) => setProductForm({ ...productForm, compareAtPrice: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Catégorie
                  </label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                  >
                    {activeStore.categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Quantité en Stock Total *
                  </label>
                  <input
                    type="number"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })}
                    className="w-full p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* SKU & Variants details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Référence SKU
                  </label>
                  <input
                    type="text"
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    placeholder="ex: TER-WAX-01"
                    className="w-full p-2 border border-stone-300 rounded-xl outline-none focus:ring-1 focus:ring-amber-500 bg-white font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Tailles (séparées par virgule)
                  </label>
                  <input
                    type="text"
                    value={productForm.sizes}
                    onChange={(e) => setProductForm({ ...productForm, sizes: e.target.value })}
                    placeholder="S, M, L, XL"
                    className="w-full p-2 border border-stone-300 rounded-xl outline-none focus:ring-1 focus:ring-amber-500 bg-white text-[11px]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Couleurs (séparées par virgule)
                  </label>
                  <input
                    type="text"
                    value={productForm.colors}
                    onChange={(e) => setProductForm({ ...productForm, colors: e.target.value })}
                    placeholder="Bleu, Ocre, Blanc"
                    className="w-full p-2 border border-stone-300 rounded-xl outline-none focus:ring-1 focus:ring-amber-500 bg-white text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Description de l'article
                </label>
                <textarea
                  rows={3}
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Décrivez les tailles disponibles, la matière, l'origine de confection..."
                  className="w-full p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                  URL de la photo principale
                </label>
                <input
                  type="text"
                  value={productForm.images[0] || ''}
                  onChange={(e) => setProductForm({ ...productForm, images: [e.target.value] })}
                  className="w-full p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-1 focus:ring-amber-500 font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.isActive}
                    onChange={(e) => setProductForm({ ...productForm, isActive: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <span className="font-bold text-stone-800">Article visible sur la boutique publique</span>
                </label>
              </div>

              {trialStatus.isExpired && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-[11px] font-medium">
                  ⚠️ Période d'essai expirée. L'enregistrement est désactivé jusqu'à l'activation d'une formule.
                </div>
              )}

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="w-1/2 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={trialStatus.isExpired}
                  className="w-1/2 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 text-white rounded-xl font-bold shadow-xs cursor-pointer transition-colors"
                >
                  {editingProductId ? 'Mettre à jour' : 'Enregistrer le produit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subscription Upgrade Modal (Simulation) */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-200">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <h3 className="font-heading font-bold text-base text-stone-900">
                Souscription & Changement de formule
              </h3>
              <button
                onClick={() => setIsUpgradeModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 uppercase tracking-wider mb-2">
                  Choisissez la nouvelle formule :
                </label>
                <div className="space-y-2">
                  {plans.map((p) => (
                    <label
                      key={p.id}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedPlanForUpgrade === p.id
                          ? 'border-amber-600 bg-amber-50/60 font-bold'
                          : 'border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="upgradePlan"
                          checked={selectedPlanForUpgrade === p.id}
                          onChange={() => setSelectedPlanForUpgrade(p.id)}
                          className="w-4 h-4 text-amber-600"
                        />
                        <div>
                          <p className="text-stone-900">{p.name}</p>
                          <p className="text-[11px] text-stone-500 font-normal">{p.maxProducts} produits max</p>
                        </div>
                      </div>
                      <span className="text-amber-700">{formatFCFA(p.priceMonthly)}/mois</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 uppercase tracking-wider mb-2">
                  Mode de règlement envisagé :
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Wave', 'Orange Money', 'Carte Bancaire'] as const).map((gateway) => (
                    <button
                      key={gateway}
                      type="button"
                      onClick={() => setSelectedPaymentGateway(gateway)}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all ${
                        selectedPaymentGateway === gateway
                          ? 'border-amber-600 bg-amber-50 text-amber-900 shadow-xs'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      {gateway}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-stone-100 rounded-xl text-[11px] text-stone-600 space-y-1">
                <p className="font-bold text-stone-800">Processus de vérification serveur :</p>
                <p>1. Création de la transaction avec clé d'idempotence unique.</p>
                <p>2. Validation via Webhook sécurisé signé.</p>
                <p>3. Mise à jour instantanée des quotas de votre boutique.</p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => setIsUpgradeModalOpen(false)}
                  className="w-1/2 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold"
                >
                  Annuler
                </button>
                <button
                  disabled={isUpgrading}
                  onClick={handlePerformUpgrade}
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-colors"
                >
                  {isUpgrading ? 'Vérification...' : 'Confirmer le paiement'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
