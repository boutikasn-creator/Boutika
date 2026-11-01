import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Store, 
  Smartphone, 
  Share2, 
  ShoppingBag, 
  MessageSquare, 
  Truck, 
  CreditCard,
  ArrowRight
} from 'lucide-react';

export const HowItWorksPage: React.FC = () => {
  const { setCurrentView, setIsAuthModalOpen, setAuthModalMode } = useApp();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
          Guide pas-à-pas
        </span>
        <h1 className="font-heading font-black text-4xl sm:text-5xl text-stone-900">
          Comment fonctionne Boutika pour votre commerce ?
        </h1>
        <p className="text-base sm:text-lg text-stone-600 leading-relaxed">
          Découvrez en détail comment Boutika simplifie votre quotidien, du premier produit ajouté jusqu'à la livraison chez votre client.
        </p>
      </div>

      {/* Step by Step Timeline */}
      <div className="space-y-12">
        
        {/* Step 1 */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-5 space-y-3">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">
              Étape 1 • Inscription Express
            </span>
            <h3 className="font-heading font-bold text-2xl text-stone-900">
              Créez votre profil marchand et votre adresse unique
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Indiquez le nom de votre marque, votre numéro WhatsApp joignable, votre quartier à Dakar et choisissez une adresse web mémorisable comme :
            </p>
            <div className="p-3 bg-stone-50 rounded-xl font-mono text-xs text-amber-800 font-bold border border-stone-200">
              boutika.sn/v/votre-boutique
            </div>
          </div>
          <div className="md:col-span-7 bg-amber-50/50 rounded-2xl p-6 border border-amber-100 flex items-center justify-center">
            <div className="space-y-3 w-full max-w-sm bg-white p-4 rounded-xl shadow-sm border border-stone-200 text-xs">
              <div className="flex items-center gap-2 font-bold text-stone-800">
                <Store className="w-4 h-4 text-amber-600" />
                <span>Configuration de la boutique</span>
              </div>
              <div className="space-y-2 text-stone-600">
                <div className="bg-stone-50 p-2 rounded">Nom : Teranga Wax Dakar</div>
                <div className="bg-stone-50 p-2 rounded">WhatsApp : +221 77 654 32 10</div>
                <div className="bg-stone-50 p-2 rounded">Quartier : Médina / Dakar</div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-5 space-y-3 order-1 md:order-2">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
              Étape 2 • Catalogue & Stock
            </span>
            <h3 className="font-heading font-bold text-2xl text-stone-900">
              Ajoutez vos articles avec photos, prix et stock
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Photographiez vos produits, fixez leur prix en Francs CFA, indiquez la quantité disponible et classez-les par catégories. Dès qu'un article est épuisé, il est automatiquement masqué.
            </p>
            <ul className="text-xs text-stone-600 space-y-1.5 font-medium">
              <li className="flex items-center gap-2">✓ Plusieurs photos par article</li>
              <li className="flex items-center gap-2">✓ Prix barrés pour promotions</li>
              <li className="flex items-center gap-2">✓ Alertes de rupture de stock</li>
            </ul>
          </div>
          <div className="md:col-span-7 bg-emerald-50/50 rounded-2xl p-6 border border-emerald-100 flex items-center justify-center order-2 md:order-1">
            <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
              <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-sm">
                <div className="h-20 bg-stone-100 rounded-lg mb-2 overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=200&q=80" alt="demo" className="w-full h-full object-cover" />
                </div>
                <p className="text-xs font-bold text-stone-900 truncate">Boubou Wax Royal</p>
                <p className="text-xs text-amber-700 font-extrabold">25 000 FCFA</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-sm">
                <div className="h-20 bg-stone-100 rounded-lg mb-2 overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=200&q=80" alt="demo" className="w-full h-full object-cover" />
                </div>
                <p className="text-xs font-bold text-stone-900 truncate">Sac Cuir & Manjak</p>
                <p className="text-xs text-amber-700 font-extrabold">22 000 FCFA</p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-5 space-y-3">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">
              Étape 3 • Diffusion & Commandes WhatsApp
            </span>
            <h3 className="font-heading font-bold text-2xl text-stone-900">
              Diffusez votre lien et recevez des commandes parfaites
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Placez votre lien dans votre bio Instagram, sur TikTok et vos statuts WhatsApp. Vos acheteurs choisissent leurs articles, indiquent leur quartier de livraison, et le bouton génère un message WhatsApp prêt à être validé :
            </p>
            <div className="p-3 bg-emerald-50 rounded-xl text-[11px] font-mono text-emerald-900 border border-emerald-200">
              "Bonjour, je souhaite commander 1x Boubou Wax (25 000 F) avec livraison à Ouakam. Mon contact : 77 450 12 34."
            </div>
          </div>
          <div className="md:col-span-7 bg-stone-100 rounded-2xl p-6 border border-stone-200 flex items-center justify-center">
            <div className="w-full max-w-sm bg-white p-4 rounded-xl shadow border border-stone-200 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-bold text-stone-800">Commande reçue #BK-2610</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[10px]">Prête</span>
              </div>
              <div className="space-y-1 text-stone-600">
                <p>Client : Fatou Sall (Almadies)</p>
                <p>Total : 27 000 FCFA (avec livraison)</p>
                <p>Paiement souhaité : Wave / Espèces</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* CTA Bottom */}
      <div className="text-center pt-6">
        <button
          onClick={() => setCurrentView('register')}
          className="px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl shadow-lg transition-all inline-flex items-center gap-2 text-base"
        >
          <span>Créer ma boutique dès maintenant</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

    </div>
  );
};
