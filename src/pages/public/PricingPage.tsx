import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Check, 
  HelpCircle, 
  AlertTriangle, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles,
  Zap
} from 'lucide-react';

export const PricingPage: React.FC = () => {
  const { plans, formatFCFA, setIsAuthModalOpen, setAuthModalMode, setCurrentView } = useApp();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
          Formules d'abonnement
        </span>
        <h1 className="font-heading font-black text-4xl sm:text-5xl text-stone-900">
          Des tarifs clairs, adaptés à la réalité des commerçants
        </h1>
        <p className="text-base sm:text-lg text-stone-600 leading-relaxed">
          Choisissez la formule qui correspond à votre étape de croissance. Démarrez gratuitement et passez à la vitesse supérieure quand votre catalogue s'agrandit.
        </p>

        {/* Prototype notice - mandatory requirement */}
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-xs flex items-start gap-3 text-left">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">
              Mention importante relative à la phase de développement (MVP) :
            </p>
            <p className="text-amber-800 leading-relaxed">
              Les montants et conditions ci-dessous sont présentés à titre indicatif pour la démonstration du prototype Boutika. Les tarifs officiels, frais de transaction des passerelles (Wave, Orange Money) et conditions commerciales définitives seront validés lors du lancement commercial officiel.
            </p>
          </div>
        </div>

        {/* Billing Switch */}
        <div className="pt-4 flex items-center justify-center gap-3">
          <span className={`text-xs font-bold ${billingCycle === 'monthly' ? 'text-stone-900' : 'text-stone-500'}`}>
            Facturation mensuelle
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
              billingCycle === 'yearly' ? 'bg-amber-600' : 'bg-stone-300'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`text-xs font-bold flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'text-stone-900' : 'text-stone-500'}`}>
            <span>Paiement annuel</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
              -15% d'économie
            </span>
          </span>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {plans.map((plan) => {
          const isPro = plan.popular;
          const displayPrice = billingCycle === 'monthly' ? plan.priceMonthly : Math.round(plan.priceYearly / 12);

          return (
            <div
              key={plan.id}
              className={`rounded-3xl p-8 flex flex-col justify-between transition-all relative ${
                isPro
                  ? 'bg-stone-900 text-white shadow-2xl ring-2 ring-amber-500 md:-translate-y-2'
                  : 'bg-white text-stone-900 border border-stone-200 shadow-sm hover:shadow-md'
              }`}
            >
              {isPro && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 text-xs font-extrabold uppercase px-4 py-1 rounded-full shadow flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Recommandé Vendeurs</span>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="font-heading font-black text-2xl tracking-tight">
                    {plan.name}
                  </h3>
                  <p className={`text-xs mt-2 leading-relaxed ${isPro ? 'text-stone-300' : 'text-stone-500'}`}>
                    {plan.tagline}
                  </p>
                </div>

                <div className="pt-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-heading font-black text-4xl sm:text-5xl">
                      {plan.priceMonthly === 0 ? 'Gratuit' : formatFCFA(displayPrice)}
                    </span>
                    {plan.priceMonthly > 0 && (
                      <span className={`text-xs font-medium ${isPro ? 'text-stone-400' : 'text-stone-500'}`}>
                        / mois
                      </span>
                    )}
                  </div>
                  <p className={`text-[11px] mt-1 ${isPro ? 'text-amber-400' : 'text-stone-400'}`}>
                    {plan.priceMonthly === 0 
                      ? 'Sans frais d’inscription' 
                      : billingCycle === 'yearly' 
                        ? `Facturé ${formatFCFA(plan.priceYearly)} par an` 
                        : 'Sans engagement, résiliable à tout moment'}
                  </p>
                </div>

                <div className={`pt-6 border-t ${isPro ? 'border-stone-800' : 'border-stone-100'} space-y-3`}>
                  <p className={`text-xs font-bold uppercase tracking-wider ${isPro ? 'text-stone-300' : 'text-stone-500'}`}>
                    Fonctionnalités incluses :
                  </p>
                  <ul className="space-y-2.5 text-xs">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <Check className={`w-4 h-4 shrink-0 mt-0.5 ${isPro ? 'text-amber-400' : 'text-emerald-600'}`} />
                        <span className={isPro ? 'text-stone-200' : 'text-stone-600'}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-8">
                <button
                  onClick={() => setCurrentView('register')}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    isPro
                      ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-lg'
                      : 'bg-stone-900 hover:bg-stone-800 text-white shadow-sm'
                  }`}
                >
                  <span>Choisir cette formule</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Feature Comparison Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
        <h3 className="font-heading font-bold text-2xl text-stone-900 text-center">
          Tableau comparatif détaillé
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider">
                <th className="py-3 px-4 font-bold text-stone-800">Critères</th>
                <th className="py-3 px-4 font-bold text-stone-800">Découverte (0 FCFA)</th>
                <th className="py-3 px-4 font-bold text-amber-700 bg-amber-50/50">Teranga Pro (5 000 FCFA)</th>
                <th className="py-3 px-4 font-bold text-stone-800">Ndam Élite (12 000 FCFA)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              <tr>
                <td className="py-3 px-4 font-medium text-stone-900">Nombre max de produits</td>
                <td className="py-3 px-4">10 produits</td>
                <td className="py-3 px-4 bg-amber-50/30 font-semibold text-amber-900">100 produits</td>
                <td className="py-3 px-4 font-semibold">Illimité</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-stone-900">Lien de boutique personnalisé</td>
                <td className="py-3 px-4">boutika.sn/v/nom</td>
                <td className="py-3 px-4 bg-amber-50/30">boutika.sn/v/nom</td>
                <td className="py-3 px-4">Nom de domaine propre possible</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-stone-900">Commande WhatsApp 1-Clic</td>
                <td className="py-3 px-4 font-bold text-emerald-600">✓ Oui</td>
                <td className="py-3 px-4 bg-amber-50/30 font-bold text-emerald-600">✓ Oui</td>
                <td className="py-3 px-4 font-bold text-emerald-600">✓ Oui</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-stone-900">Gestion des stocks et alertes</td>
                <td className="py-3 px-4 text-stone-400">Non</td>
                <td className="py-3 px-4 bg-amber-50/30 font-bold text-emerald-600">✓ Oui</td>
                <td className="py-3 px-4 font-bold text-emerald-600">✓ Oui</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-stone-900">Frais par zone à Dakar</td>
                <td className="py-3 px-4">Zone unique</td>
                <td className="py-3 px-4 bg-amber-50/30 font-bold text-emerald-600">✓ Jusqu'à 5 zones</td>
                <td className="py-3 px-4 font-bold text-emerald-600">✓ Zones illimitées + Régions</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-stone-900">Commissions sur les ventes</td>
                <td className="py-3 px-4 font-bold text-emerald-600">0% de commission</td>
                <td className="py-3 px-4 bg-amber-50/30 font-bold text-emerald-600">0% de commission</td>
                <td className="py-3 px-4 font-bold text-emerald-600">0% de commission</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-stone-900">Support client</td>
                <td className="py-3 px-4">Email standard</td>
                <td className="py-3 px-4 bg-amber-50/30 font-semibold text-amber-900">WhatsApp prioritaire 6j/7</td>
                <td className="py-3 px-4 font-semibold">Conseiller dédié 7j/7</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="max-w-3xl mx-auto space-y-6">
        <h3 className="font-heading font-black text-2xl text-stone-900 text-center">
          Questions fréquentes sur les tarifs
        </h3>

        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-2">
            <h4 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Comment se fera le règlement de mon abonnement au Sénégal ?</span>
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Nous envisageons l'intégration directe de Wave et Orange Money ainsi que les cartes bancaires via des passerelles agréées par la BCEAO. Les paiements ne seront validés qu'après confirmation serveur (webhook sécurisé).
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-2">
            <h4 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Boutika prélève-t-il un pourcentage sur mes ventes ?</span>
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Non ! Contrairement à d'autres plateformes internationales, Boutika applique 0% de commission sur les ventes générées. Vous ne payez que le coût de votre formule mensuelle sans mauvaise surprise.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-2">
            <h4 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Puis-je changer de formule à tout moment ?</span>
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Oui, vous pouvez débuter avec la Formule Découverte pour roder votre boutique, puis passer à la Formule Teranga Pro en un clic dès que vos commandes augmentent.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
