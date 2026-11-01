import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, Store, DeliveryZone, PaymentMethod } from '../../types';
import { ProductDetailModal } from '../../components/common/ProductDetailModal';
import { 
  ShoppingBag, 
  MessageSquare, 
  Phone, 
  MapPin, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  X, 
  Share2, 
  Check, 
  ArrowLeft,
  Truck,
  Sparkles,
  Info,
  Clock,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  CreditCard
} from 'lucide-react';

export const PublicStorePage: React.FC = () => {
  const { 
    activeStore, 
    storeProducts, 
    cart, 
    addToCart, 
    removeFromCart, 
    updateCartQuantity, 
    clearCart,
    cartTotal, 
    cartCount,
    formatFCFA,
    createOrder,
    setCurrentView,
    showToast
  } = useApp();

  // Storefront UI state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Checkout form state inside cart
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+221 ');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('wave');
  const [selectedZoneId, setSelectedZoneId] = useState<string>(
    activeStore.deliveryZones[0]?.id || ''
  );
  const [customerNotes, setCustomerNotes] = useState('');
  const [orderConfirmedNumber, setOrderConfirmedNumber] = useState<string | null>(null);

  const selectedZone = activeStore.deliveryZones.find((z) => z.id === selectedZoneId) || activeStore.deliveryZones[0] || {
    id: 'default',
    name: 'Livraison standard',
    price: 1500,
    estimatedTime: '24h'
  };

  const deliveryPrice = cart.length > 0 ? selectedZone.price : 0;
  const grandTotal = cartTotal + deliveryPrice;

  // Plan capabilities check
  const isStandardPlan = activeStore.planId === 'standard' || activeStore.planId === 'decouverte';
  const allowsSocialShareButtons = !isStandardPlan; // Premium & VIP only

  // Filtered products
  const filteredProducts = storeProducts.filter((product) => {
    if (!product.isActive) return false;
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCopyLink = () => {
    const storeUrl = `https://boutika.sn/v/${activeStore.slug}`;
    navigator.clipboard?.writeText(storeUrl);
    setCopiedLink(true);
    showToast('Lien de la boutique copié dans le presse-papier !');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSocialShare = (network: 'whatsapp' | 'facebook' | 'twitter') => {
    const storeUrl = encodeURIComponent(`https://boutika.sn/v/${activeStore.slug}`);
    const text = encodeURIComponent(`Découvrez la boutique officielle ${activeStore.name} sur Boutika :`);
    
    let url = '';
    if (network === 'whatsapp') {
      url = `https://wa.me/?text=${text}%20${storeUrl}`;
    } else if (network === 'facebook') {
      url = `https://www.facebook.com/sharer/sharer.php?u=${storeUrl}`;
    } else if (network === 'twitter') {
      url = `https://twitter.com/intent/tweet?text=${text}&url=${storeUrl}`;
    }

    if (url) window.open(url, '_blank');
  };

  // Generate WhatsApp Order Message
  const generateWhatsAppMessage = () => {
    const paymentLabel = 
      selectedPaymentMethod === 'wave' ? 'Wave Mobile Money' :
      selectedPaymentMethod === 'orange_money' ? 'Orange Money' : 'Espèces à la livraison';

    const lines = [
      `👋 Bonjour *${activeStore.name}* !`,
      `Je souhaite passer une commande sur votre boutique Boutika :`,
      '',
      `📦 *ARTICLES COMMANDÉS :*`
    ];

    cart.forEach((item) => {
      let desc = `• ${item.quantity}x ${item.product.name}`;
      if (item.selectedSize) desc += ` (Taille: ${item.selectedSize})`;
      if (item.selectedColor) desc += ` (Couleur: ${item.selectedColor})`;
      desc += ` — ${formatFCFA(item.product.price * item.quantity)}`;
      lines.push(desc);
    });

    lines.push('');
    lines.push(`💰 Sous-total : ${formatFCFA(cartTotal)}`);
    lines.push(`🚚 Livraison : ${selectedZone.name} (${formatFCFA(deliveryPrice)})`);
    lines.push(`👉 *TOTAL À RÉGLER : ${formatFCFA(grandTotal)}*`);
    lines.push(`💳 Mode de règlement prévu : *${paymentLabel}*`);
    lines.push('');
    lines.push(`👤 *COORDONNÉES CLIENT :*`);
    lines.push(`• Nom : ${customerName || 'Non précisé'}`);
    lines.push(`• Téléphone : ${customerPhone}`);
    lines.push(`• Adresse/Quartier : ${customerAddress || 'Dakar'}`);
    if (customerNotes) {
      lines.push(`• Note : ${customerNotes}`);
    }
    lines.push('');
    lines.push(`Merci de me confirmer la disponibilité et le créneau de livraison !`);

    return encodeURIComponent(lines.join('\n'));
  };

  const handleWhatsAppCheckout = () => {
    if (cart.length === 0) return;

    if (!customerPhone || customerPhone.trim() === '+221') {
      showToast('Veuillez renseigner votre numéro de téléphone pour la commande.');
      return;
    }

    const encodedMsg = generateWhatsAppMessage();
    const cleanPhone = activeStore.whatsappNumber.replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;

    // Also register order in system for vendor tracking
    const newOrd = createOrder({
      storeId: activeStore.id,
      customerName: customerName || 'Client WhatsApp',
      customerPhone: customerPhone,
      customerEmail: customerEmail || undefined,
      customerCity: activeStore.city,
      deliveryAddress: customerAddress || 'Précisé via WhatsApp',
      deliveryZone: selectedZone.name,
      deliveryFee: deliveryPrice,
      items: cart.map((i) => ({
        productId: i.product.id,
        productName: i.product.name,
        price: i.product.price,
        quantity: i.quantity,
        image: i.product.images[0],
        variantId: i.variantId,
        selectedSize: i.selectedSize,
        selectedColor: i.selectedColor
      })),
      subtotal: cartTotal,
      total: grandTotal,
      status: 'nouvelle',
      paymentMethod: selectedPaymentMethod,
      paymentStatus: 'en_attente',
      notes: customerNotes ? `WhatsApp: ${customerNotes}` : 'Commande initiée via WhatsApp'
    });

    setOrderConfirmedNumber(newOrd.orderNumber);
    clearCart();

    // Open WhatsApp
    window.open(waUrl, '_blank');
  };

  const handleDirectCheckout = () => {
    if (cart.length === 0) return;
    if (!customerName || !customerPhone || !customerAddress) {
      showToast('Veuillez renseigner votre nom, téléphone et adresse.');
      return;
    }

    const newOrd = createOrder({
      storeId: activeStore.id,
      customerName,
      customerPhone,
      customerEmail: customerEmail || undefined,
      customerCity: activeStore.city,
      deliveryAddress: customerAddress,
      deliveryZone: selectedZone.name,
      deliveryFee: deliveryPrice,
      items: cart.map((i) => ({
        productId: i.product.id,
        productName: i.product.name,
        price: i.product.price,
        quantity: i.quantity,
        image: i.product.images[0],
        variantId: i.variantId,
        selectedSize: i.selectedSize,
        selectedColor: i.selectedColor
      })),
      subtotal: cartTotal,
      total: grandTotal,
      status: 'nouvelle',
      paymentMethod: selectedPaymentMethod,
      paymentStatus: 'en_attente',
      notes: customerNotes
    });

    setOrderConfirmedNumber(newOrd.orderNumber);
    clearCart();
    showToast(`Commande ${newOrd.orderNumber} enregistrée avec succès !`);
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-28">
      
      {/* Top Store Notice / Navigation */}
      <div className="bg-amber-950 text-amber-100 text-xs py-2 px-4 flex items-center justify-between border-b border-amber-900">
        <button
          onClick={() => setCurrentView('home')}
          className="flex items-center gap-1.5 hover:text-white transition-colors font-medium cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Retour à l'accueil</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView('marketplace')}
            className="hidden sm:inline text-amber-200 hover:text-white transition-colors text-[11px] font-medium mr-2 cursor-pointer"
          >
            Explorer la Marketplace
          </button>

          {/* Social share buttons: ONLY for Premium & VIP */}
          {allowsSocialShareButtons && (
            <div className="hidden sm:flex items-center gap-1.5 mr-2 pr-2 border-r border-amber-800">
              <button 
                onClick={() => handleSocialShare('whatsapp')}
                className="px-2 py-0.5 rounded bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-[10px] cursor-pointer"
                title="Partager sur statut WhatsApp"
              >
                WhatsApp
              </button>
              <button 
                onClick={() => handleSocialShare('facebook')}
                className="px-2 py-0.5 rounded bg-blue-900 hover:bg-blue-800 text-white font-semibold text-[10px] cursor-pointer"
                title="Partager sur Facebook"
              >
                Facebook
              </button>
            </div>
          )}

          {/* Manual Copy link: Available for all tiers */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-800/80 hover:bg-amber-700 text-white font-medium text-[11px] cursor-pointer"
            title="Copier le lien de la boutique"
          >
            {copiedLink ? <Check className="w-3 h-3 text-emerald-300" /> : <Share2 className="w-3 h-3" />}
            <span>{copiedLink ? 'Lien copié' : 'Copier le lien'}</span>
          </button>
        </div>
      </div>

      {/* Store Banner & Brand Header */}
      <div className="relative">
        <div className="h-44 sm:h-60 w-full overflow-hidden bg-stone-800 relative">
          <img 
            src={activeStore.bannerUrl} 
            alt={activeStore.name} 
            className="w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative -mt-16 sm:-mt-20">
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xl border border-stone-200 flex flex-col sm:flex-row items-center sm:items-start gap-5">
            
            <img 
              src={activeStore.logoUrl} 
              alt={activeStore.name} 
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-white shadow-md shrink-0 -mt-10 sm:-mt-12 bg-white"
            />

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h1 className="font-heading font-black text-2xl sm:text-3xl text-stone-900 leading-tight">
                      {activeStore.name}
                    </h1>
                    {activeStore.isFoundingStore && (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                        Fondatrice #{activeStore.foundingOrder}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-xs text-stone-500">
                    <span className="flex items-center gap-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-amber-600" />
                      {activeStore.city} • {activeStore.address}
                    </span>
                    <span>•</span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold text-[11px] flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Boutique vérifiée Boutika
                    </span>
                  </div>
                </div>

                {/* WhatsApp Direct Action */}
                <a
                  href={`https://wa.me/${activeStore.whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all self-center sm:self-start"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Discuter sur WhatsApp</span>
                </a>
              </div>

              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-2xl">
                {activeStore.description}
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* Catalog & Search Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        
        {/* Search & Categories Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Categories Horizontal Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              Tous ({storeProducts.length})
            </button>
            {activeStore.categories.map((cat) => {
              const count = storeProducts.filter((p) => p.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-stone-900 text-white shadow-sm'
                      : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un article..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-stone-200 rounded-full focus:ring-2 focus:ring-amber-500 outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 space-y-3">
            <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto" />
            <h3 className="font-bold text-base text-stone-700">Aucun produit trouvé</h3>
            <p className="text-xs text-stone-500 max-w-xs mx-auto">
              Essayez de changer de catégorie ou de réinitialiser votre recherche.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-lg cursor-pointer"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {filteredProducts.map((product) => {
              const discountPercentage = product.compareAtPrice && product.compareAtPrice > product.price
                ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
                : 0;

              return (
                <div
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className="bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    <div className="relative aspect-square overflow-hidden bg-stone-100">
                      <img 
                        src={product.images[0] || 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=400&q=80'} 
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />

                      {discountPercentage > 0 && (
                        <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow">
                          -{discountPercentage}%
                        </span>
                      )}

                      {product.stock <= 5 && product.stock > 0 && (
                        <span className="absolute bottom-2 left-2 bg-amber-500/95 backdrop-blur-sm text-stone-950 text-[10px] font-bold px-2 py-0.5 rounded shadow">
                          Plus que {product.stock} dispo
                        </span>
                      )}
                    </div>

                    <div className="p-3.5 space-y-1.5">
                      <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                        {product.category}
                      </span>
                      <h3 className="font-bold text-xs sm:text-sm text-stone-900 line-clamp-1 group-hover:text-amber-700 transition-colors">
                        {product.name}
                      </h3>
                      
                      <div className="flex items-baseline gap-2 pt-0.5">
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

                  {/* Click to open details */}
                  <div className="p-3.5 pt-0">
                    <button
                      type="button"
                      className="w-full py-2 bg-stone-900 group-hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                      <span>Voir la fiche & commander</span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Floating Bottom Cart Bar (Sticky on mobile & desktop) */}
      {cartCount > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-stone-900 text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between border border-stone-700 hover:bg-stone-800 transition-all transform hover:scale-[1.01] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black text-sm">
                {cartCount}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-amber-400">Panier en cours</p>
                <p className="text-sm font-extrabold">{formatFCFA(cartTotal)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-emerald-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow">
              <MessageSquare className="w-4 h-4" />
              <span>Finaliser la commande</span>
            </div>
          </button>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          store={activeStore}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={(prod, qty, variant, size, color) => {
            addToCart(prod, qty);
            setIsCartOpen(true);
          }}
        />
      )}

      {/* Cart & Checkout Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-stone-900/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-600" />
                <h3 className="font-heading font-bold text-base text-stone-900">
                  Votre Panier ({cartCount})
                </h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Confirmation Screen */}
            {orderConfirmedNumber ? (
              <div className="p-8 text-center space-y-4 my-auto">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="font-heading font-black text-2xl text-stone-900">
                  Commande confirmée !
                </h3>
                <p className="font-mono text-sm font-bold text-amber-700 bg-amber-50 py-2 rounded-xl border border-amber-200">
                  Réf: {orderConfirmedNumber}
                </p>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Le commerçant <strong>{activeStore.name}</strong> a bien reçu votre commande. Il vous contactera par téléphone ou WhatsApp pour convenir de l'heure exacte de livraison.
                </p>
                <button
                  onClick={() => {
                    setOrderConfirmedNumber(null);
                    setIsCartOpen(false);
                  }}
                  className="w-full py-3 bg-stone-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Continuer mes achats
                </button>
              </div>
            ) : cart.length === 0 ? (
              <div className="p-12 text-center space-y-3 my-auto">
                <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto" />
                <p className="font-bold text-sm text-stone-700">Votre panier est vide</p>
                <p className="text-xs text-stone-500">Ajoutez des articles depuis la boutique pour commander.</p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold mt-2 cursor-pointer"
                >
                  Découvrir les articles
                </button>
              </div>
            ) : (
              <>
                {/* Cart Items List */}
                <div className="p-4 space-y-3 divide-y divide-stone-100 flex-1 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.product.id} className="pt-3 first:pt-0 flex gap-3 items-center">
                      <img 
                        src={item.product.images[0]} 
                        alt={item.product.name}
                        className="w-14 h-14 rounded-xl object-cover shrink-0 border border-stone-200" 
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs text-stone-900 truncate">
                          {item.product.name}
                        </p>
                        {(item.selectedSize || item.selectedColor) && (
                          <p className="text-[10px] text-stone-500">
                            {item.selectedSize && `Taille: ${item.selectedSize}`}
                            {item.selectedSize && item.selectedColor && ' • '}
                            {item.selectedColor && `Couleur: ${item.selectedColor}`}
                          </p>
                        )}
                        <p className="text-amber-700 font-extrabold text-xs mt-0.5">
                          {formatFCFA(item.product.price)}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-1.5">
                          <button
                            onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                            className="w-5 h-5 bg-stone-100 hover:bg-stone-200 rounded flex items-center justify-center text-xs cursor-pointer"
                          >
                            -
                          </button>
                          <span className="text-xs font-bold">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                            className="w-5 h-5 bg-stone-100 hover:bg-stone-200 rounded flex items-center justify-center text-xs cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-stone-400 hover:text-red-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {/* Delivery & Checkout Details Form */}
                  <div className="pt-4 space-y-3 text-xs">
                    <p className="font-bold uppercase tracking-wider text-stone-700">
                      Coordonnées & Livraison (Sénégal) :
                    </p>

                    <div>
                      <label className="block text-stone-600 mb-1 font-medium">
                        Zone de livraison :
                      </label>
                      <select
                        value={selectedZoneId}
                        onChange={(e) => setSelectedZoneId(e.target.value)}
                        className="w-full p-2 border border-stone-300 rounded-lg text-xs bg-white outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                      >
                        {activeStore.deliveryZones.map((zone) => (
                          <option key={zone.id} value={zone.id}>
                            {zone.name} — {formatFCFA(zone.price)} ({zone.estimatedTime})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-stone-600 mb-1 font-medium">Votre Nom *</label>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Fatou Sow"
                          className="w-full p-2 border border-stone-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-600 mb-1 font-medium">WhatsApp / Tél *</label>
                        <input
                          type="tel"
                          required
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="+221 77 123 45 67"
                          className="w-full p-2 border border-stone-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-stone-600 mb-1 font-medium">Adresse ou Quartier exact *</label>
                      <input
                        type="text"
                        required
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        placeholder="ex: Médina Rue 14 en face pharmacie, Dakar"
                        className="w-full p-2 border border-stone-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    {/* Payment Mode Selector */}
                    <div>
                      <label className="block text-stone-600 mb-1 font-medium">Mode de paiement souhaité :</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedPaymentMethod('wave')}
                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                            selectedPaymentMethod === 'wave'
                              ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                              : 'border-stone-200 bg-white text-stone-600'
                          }`}
                        >
                          <div className="text-[11px] font-black text-blue-600">Wave</div>
                          <div className="text-[9px] text-stone-400">Mobile Money</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedPaymentMethod('orange_money')}
                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                            selectedPaymentMethod === 'orange_money'
                              ? 'border-orange-600 bg-orange-50 text-orange-900 font-bold'
                              : 'border-stone-200 bg-white text-stone-600'
                          }`}
                        >
                          <div className="text-[11px] font-black text-orange-600">Orange</div>
                          <div className="text-[9px] text-stone-400">Orange Money</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedPaymentMethod('especes_livraison')}
                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                            selectedPaymentMethod === 'especes_livraison'
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                              : 'border-stone-200 bg-white text-stone-600'
                          }`}
                        >
                          <div className="text-[11px] font-black text-emerald-600">Espèces</div>
                          <div className="text-[9px] text-stone-400">À la livraison</div>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-stone-600 mb-1 font-medium">Instructions pour le livreur (facultatif)</label>
                      <input
                        type="text"
                        value={customerNotes}
                        onChange={(e) => setCustomerNotes(e.target.value)}
                        placeholder="ex: Appeler dès votre arrivée au portail"
                        className="w-full p-2 border border-stone-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Drawer Footer & Checkout Buttons */}
                <div className="p-4 border-t border-stone-200 bg-stone-50 space-y-3">
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-stone-500">
                      <span>Sous-total articles :</span>
                      <span>{formatFCFA(cartTotal)}</span>
                    </div>
                    <div className="flex justify-between text-stone-500">
                      <span>Frais de livraison ({selectedZone.name}) :</span>
                      <span>{formatFCFA(deliveryPrice)}</span>
                    </div>
                    <div className="flex justify-between text-stone-900 font-extrabold text-sm pt-1 border-t border-stone-200">
                      <span>Total à régler :</span>
                      <span className="text-amber-700">{formatFCFA(grandTotal)}</span>
                    </div>
                  </div>

                  {/* Primary WhatsApp Action */}
                  <button
                    onClick={handleWhatsAppCheckout}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Commander via WhatsApp</span>
                  </button>

                  {/* Direct Online Validation for Premium/VIP */}
                  {!isStandardPlan && (
                    <button
                      onClick={handleDirectCheckout}
                      className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Enregistrer la commande directement sur le site
                    </button>
                  )}

                  <p className="text-[10px] text-stone-500 text-center">
                    Paiement sécurisé. Aucun débit direct non autorisé.
                  </p>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
