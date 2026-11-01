import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Store, 
  Phone, 
  Mail, 
  MapPin, 
  ShieldCheck, 
  MessageSquare,
  ExternalLink
} from 'lucide-react';

export const Footer: React.FC = () => {
  const { setCurrentView } = useApp();

  return (
    <footer className="bg-stone-900 text-stone-300 pt-16 pb-12 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-stone-800">
          
          {/* Brand & mission */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-orange-600 to-amber-500 flex items-center justify-center text-white">
                <Store className="w-5 h-5" />
              </div>
              <span className="font-heading font-black text-2xl text-white tracking-tight">
                Boutika
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                SÉNÉGAL
              </span>
            </div>
            
            <p className="text-sm text-stone-400 leading-relaxed max-w-sm">
              La solution e-commerce conçue spécialement pour les commerçants, créateurs et vendeurs sur WhatsApp et Instagram à Dakar et en Afrique francophone.
            </p>

            <div className="pt-2 flex flex-col gap-2 text-xs text-stone-400">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Dakar, Médina & Plateau — Sénégal</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>WhatsApp Vendeurs : +221 77 654 32 10</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-stone-400 shrink-0" />
                <span>contact@boutika.sn</span>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-200 mb-4">
              Plateforme
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button 
                  onClick={() => setCurrentView('home')} 
                  className="hover:text-amber-400 transition-colors"
                >
                  Accueil
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentView('how-it-works')} 
                  className="hover:text-amber-400 transition-colors"
                >
                  Fonctionnement
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentView('pricing')} 
                  className="hover:text-amber-400 transition-colors"
                >
                  Formules & Tarifs
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentView('about')} 
                  className="hover:text-amber-400 transition-colors"
                >
                  À propos de nous
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentView('contact')} 
                  className="hover:text-amber-400 transition-colors"
                >
                  Contact & Assistance
                </button>
              </li>
            </ul>
          </div>

          {/* Commercial & Senegal Specifics */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-200 mb-4">
              Pour les Vendeurs
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button 
                  onClick={() => setCurrentView('register')} 
                  className="hover:text-amber-400 text-amber-400 font-semibold transition-colors"
                >
                  Créer ma boutique
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentView('login')} 
                  className="hover:text-amber-400 transition-colors"
                >
                  Connexion vendeur
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentView('public-store')} 
                  className="hover:text-amber-400 transition-colors text-left flex items-center gap-1 text-emerald-400"
                >
                  <span>Exemple de boutique</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </li>
              <li>
                <span className="text-stone-400 text-xs">
                  Commandes directes WhatsApp
                </span>
              </li>
              <li>
                <span className="text-stone-400 text-xs">
                  Paiements ciblés Wave & Orange Money
                </span>
              </li>
              <li>
                <span className="text-stone-400 text-xs">
                  Zones de livraison Dakar & Régions
                </span>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentView('architecture')} 
                  className="hover:text-amber-400 transition-colors text-xs text-indigo-400"
                >
                  Spécifications & Sécurité
                </button>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-200 mb-4">
              Légal & Conformité
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button 
                  onClick={() => setCurrentView('legal-mentions')} 
                  className="hover:text-amber-400 transition-colors"
                >
                  Mentions Légales
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentView('legal-privacy')} 
                  className="hover:text-amber-400 transition-colors"
                >
                  Politique de Confidentialité
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentView('legal-terms')} 
                  className="hover:text-amber-400 transition-colors"
                >
                  Conditions Générales (CGU)
                </button>
              </li>
              <li className="pt-2">
                <div className="flex items-center gap-1.5 text-xs text-stone-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Conformité CDP Sénégal</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <p>
            © {new Date().getFullYear()} Boutika Sénégal. Tous droits réservés. Développé pour soutenir l'entrepreneuriat local.
          </p>
          <div className="flex items-center gap-4">
            <span className="bg-stone-800 px-2.5 py-1 rounded text-stone-400 font-mono text-[11px]">
              Devise : Franc CFA (XOF)
            </span>
            <span className="bg-stone-800 px-2.5 py-1 rounded text-stone-400 text-[11px]">
              Intégrations envisagées : Wave, OM, CB
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
