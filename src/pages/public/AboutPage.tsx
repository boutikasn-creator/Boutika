import React from 'react';
import { useApp } from '../../context/AppContext';
import { Store, Target, Users, ShieldCheck, Heart, Award, ArrowRight } from 'lucide-react';

export const AboutPage: React.FC = () => {
  const { setCurrentView, setIsAuthModalOpen, setAuthModalMode } = useApp();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
          Notre Mission
        </span>
        <h1 className="font-heading font-black text-4xl sm:text-5xl text-stone-900">
          Donner du pouvoir aux commerçants et créateurs d'Afrique
        </h1>
        <p className="text-base sm:text-lg text-stone-600 leading-relaxed">
          Boutika est née d'un constat simple sur le terrain à Dakar : le commerce local regorge de talents incroyables, mais les solutions e-commerce occidentales sont trop complexes, coûteuses et inadaptées aux usages WhatsApp et Mobile Money.
        </p>
      </div>

      {/* Vision & Values */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-stone-900">Simplicité Radicale</h3>
          <p className="text-sm text-stone-600 leading-relaxed">
            Pas besoin de savoir coder, de configurer un serveur ou d'avoir une carte bancaire internationale. Tout se gère depuis un smartphone avec une interface claire en français.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Heart className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-stone-900">Ancrage Local & Teranga</h3>
          <p className="text-sm text-stone-600 leading-relaxed">
            Pensé pour les réalités ouest-africaines : prix en Franc CFA (XOF), commandes pré-remplies pour WhatsApp, gestion des zones de livraison à Dakar et relais GP dans les régions.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-stone-900">Sécurité & Transparence</h3>
          <p className="text-sm text-stone-600 leading-relaxed">
            Séparation stricte des données entre vendeurs, protection des informations clients et préparation d'intégrations de paiement officielles et auditées.
          </p>
        </div>

      </div>

      {/* Why WhatsApp-first */}
      <div className="bg-stone-900 text-white p-8 sm:p-10 rounded-3xl space-y-6">
        <h2 className="font-heading font-black text-2xl sm:text-3xl text-amber-400">
          Pourquoi ne pas remplacer WhatsApp, mais plutôt l'enrichir ?
        </h2>
        <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
          Au Sénégal, la relation humaine est au cœur de chaque transaction commerciale. Les clients veulent pouvoir discuter, négocier ou poser une question au vendeur. 
          Boutika ne cherche pas à déshumaniser la vente : nous offrons un catalogue professionnel qui structure la commande en amont, tout en permettant au vendeur de finaliser la vente directement dans sa messagerie préférée.
        </p>
        <div className="pt-2 flex flex-wrap gap-4 text-xs font-semibold text-stone-300">
          <span className="bg-stone-800 px-3 py-1.5 rounded-lg border border-stone-700">✓ Vendeurs de Sandaga & Médina</span>
          <span className="bg-stone-800 px-3 py-1.5 rounded-lg border border-stone-700">✓ Créatrices de mode & cosmétiques</span>
          <span className="bg-stone-800 px-3 py-1.5 rounded-lg border border-stone-700">✓ Boutiques high-tech & accessoires</span>
        </div>
      </div>

      {/* Team CTA */}
      <div className="text-center space-y-4 pt-4">
        <h3 className="font-heading font-bold text-2xl text-stone-900">
          Vous souhaitez rejoindre l'aventure Boutika ?
        </h3>
        <p className="text-sm text-stone-600 max-w-lg mx-auto">
          Que vous soyez commerçant, artisan ou porteur de projet, nous serions ravis d'échanger avec vous.
        </p>
        <div className="flex justify-center gap-4 pt-2">
          <button
            onClick={() => setCurrentView('contact')}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow transition-all"
          >
            Nous contacter à Dakar
          </button>
        </div>
      </div>

    </div>
  );
};
