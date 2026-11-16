import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TRIAL_DAYS } from '../../data/plans';
import type { SubscriptionPlan } from '../../types';
import { 
  Check, 
  Clock,
  HelpCircle, 
  AlertTriangle, 
  ArrowRight, 
  Sparkles
} from 'lucide-react';

// Les fonctionnalités pas encore développées portent la mention "(bientôt disponible)" dans la source des formules
const FeatureItem: React.FC<{ text: string; dark: boolean }> = ({ text, dark }) => {
  const soon = /\(bientôt disponible\)/i.test(text);
  const clean = text.replace(/\s*\(bientôt disponible\)/i, '');
  return (
    <li className="flex items-start gap-2.5">
      {soon ? (
        <Clock className={`w-4 h-4 shrink-0 mt-0.5 ${dark ? 'text-stone-500' : 'text-stone-400'}`} />
      ) : (
        <Check className={`w-4 h-4 shrink-0 mt-0.5 ${dark ? 'text-amber-400' : 'text-emerald-600'}`} />
      )}
      <span className={dark ? 'text-stone-200' : 'text-stone-600'}>
        {clean}
        {soon && (
          <span className={`ml-1.5 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
            dark ? 'bg-stone-700 text-stone-300' : 'bg-stone-200 text-stone-600'
          }`}>
            Bientôt
          </span>
        )}
      </span>
    </li>
  );
};

