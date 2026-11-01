import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, Store, ProductVariant } from '../../types';
import { ProductDetailModal } from '../../components/common/ProductDetailModal';
import { 
  Search, 
  Store as StoreIcon, 
  ShoppingBag, 
  Filter, 
  Sparkles, 
  MapPin, 
  Star, 
  ArrowRight, 
  CheckCircle2, 
  ExternalLink,
  ChevronRight,
  SlidersHorizontal,
  X,
  BadgeCheck,
  Crown
} from 'lucide-react';

export const MarketplacePage: React.FC = () => {
  const { 
    stores, 
    products, 
    setActiveStoreId, 
    setSelectedStoreSlug, 
    setCurrentView,
    formatFCFA,
    addToCart,
    showToast 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [priceMax, setPriceMax] = useState<number>(50000);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'stores'>('products');

  // Product modal sheet state
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [modalStore, setModalStore] = useState<Store | null>(null);

  // Available categories
  const categories = [
    'Tous',
    'Mode & Wax',
    'Beauté & Senteurs',
    'Alimentation & Épicerie',
    'High-Tech & Électronique',
    'Artisanat & Bijoux'
  ];

  // Cities
  const cities = ['Toutes les villes', 'Dakar', 'Thiès', 'Saint-Louis', 'Mbour'];

  // Only active (non-suspended) stores
  const activeStores = stores.filter((s) => s.status === 'active');

  // Top 5 Founding Stores
  const foundingStores = [...activeStores]
    .filter((s) => s.isFoundingStore)
    .sort((a, b) => (a.foundingOrder || 99) - (b.foundingOrder || 99))
    .slice(0, 5);

  // VIP Promoted Stores (Boutiques VIP à l'Affiche)
  const vipPromotedStores = [...activeStores]
    .filter((s) => s.planId === 'vip' && s.isVipPromoted)
    .sort((a, b) => (a.vipPromotionOrder || 99) - (b.vipPromotionOrder || 99));

  // Filtered Stores
  const filteredStores = activeStores.filter((store) => {
    const matchesSearch = 
      store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = selectedCity === 'all' || selectedCity === 'Toutes les villes' || store.city.toLowerCase() === selectedCity.toLowerCase();
    const matchesCategory = selectedCategory === 'all' || selectedCategory === 'Tous' || store.categories.some((c) => c.toLowerCase().includes(selectedCategory.toLowerCase()));
    return matchesSearch && matchesCity && matchesCategory;
  });

  // Filtered Products
  const filteredProducts = products.filter((product) => {
    if (!product.isActive) return false;
    const parentStore = activeStores.find((s) => s.id === product.storeId);
    if (!parentStore) return false; // Hide products of suspended/hidden stores

    const matchesSearch = 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      parentStore.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = 
      selectedCategory === 'all' || 
      selectedCategory === 'Tous' || 
      product.category.toLowerCase().includes(selectedCategory.toLowerCase());

    const matchesCity = 
      selectedCity === 'all' || 
      selectedCity === 'Toutes les villes' || 
      parentStore.city.toLowerCase() === selectedCity.toLowerCase();

    const matchesPrice = product.price <= priceMax;
    const matchesStock = !inStockOnly || product.stock > 0;

    return matchesSearch && matchesCategory && matchesCity && matchesPrice && matchesStock;
  });

  const handleOpenStore = (store: Store) => {
    setActiveStoreId(store.id);
    setSelectedStoreSlug(store.slug);
    setCurrentView('public-store');
  };

  const handleOpenProductModal = (product: Product) => {
    const store = activeStores.find((s) => s.id === product.storeId) || activeStores[0];
    setModalStore(store);
    setModalProduct(product);
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-28">
      
      {/* Hero Header */}
      <div className="bg-gradient-to-b from-amber-600 via-orange-600 to-amber-700 text-white pt-10 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-amber-100 text-xs font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>Marketplace officielle des commerçants du Sénégal</span>
          </div>

          <h1 className="font-heading font-black text-3xl sm:text-5xl tracking-tight text-white max-w-3xl mx-auto leading-tight">
            Découvrez les meilleures boutiques et produits locaux en direct.
          </h1>

          <p className="text-amber-100 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Commandez auprès d’artisans, créateurs et commerçants certifiés. Livraison rapide à Dakar et dans toutes les régions.
          </p>

          {/* Big Search Bar */}
          <div className="max-w-2xl mx-auto pt-4">
            <div className="relative bg-white rounded-2xl shadow-xl p-1.5 flex items-center border border-amber-300/40">
              <Search className="w-5 h-5 text-stone-400 ml-3 shrink-0" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un produit (wax, boubou, thiouraye, écouteurs...) ou une boutique..."
                className="w-full px-3 py-2.5 text-xs sm:text-sm text-stone-900 bg-transparent outline-none placeholder:text-stone-400"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-stone-400 hover:text-stone-700 mr-2 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button 
                onClick={() => {}}
                className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold text-xs shrink-0 transition-colors shadow-sm cursor-pointer"
              >
                Rechercher
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 space-y-10">
        
        {/* Pinned Section: Top 5 Founding Stores (Boutiques Fondatrices) */}
        {foundingStores.length > 0 && !searchQuery && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-200 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
                  <Star className="w-5 h-5 fill-amber-500 text-amber-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-heading font-black text-lg sm:text-xl text-stone-900">
                      Boutiques Fondatrices à l'Honneur
                    </h2>
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                      Top 5
                    </span>
                  </div>
                  <p className="text-xs text-stone-500">
                    Les 5 boutiques pionnières certifiées bénéficiant d’une promotion exclusive en première ligne.
                  </p>
                </div>
              </div>

              <span className="text-xs text-stone-400 font-medium self-end sm:self-center">
                Mise en avant officielle
              </span>
            </div>

            {/* Founding Stores Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {foundingStores.map((store, index) => (
                <div
                  key={store.id}
                  onClick={() => handleOpenStore(store)}
                  className="bg-stone-50 hover:bg-amber-50/60 rounded-2xl p-4 border border-stone-200/80 hover:border-amber-300 transition-all cursor-pointer group flex flex-col justify-between space-y-3 shadow-xs hover:shadow-md"
                >
                  <div className="space-y-2.5">
                    <div className="relative">
                      <img 
                        src={store.logoUrl} 
                        alt={store.name} 
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md mx-auto group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute -top-1 -right-1 bg-amber-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                        #{store.foundingOrder || index + 1}
                      </span>
                    </div>

                    <div className="text-center space-y-1">
                      <h4 className="font-bold text-xs text-stone-900 line-clamp-1 group-hover:text-amber-700 transition-colors">
                        {store.name}
                      </h4>
                      <p className="text-[11px] text-stone-500 flex items-center justify-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>{store.city}</span>
                      </p>
                    </div>

                    <p className="text-[11px] text-stone-600 line-clamp-2 text-center leading-relaxed">
                      {store.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-stone-200/60 flex items-center justify-center gap-1 text-[11px] font-bold text-amber-700 group-hover:translate-x-0.5 transition-transform">
                    <span>Visiter</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIP Promoted Stores Section */}
        {vipPromotedStores.length > 0 && !searchQuery && (
          <div className="bg-gradient-to-r from-amber-950 via-stone-900 to-amber-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-amber-500/30 space-y-5 relative overflow-hidden">
            {/* Background luxury glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 text-stone-950 flex items-center justify-center shadow-lg font-black">
                  <Crown className="w-5 h-5 fill-stone-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-heading font-black text-lg sm:text-xl text-white">
                      Boutiques VIP à l'Affiche
                    </h2>
                    <span className="bg-amber-400 text-stone-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                      Sélection VIP
                    </span>
                  </div>
                  <p className="text-xs text-amber-200/80">
                    Grandes enseignes et commerçants d'exception certifiés bénéficiant de la vitrine VIP officielle.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold self-start sm:self-center">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Service d'excellence garanti</span>
              </div>
            </div>

            {/* VIP Stores Grid */}
            <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {vipPromotedStores.map((store) => (
                <div
                  key={store.id}
                  onClick={() => handleOpenStore(store)}
                  className="bg-stone-900/90 hover:bg-stone-850 rounded-2xl p-5 border border-amber-500/20 hover:border-amber-400/60 transition-all cursor-pointer group flex flex-col justify-between space-y-4 shadow-lg hover:shadow-amber-500/10"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img 
                          src={store.logoUrl} 
                          alt={store.name} 
                          className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-400/80 shadow-md group-hover:scale-105 transition-transform"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                              {store.name}
                            </h4>
                            <BadgeCheck className="w-4 h-4 text-amber-400 shrink-0" />
                          </div>
                          <p className="text-[11px] text-amber-200/70 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>{store.city}</span>
                          </p>
                        </div>
                      </div>
                      <span className="bg-amber-400/20 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-md border border-amber-400/30">
                        VIP
                      </span>
                    </div>

                    <p className="text-xs text-stone-300 line-clamp-2 leading-relaxed">
                      {store.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {store.categories.slice(0, 2).map((cat) => (
                        <span key={cat} className="px-2 py-0.5 rounded-md bg-stone-800 text-amber-200 text-[10px] font-medium border border-amber-500/10">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-stone-800 flex items-center justify-between text-xs font-bold text-amber-400 group-hover:text-amber-300">
                    <span className="flex items-center gap-1">
                      Découvrir la collection
                    </span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Discovery Filter & View Switcher */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-stone-200 space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* View Switcher: Products vs Stores */}
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl self-start">
              <button
                onClick={() => setActiveTab('products')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'products'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Articles ({filteredProducts.length})
              </button>
              <button
                onClick={() => setActiveTab('stores')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'stores'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Boutiques ({filteredStores.length})
              </button>
            </div>

            {/* City Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-500">Ville :</span>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-medium text-stone-800 outline-none focus:ring-2 focus:ring-amber-500"
              >
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Categories Horizontal Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase() || (cat === 'Tous' && selectedCategory === 'all');
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat === 'Tous' ? 'all' : cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Extra Filters (In stock, price slider) */}
          <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="font-semibold text-stone-700">En stock uniquement</span>
              </label>

              <div className="flex items-center gap-2">
                <span>Prix max : <strong>{formatFCFA(priceMax)}</strong></span>
                <input 
                  type="range"
                  min={5000}
                  max={50000}
                  step={2500}
                  value={priceMax}
                  onChange={(e) => setPriceMax(Number(e.target.value))}
                  className="w-24 accent-amber-600"
                />
              </div>
            </div>

            {(searchQuery || selectedCategory !== 'all' || selectedCity !== 'all' || inStockOnly || priceMax < 50000) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedCity('all');
                  setInStockOnly(false);
                  setPriceMax(50000);
                }}
                className="text-amber-700 hover:underline font-semibold cursor-pointer"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>

        </div>

        {/* TAB 1: Products Grid */}
        {activeTab === 'products' && (
          <div>
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-3">
                <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto" />
                <h3 className="font-bold text-base text-stone-800">Aucun produit ne correspond à vos critères</h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Modifiez votre recherche ou réinitialisez les filtres pour découvrir l'ensemble des catalogues disponibles.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {filteredProducts.map((product) => {
                  const store = activeStores.find((s) => s.id === product.storeId);
                  const discountPercentage = product.compareAtPrice && product.compareAtPrice > product.price
                    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
                    : 0;

                  return (
                    <div
                      key={product.id}
                      onClick={() => handleOpenProductModal(product)}
                      className="bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between group cursor-pointer"
                    >
                      <div>
                        {/* Image Frame */}
                        <div className="relative aspect-square overflow-hidden bg-stone-100">
                          <img 
                            src={product.images[0] || 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=400&q=80'} 
                            alt={product.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />

                          {discountPercentage > 0 && (
                            <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow">
                              -{discountPercentage}%
                            </span>
                          )}

                          {product.stock <= 5 && product.stock > 0 && (
                            <span className="absolute bottom-2 left-2 bg-amber-500 text-stone-950 text-[10px] font-bold px-2 py-0.5 rounded shadow">
                              {product.stock} restants
                            </span>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-3.5 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] text-stone-400">
                            <span className="uppercase font-semibold tracking-wider truncate max-w-[120px]">
                              {product.category}
                            </span>
                            {store && (
                              <span className="text-stone-500 font-medium truncate max-w-[100px]">
                                {store.city}
                              </span>
                            )}
                          </div>

                          <h3 className="font-bold text-xs sm:text-sm text-stone-900 line-clamp-1 group-hover:text-amber-700 transition-colors">
                            {product.name}
                          </h3>

                          {store && (
                            <p className="text-[11px] text-stone-500 truncate flex items-center gap-1">
                              <StoreIcon className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>{store.name}</span>
                            </p>
                          )}

                          <div className="flex items-baseline gap-2 pt-1">
                            <span className="font-heading font-black text-sm sm:text-base text-amber-700">
                              {formatFCFA(product.price)}
                            </span>
                            {product.compareAtPrice && product.compareAtPrice > product.price && (
                              <span className="text-[11px] text-stone-400 line-through">
                                {formatFCFA(product.compareAtPrice)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: View Details */}
                      <div className="p-3.5 pt-0">
                        <button
                          type="button"
                          className="w-full py-2 bg-stone-100 group-hover:bg-amber-600 group-hover:text-white text-stone-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>Voir la fiche</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Stores Grid */}
        {activeTab === 'stores' && (
          <div>
            {filteredStores.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-3">
                <StoreIcon className="w-12 h-12 text-stone-300 mx-auto" />
                <h3 className="font-bold text-base text-stone-800">Aucune boutique trouvée</h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Essayez avec une autre ville ou catégorie d'activité.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStores.map((store) => (
                  <div
                    key={store.id}
                    onClick={() => handleOpenStore(store)}
                    className="bg-white rounded-3xl overflow-hidden border border-stone-200 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      {/* Banner */}
                      <div className="h-32 w-full overflow-hidden bg-stone-800 relative">
                        <img 
                          src={store.bannerUrl} 
                          alt={store.name} 
                          className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-300" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        {store.isFoundingStore && (
                          <span className="absolute top-3 left-3 bg-amber-500 text-stone-950 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow">
                            Fondatrice #{store.foundingOrder}
                          </span>
                        )}
                      </div>

                      {/* Profile info */}
                      <div className="p-5 pt-0 relative">
                        <img 
                          src={store.logoUrl} 
                          alt={store.name} 
                          className="w-16 h-16 rounded-2xl object-cover border-4 border-white shadow-md -mt-8 bg-white" 
                        />

                        <div className="mt-3 space-y-1.5">
                          <h3 className="font-heading font-black text-lg text-stone-900 group-hover:text-amber-700 transition-colors">
                            {store.name}
                          </h3>
                          <p className="text-xs text-stone-500 flex items-center gap-1 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>{store.city} • {store.address}</span>
                          </p>
                          <p className="text-xs text-stone-600 line-clamp-2 pt-1 leading-relaxed">
                            {store.description}
                          </p>
                        </div>

                        {/* Category Tags */}
                        <div className="flex flex-wrap gap-1.5 pt-3">
                          {store.categories.slice(0, 3).map((cat) => (
                            <span key={cat} className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[10px] font-semibold">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-5 pt-0">
                      <button className="w-full py-2.5 bg-stone-900 group-hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                        <span>Explorer le catalogue</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Global Product Detail Sheet/Modal */}
      {modalProduct && modalStore && (
        <ProductDetailModal
          product={modalProduct}
          store={modalStore}
          onClose={() => {
            setModalProduct(null);
            setModalStore(null);
          }}
          onAddToCart={(prod, qty, variant, size, color) => {
            addToCart(prod, qty);
          }}
        />
      )}

    </div>
  );
};
