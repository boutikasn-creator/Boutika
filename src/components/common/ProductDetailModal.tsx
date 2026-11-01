import React, { useState, useEffect } from 'react';
import { Product, ProductVariant, Store } from '../../types';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  ShoppingBag, 
  MessageSquare, 
  Check, 
  Plus, 
  Minus, 
  MapPin, 
  ShieldCheck, 
  Sparkles,
  Truck,
  ArrowRight
} from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  store: Store;
  onClose: () => void;
  onAddToCart?: (product: Product, quantity: number, variant?: ProductVariant, selectedSize?: string, selectedColor?: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  store,
  onClose,
  onAddToCart
}) => {
  const { formatFCFA, showToast, addToCart } = useApp();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (product) {
      setActiveImageIndex(0);
      setQuantity(1);
      // Auto select first available size / color
      if (product.sizes && product.sizes.length > 0) {
        setSelectedSize(product.sizes[0]);
      } else {
        setSelectedSize('');
      }
      if (product.colors && product.colors.length > 0) {
        setSelectedColor(product.colors[0]);
      } else {
        setSelectedColor('');
      }
    }
  }, [product]);

  if (!product) return null;

  // Find matching variant if exists
  const activeVariant: ProductVariant | undefined = product.variants?.find((v) => {
    const sizeMatches = !selectedSize || v.size === selectedSize;
    const colorMatches = !selectedColor || v.color === selectedColor;
    return sizeMatches && colorMatches;
  }) || product.variants?.[0];

  // Stock calculation
  const currentStock = activeVariant?.stock !== undefined ? activeVariant.stock : product.stock;
  const isOutOfStock = currentStock <= 0;

  // Price adjustment with variant delta
  const finalPrice = product.price + (activeVariant?.priceDelta || 0);

  const discountPercentage = product.compareAtPrice && product.compareAtPrice > finalPrice
    ? Math.round(((product.compareAtPrice - finalPrice) / product.compareAtPrice) * 100)
    : 0;

  const handleAddToCartClick = () => {
    if (isOutOfStock) {
      showToast('Cet article est actuellement en rupture de stock.');
      return;
    }
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      showToast('Veuillez sélectionner une taille.');
      return;
    }
    if (product.colors && product.colors.length > 0 && !selectedColor) {
      showToast('Veuillez sélectionner une couleur.');
      return;
    }

    if (onAddToCart) {
      onAddToCart(product, quantity, activeVariant, selectedSize, selectedColor);
    } else {
      addToCart(product, quantity);
    }

    showToast(`${quantity}x ${product.name} ajouté au panier !`);
    onClose();
  };

  const handleDirectWhatsAppOrder = () => {
    const lines = [
      `👋 Bonjour *${store.name}* !`,
      `Je souhaite commander cet article depuis votre boutique Boutika :`,
      '',
      `📦 *${product.name}*`,
      `• Prix unitaire : ${formatFCFA(finalPrice)}`,
      `• Quantité : ${quantity}`
    ];

    if (selectedSize) lines.push(`• Taille choisie : ${selectedSize}`);
    if (selectedColor) lines.push(`• Couleur choisie : ${selectedColor}`);
    lines.push(`💰 *Total article : ${formatFCFA(finalPrice * quantity)}*`);
    lines.push('');
    lines.push(`Pouvez-vous me confirmer la disponibilité et le délai de livraison ? Merci !`);

    const cleanPhone = store.whatsappNumber.replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(waUrl, '_blank');
  };

  const handleShareProduct = () => {
    const productUrl = `${window.location.origin}/v/${store.slug}?product=${product.id}`;
    navigator.clipboard?.writeText(productUrl);
    setCopiedLink(true);
    showToast('Lien de la fiche produit copié !');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div 
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-stone-100 text-stone-700 flex items-center justify-center shadow-md transition-colors cursor-pointer"
          title="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto p-4 sm:p-6 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            
            {/* Left: Product Images Gallery */}
            <div className="space-y-3">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 shadow-inner">
                <img 
                  src={product.images[activeImageIndex] || product.images[0] || 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=600&q=80'} 
                  alt={product.name} 
                  className="w-full h-full object-cover transition-all duration-300"
                />

                {discountPercentage > 0 && (
                  <span className="absolute top-3 left-3 bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-md">
                    -{discountPercentage}%
                  </span>
                )}

                {isOutOfStock ? (
                  <span className="absolute bottom-3 left-3 bg-stone-900/90 text-white text-xs font-bold px-3 py-1 rounded-lg">
                    Rupture de stock
                  </span>
                ) : currentStock <= 5 ? (
                  <span className="absolute bottom-3 left-3 bg-amber-500 text-stone-950 text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
                    Plus que {currentStock} en stock
                  </span>
                ) : null}
              </div>

              {/* Thumbnails */}
              {product.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                        activeImageIndex === idx 
                          ? 'border-amber-600 scale-105 shadow-sm' 
                          : 'border-stone-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`Aperçu ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Store Trust Card */}
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img 
                    src={store.logoUrl} 
                    alt={store.name} 
                    className="w-10 h-10 rounded-xl object-cover border border-stone-200 shrink-0" 
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-stone-900 truncate">{store.name}</p>
                    <p className="text-stone-500 text-[11px] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                      <span>{store.city}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleShareProduct}
                  className="px-2.5 py-1.5 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-stone-700 font-medium text-[11px] shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : null}
                  <span>{copiedLink ? 'Copié !' : 'Partager'}</span>
                </button>
              </div>
            </div>

            {/* Right: Product Details & Variant Selectors */}
            <div className="space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                
                {/* Category & Title */}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    {product.category}
                  </span>
                  <h2 className="font-heading font-black text-xl sm:text-2xl text-stone-900 mt-2 leading-tight">
                    {product.name}
                  </h2>
                  {product.sku && (
                    <p className="text-[11px] text-stone-400 font-mono mt-0.5">Réf: {product.sku}</p>
                  )}
                </div>

                {/* Pricing Block */}
                <div className="flex items-baseline gap-3 p-3 bg-amber-50/60 rounded-2xl border border-amber-100">
                  <span className="font-heading font-black text-2xl sm:text-3xl text-amber-700">
                    {formatFCFA(finalPrice)}
                  </span>
                  {product.compareAtPrice && product.compareAtPrice > finalPrice && (
                    <span className="text-sm text-stone-400 line-through">
                      {formatFCFA(product.compareAtPrice)}
                    </span>
                  )}
                  <span className="ml-auto text-xs font-semibold text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" />
                    Prix direct vendeur
                  </span>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Description :</h4>
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-h-36 overflow-y-auto">
                    {product.description}
                  </p>
                </div>

                {/* Variant: Size Selector */}
                {product.sizes && product.sizes.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-stone-800">Taille :</span>
                      <span className="text-amber-700 font-semibold">{selectedSize || 'Choisir une taille'}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {product.sizes.map((sz) => (
                        <button
                          key={sz}
                          onClick={() => setSelectedSize(sz)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            selectedSize === sz
                              ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                              : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Variant: Color Selector */}
                {product.colors && product.colors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-stone-800">Couleur :</span>
                      <span className="text-amber-700 font-semibold">{selectedColor || 'Choisir une couleur'}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {product.colors.map((col) => (
                        <button
                          key={col}
                          onClick={() => setSelectedColor(col)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            selectedColor === col
                              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                              : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          {col}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity Selector */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-stone-800">Quantité :</span>
                  <div className="flex items-center gap-3 bg-stone-100 border border-stone-200 rounded-xl p-1">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-stone-700 shadow-xs hover:bg-stone-50 disabled:opacity-40 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-heading font-black text-sm text-stone-900 w-6 text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(Math.min(currentStock || 99, quantity + 1))}
                      disabled={quantity >= currentStock}
                      className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-stone-700 shadow-xs hover:bg-stone-50 disabled:opacity-40 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Delivery Zone estimate */}
                <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-emerald-900 text-xs flex items-center gap-2.5">
                  <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Livraison rapide disponible à <strong>{store.city}</strong> et expédition dans tout le Sénégal.
                  </span>
                </div>

              </div>

              {/* Bottom Actions */}
              <div className="space-y-2 pt-4 border-t border-stone-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={handleAddToCartClick}
                    disabled={isOutOfStock}
                    className="w-full py-3 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4 text-amber-400" />
                    <span>Ajouter au panier</span>
                  </button>

                  <button
                    onClick={handleDirectWhatsAppOrder}
                    disabled={isOutOfStock}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Commander sur WhatsApp</span>
                  </button>
                </div>

                <p className="text-[11px] text-center text-stone-400">
                  Paiement sécurisé via Wave, Orange Money ou à la livraison en espèces.
                </p>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