export const PricingPage: React.FC = () => {
  const { plans, formatFCFA, setCurrentView } = useApp();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const yes = <span className="font-bold text-emerald-600">✓ Oui</span>;
  const no = <span className="text-stone-400">Non</span>;

  // Le tableau comparatif est entièrement calculé à partir de la source unique des formules
  const rows: { label: string; cell: (p: SubscriptionPlan) => React.ReactNode }[] = [
    { label: 'Prix par mois', cell: (p) => <strong className="text-stone-900">{formatFCFA(p.priceMonthly)}</strong> },
    { label: 'Prix par an (2 mois offerts)', cell: (p) => formatFCFA(p.priceYearly) },
    { label: 'Nombre maximum de produits', cell: (p) => <strong>{p.maxProducts} produits</strong> },
    { label: 'Logo et informations de la boutique', cell: () => yes },
    { label: 'Lien de boutique à copier et partager', cell: () => yes },
    { label: 'Commande du client envoyée sur votre WhatsApp', cell: (p) => (p.hasWhatsAppCheckout ? yes : no) },
    { label: 'Commande complète : paiement, livraison, informations du client', cell: (p) => (p.hasAdvancedCheckout ? yes : no) },
    { label: 'Boutons de partage vers vos réseaux sociaux', cell: (p) => (p.hasManualSocialShare ? yes : no) },
    { label: 'Bilan de vos ventes (total, ruptures, produits les plus et moins vendus)', cell: (p) => (p.hasAiAnalytics ? yes : no) },
    { label: 'Conseils de vente et aide IA à l’ajout d’un produit', cell: (p) => (p.hasVipAiAssistant ? yes : no) },
    { label: 'Mise en avant auprès des acheteurs (Marketplace)', cell: (p) => (p.id === 'vip' ? yes : no) },
    {
      label: 'Agent IA qui publie votre lien toutes les 24 h (bientôt disponible)',
      cell: (p) => (p.id === 'standard' ? '1 réseau social' : p.id === 'premium' ? '2 réseaux sociaux' : 'Tous vos réseaux')
    },
    { label: 'Scan d’un produit par l’IA (bientôt disponible)', cell: (p) => (p.id === 'vip' ? yes : no) },
    { label: 'Commission sur vos ventes', cell: (p) => <span className="font-bold text-emerald-600">{p.commissionRate} %</span> },
    { label: 'Support', cell: (p) => (p.prioritySupport ? <strong>Prioritaire</strong> : 'Standard') }
  ];

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
          Essayez gratuitement pendant <strong>{TRIAL_DAYS} jours</strong>, avec la formule de votre choix. Ensuite, vous activez cette formule ou vous en choisissez une autre selon la taille de votre catalogue.
        </p>

        {/* Fonctionnement du paiement */}
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-xs flex items-start gap-3 text-left">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">
              Comment se règle votre abonnement :
            </p>
            <p className="text-amber-800 leading-relaxed">
              Vous envoyez une demande d'activation depuis votre tableau de bord, puis vous réglez par Wave ou Orange Money. L'équipe Boutika active votre formule dès réception du paiement. Le paiement en ligne automatique arrive bientôt.
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
              2 mois offerts
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
                      {formatFCFA(displayPrice)}
                    </span>
                    <span className={`text-xs font-medium ${isPro ? 'text-stone-400' : 'text-stone-500'}`}>
                      / mois
                    </span>
                  </div>
                  <p className={`text-[11px] mt-1 ${isPro ? 'text-amber-400' : 'text-stone-400'}`}>
                    {billingCycle === 'yearly'
                      ? `Facturé ${formatFCFA(plan.priceYearly)} par an`
                      : 'Sans engagement, résiliable à tout moment'}
                  </p>
                  <p className={`mt-2 inline-block text-[11px] font-bold rounded-full px-2.5 py-1 ${
                    isPro ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {TRIAL_DAYS} jours d'essai gratuit
                  </p>
                </div>

                <div className={`pt-6 border-t ${isPro ? 'border-stone-800' : 'border-stone-100'} space-y-3`}>
                  <p className={`text-xs font-bold uppercase tracking-wider ${isPro ? 'text-stone-300' : 'text-stone-500'}`}>
                    Fonctionnalités incluses :
                  </p>
                  <ul className="space-y-2.5 text-xs">
                    {plan.features.map((feature, idx) => (
                      <FeatureItem key={idx} text={feature} dark={Boolean(isPro)} />
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
                  <span>Essayer {TRIAL_DAYS} jours gratuitement</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Feature Comparison Table (calculé depuis la source unique des formules) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
        <h3 className="font-heading font-bold text-2xl text-stone-900 text-center">
          Tableau comparatif détaillé
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider">
                <th className="py-3 px-4 font-bold text-stone-800">Critères</th>
                {plans.map((p) => (
                  <th
                    key={p.id}
                    className={`py-3 px-4 font-bold ${p.popular ? 'text-amber-700 bg-amber-50/50' : 'text-stone-800'}`}
                  >
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {rows.map((row) => (
                <tr key={row.label}>
                  <td className="py-3 px-4 font-medium text-stone-900">{row.label}</td>
                  {plans.map((p) => (
                    <td key={p.id} className={`py-3 px-4 ${p.popular ? 'bg-amber-50/30' : ''}`}>
                      {row.cell(p)}
                    </td>
                  ))}
                </tr>
              ))}
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
              <span>Comment fonctionne l'essai gratuit de {TRIAL_DAYS} jours ?</span>
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Vous choisissez votre formule à l'inscription et vous profitez de toutes ses fonctionnalités pendant {TRIAL_DAYS} jours. L'essai n'est accordé qu'une seule fois par vendeur. À la fin, vous activez votre formule ou vous en choisissez une autre : sans activation, l'accès au tableau de bord est bloqué, mais vos produits sont conservés.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-2">
            <h4 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Comment se fait le règlement de mon abonnement ?</span>
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Vous envoyez une demande d'activation depuis votre tableau de bord et vous réglez par Wave ou Orange Money. L'équipe Boutika active votre formule dès réception du paiement. Le paiement en ligne automatique, validé par les passerelles de paiement, arrive bientôt.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-2">
            <h4 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Boutika prélève-t-il un pourcentage sur mes ventes ?</span>
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Non ! Contrairement à d'autres plateformes internationales, Boutika applique 0 % de commission sur les ventes générées. Vous ne payez que le prix de votre formule, sans mauvaise surprise.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-2">
            <h4 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Puis-je changer de formule à tout moment ?</span>
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Oui. Depuis l'onglet « Abonnement & Facturation » de votre tableau de bord, vous pouvez demander à passer de Standard à Premium ou à VIP dès que votre catalogue grandit.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
