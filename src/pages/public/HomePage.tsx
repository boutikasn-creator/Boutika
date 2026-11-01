import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Store, 
  ArrowRight, 
  ShoppingBag, 
  MessageSquare, 
  Smartphone, 
  TrendingUp, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  Star,
  ExternalLink,
  DollarSign
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { 
    setCurrentView, 
    setIsAuthModalOpen, 
    setAuthModalMode, 
    stores, 
    setSelectedStoreSlug, 
    setActiveStoreId,
    formatFCFA
  } = useApp();

  const handleOpenStore = (storeId: string, slug: string) => {
    setActiveStoreId(storeId);
    setSelectedStoreSlug(slug);
    setCurrentView('public-store');
  };

  return (
    <div className="space-y-20 pb-20">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-amber-50/70 via-stone-50/50 to-white pt-12 pb-20 border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Value Prop */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>
                <span>Fait à Dakar pour les vendeurs d'Afrique de l'Ouest</span>
              </div>

              <h1 className="font-heading font-black text-4xl sm:text-5xl lg:text-6xl text-stone-900 tracking-tight leading-[1.15]">
                Votre boutique en ligne{' '}
                <span className="text-amber-600 underline decoration-amber-300 decoration-wavy decoration-2">
                  prête en 2 minutes
                </span>, synchronisée avec WhatsApp.
              </h1>

              <p className="text-lg sm:text-xl text-stone-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Arrêtez de renvoyer 50 photos par jour et de répéter vos prix. Donnez à vos clients un catalogue mobile rapide, avec prix en FCFA, calcul des livraisons et commande en 1 clic.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  onClick={() => setCurrentView('register')}
                  className="w-full sm:w-auto px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2.5 text-base"
                >
                  <span>Créer ma boutique gratuitement</span>
                  <ArrowRight className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setCurrentView('marketplace')}
                  className="w-full sm:w-auto px-6 py-4 bg-white hover:bg-stone-100 text-stone-900 font-extrabold rounded-xl border border-stone-300 transition-all flex items-center justify-center gap-2 text-base shadow-sm cursor-pointer"
                >
                  <ShoppingBag className="w-5 h-5 text-amber-600" />
                  <span>Explorer la Marketplace</span>
                </button>
              </div>

              {/* Trust checklist */}
              <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-semibold text-stone-600">
                <div className="flex items-center gap-2 justify-center lg:justify-start">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Aucune compétence technique</span>
                </div>
                <div className="flex items-center gap-2 justify-center lg:justify-start">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Adapté aux connexions mobiles 3G/4G</span>
                </div>
                <div className="flex items-center gap-2 justify-center lg:justify-start">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Zéro commission sur vos ventes</span>
                </div>
              </div>
            </div>

            {/* Right Column: Visual Mockup Showcase */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto w-full max-w-sm rounded-3xl bg-stone-900 p-3 shadow-2xl border-4 border-stone-800">
                {/* Phone Speaker & Camera */}
                <div className="w-24 h-4 bg-stone-800 rounded-full mx-auto mb-2"></div>
                
                {/* Screen Frame */}
                <div className="bg-stone-50 rounded-2xl overflow-hidden border border-stone-200">
                  
                  {/* Mock store banner */}
                  <div className="bg-amber-700 text-white p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
                        TW
                      </div>
                      <div>
                        <h4 className="font-bold text-sm leading-tight">Teranga Wax & Couture</h4>
                        <p className="text-[11px] text-amber-100">Médina, Dakar • boutika.sn/v/teranga-wax</p>
                      </div>
                    </div>
                  </div>

                  {/* Mock store product */}
                  <div className="p-3 space-y-3">
                    <div className="bg-white rounded-xl p-2.5 border border-stone-200 flex gap-3 items-center shadow-sm">
                      <img 
                        src="https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=150&q=80" 
                        alt="Boubou"
                        className="w-16 h-16 rounded-lg object-cover" 
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs text-stone-900 truncate">Boubou Moderne Wax Royal</p>
                        <p className="text-amber-700 font-extrabold text-xs">25 000 FCFA</p>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold">
                          En stock (Dakar)
                        </span>
                      </div>
                    </div>

                    {/* WhatsApp Action Preview */}
                    <div className="bg-emerald-600 text-white p-3 rounded-xl flex items-center justify-between text-xs shadow-md">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-emerald-200" />
                        <span className="font-bold">Commander via WhatsApp</span>
                      </div>
                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">1-Clic</span>
                    </div>

                    <div className="bg-stone-100 rounded-lg p-2.5 text-[11px] text-stone-600 space-y-1">
                      <p className="font-bold text-stone-800">Message reçu par le vendeur :</p>
                      <p className="font-mono text-[10px] text-stone-700 bg-white p-1.5 rounded border border-stone-200">
                        "Bonjour ! Je souhaite commander :<br/>
                        1x Boubou Wax Royal (25 000 FCFA)<br/>
                        Livraison : Almadies Dakar"
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Floating feature pills */}
              <div className="absolute -bottom-4 -left-4 bg-white p-3 rounded-xl shadow-lg border border-stone-200 hidden sm:flex items-center gap-2 text-xs font-bold text-stone-800">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Page optimisée 0.8s</span>
              </div>
              <div className="absolute top-6 -right-4 bg-white p-3 rounded-xl shadow-lg border border-stone-200 hidden sm:flex items-center gap-2 text-xs font-bold text-stone-800">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Commandes sécurisées</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* The 3 Major Frustrations of WhatsApp/Insta Selling solved */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <span className="text-xs font-extrabold uppercase tracking-widest text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
            Pourquoi Boutika ?
          </span>
          <h2 className="font-heading font-black text-3xl sm:text-4xl text-stone-900">
            Fini le chaos des commandes sur les réseaux sociaux
          </h2>
          <p className="text-stone-600 text-base">
            WhatsApp et Instagram sont formidables pour trouver des clients, mais épuisants pour gérer un commerce au quotidien.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:border-amber-300 transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-xl">
              ❌
            </div>
            <h3 className="font-bold text-lg text-stone-900">Le problème actuel</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Vous passez des heures à renvoyer les mêmes photos dans des groupes WhatsApp, à répéter les prix 50 fois et à vérifier manuellement les stocks.
            </p>
            <div className="pt-2 border-t border-stone-100 text-xs font-bold text-amber-700">
              💡 Solution Boutika : Un seul lien propre avec vos articles à jour.
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:border-amber-300 transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl">
              📦
            </div>
            <h3 className="font-bold text-lg text-stone-900">Livraisons désorganisées</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Les adresses sont floues, les clients oublient de préciser leur quartier ou leur numéro, et vos livreurs perdent un temps précieux à Dakar.
            </p>
            <div className="pt-2 border-t border-stone-100 text-xs font-bold text-amber-700">
              💡 Solution Boutika : Fiches livraisons avec quartiers & frais calculés.
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:border-amber-300 transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl">
              🚀
            </div>
            <h3 className="font-bold text-lg text-stone-900">Une image professionnelle</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Vos clients hésitent parfois par manque de confiance. Avoir votre propre boutique avec votre logo inspire immédiatement respect et réassurance.
            </p>
            <div className="pt-2 border-t border-stone-100 text-xs font-bold text-amber-700">
              💡 Solution Boutika : Votre adresse officielle <code>boutika.sn/v/votre-nom</code>.
            </div>
          </div>

        </div>
      </section>

      {/* Interactive Live Stores Showcase */}
      <section className="bg-stone-100/70 py-16 border-y border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-700">
                Exemples concrets à Dakar
              </span>
              <h2 className="font-heading font-black text-3xl text-stone-900 mt-1">
                Découvrez des boutiques créées avec Boutika
              </h2>
            </div>
            <button
              onClick={() => setCurrentView('public-store')}
              className="text-amber-700 font-bold hover:text-amber-800 flex items-center gap-1.5 text-sm"
            >
              <span>Tester la boutique en direct</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stores.map((store) => (
              <div 
                key={store.id} 
                className="bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 overflow-hidden">
                    <img 
                      src={store.bannerUrl} 
                      alt={store.name} 
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full text-[11px] font-bold text-stone-800 shadow-sm">
                      {store.city}
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <img 
                        src={store.logoUrl} 
                        alt={store.name} 
                        className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm -mt-8"
                      />
                      <div>
                        <h3 className="font-bold text-base text-stone-900 leading-tight">
                          {store.name}
                        </h3>
                        <p className="text-xs text-amber-700 font-mono">
                          boutika.sn/v/{store.slug}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-stone-600 line-clamp-2">
                      {store.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {store.categories.slice(0, 3).map((cat, idx) => (
                        <span key={idx} className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded font-medium">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0 border-t border-stone-100 mt-3 flex items-center justify-between">
                  <span className="text-xs text-stone-500 font-medium">
                    {store.deliveryZones.length} zones de livraison
                  </span>
                  <button
                    onClick={() => handleOpenStore(store.id, store.slug)}
                    className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <span>Visiter</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works 3 steps */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <h2 className="font-heading font-black text-3xl sm:text-4xl text-stone-900">
            Comment fonctionne Boutika ?
          </h2>
          <p className="text-stone-600 text-base">
            Trois étapes simples pour transformer votre activité commerciale.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          
          <div className="bg-white p-6 rounded-2xl border border-stone-200 relative">
            <div className="w-10 h-10 rounded-full bg-amber-600 text-white font-extrabold flex items-center justify-center text-lg mb-4 shadow">
              1
            </div>
            <h3 className="font-bold text-lg text-stone-900 mb-2">
              Créez votre boutique
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Donnez un nom à votre boutique, ajoutez votre logo et votre numéro WhatsApp en moins de 2 minutes. Aucun document complexe requis au départ.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-stone-200 relative">
            <div className="w-10 h-10 rounded-full bg-amber-600 text-white font-extrabold flex items-center justify-center text-lg mb-4 shadow">
              2
            </div>
            <h3 className="font-bold text-lg text-stone-900 mb-2">
              Ajoutez vos produits
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Prenez les photos avec votre smartphone, fixez vos prix en FCFA, classez par catégories et définissez vos zones de livraison à Dakar ou dans les régions.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-stone-200 relative">
            <div className="w-10 h-10 rounded-full bg-amber-600 text-white font-extrabold flex items-center justify-center text-lg mb-4 shadow">
              3
            </div>
            <h3 className="font-bold text-lg text-stone-900 mb-2">
              Partagez et encaissez
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Mettez le lien de votre boutique dans votre bio Instagram et sur vos statuts WhatsApp. Recevez des commandes prêtes et claires.
            </p>
          </div>

        </div>

        <div className="mt-12 text-center">
          <button
            onClick={() => setCurrentView('how-it-works')}
            className="inline-flex items-center gap-2 text-sm font-bold text-amber-700 hover:text-amber-800"
          >
            <span>Voir le guide détaillé de fonctionnement</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* CTA Box */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="text-xs font-bold tracking-widest uppercase text-amber-400">
              Rejoignez les commerçants du Sénégal
            </span>
            <h2 className="font-heading font-black text-3xl sm:text-4xl leading-tight">
              Prêt à développer vos ventes en ligne dès aujourd'hui ?
            </h2>
            <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
              Testez gratuitement Boutika sans engagement. Configurez votre catalogue et commencez à partager votre boutique dès aujourd'hui.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setCurrentView('register')}
                className="px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold rounded-xl transition-all shadow"
              >
                Créer ma boutique maintenant
              </button>
              <button
                onClick={() => setCurrentView('contact')}
                className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all border border-white/20"
              >
                Contacter un conseiller à Dakar
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
