import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, FileText, Lock, ArrowLeft } from 'lucide-react';

export const LegalMentionsPage: React.FC = () => {
  const { setCurrentView } = useApp();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <button
        onClick={() => setCurrentView('home')}
        className="flex items-center gap-2 text-xs font-bold text-amber-700 hover:text-amber-800"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Retour à l'accueil</span>
      </button>

      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
          Informations réglementaires
        </span>
        <h1 className="font-heading font-black text-3xl sm:text-4xl text-stone-900">
          Mentions Légales
        </h1>
        <p className="text-xs text-stone-500">
          Dernière mise à jour : 23 Octobre 2026 — République du Sénégal
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6 text-sm text-stone-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="font-bold text-base text-stone-900">1. Éditeur de la plateforme</h2>
          <p>
            La plateforme web accessible à l’adresse <strong>boutika.sn</strong> est éditée par le projet <strong>Boutika Technologies Sénégal</strong>, initiative technologique dédiée à la digitalisation du commerce de détail en Afrique francophone.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-stone-600">
            <li>Siège opérationnel : Rue 14 angle Boulevard Dial Diop, Médina, Dakar, Sénégal.</li>
            <li>Contact officiel : contact@boutika.sn / support@boutika.sn</li>
            <li>Téléphone WhatsApp : +221 77 654 32 10</li>
            <li>Directeur de publication : Responsable Produit Boutika</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-base text-stone-900">2. Hébergement et infrastructure</h2>
          <p>
            L’application et ses bases de données sont hébergées sur une infrastructure cloud moderne hautement sécurisée conforme aux normes ISO 27001 et SOC 2, avec des sauvegardes chiffrées régulières.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-base text-stone-900">3. Nature du service</h2>
          <p>
            Boutika est une plateforme technique SaaS (Software as a Service) fournissant des outils de création de vitrines en ligne et de gestion des commandes. Boutika n'intervient pas en qualité de revendeur ni d'acheteur des produits présentés par les vendeurs indépendants.
          </p>
        </section>
      </div>
    </div>
  );
};

export const LegalPrivacyPage: React.FC = () => {
  const { setCurrentView } = useApp();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <button
        onClick={() => setCurrentView('home')}
        className="flex items-center gap-2 text-xs font-bold text-amber-700 hover:text-amber-800"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Retour à l'accueil</span>
      </button>

      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4" />
          <span>Conformité CDP Sénégal</span>
        </span>
        <h1 className="font-heading font-black text-3xl sm:text-4xl text-stone-900">
          Politique de Confidentialité & Protection des Données
        </h1>
        <p className="text-xs text-stone-500">
          En application de la Loi n° 2008-12 du 25 janvier 2008 portant sur la protection des données à caractère personnel
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6 text-sm text-stone-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="font-bold text-base text-stone-900">1. Engagement de confidentialité</h2>
          <p>
            Boutika s'engage formellement à respecter la vie privée des commerçants ainsi que celle de leurs clients finaux. Les données collectées ne sont ni vendues, ni louées, ni cédées à des tiers publicitaires.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-base text-stone-900">2. Données collectées</h2>
          <p>Dans le cadre de l’exploitation des boutiques, seules les données strictement indispensables sont traitées :</p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-stone-600">
            <li><strong>Pour le vendeur :</strong> nom complet, adresse email de gestion, numéro WhatsApp professionnel, nom de boutique et localisation géographique.</li>
            <li><strong>Pour le client final :</strong> nom de contact, numéro de téléphone (pour livraison et WhatsApp), adresse et quartier de livraison.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-base text-stone-900">3. Données financières et bancaires</h2>
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 font-medium">
            <strong>Règle de sécurité stricte :</strong> Boutika ne stocke aucun numéro de carte bancaire, code secret ou identifiant Wave / Orange Money. Les paiements futurs sont exécutés via les APIs sécurisées des passerelles agréées par la BCEAO.
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-base text-stone-900">4. Exercice de vos droits</h2>
          <p>
            Conformément à la législation sénégalaise, toute personne dispose d'un droit d'accès, de rectification et d'effacement de ses données personnelles en formulant une demande écrite à : <strong>dpo@boutika.sn</strong>.
          </p>
        </section>
      </div>
    </div>
  );
};

export const LegalTermsPage: React.FC = () => {
  const { setCurrentView } = useApp();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <button
        onClick={() => setCurrentView('home')}
        className="flex items-center gap-2 text-xs font-bold text-amber-700 hover:text-amber-800"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Retour à l'accueil</span>
      </button>

      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
          Contrat d'utilisation
        </span>
        <h1 className="font-heading font-black text-3xl sm:text-4xl text-stone-900">
          Conditions Générales d'Utilisation (CGU)
        </h1>
        <p className="text-xs text-stone-500">
          Règles de fonctionnement de la plateforme pour vendeurs et visiteurs
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6 text-sm text-stone-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="font-bold text-base text-stone-900">1. Objet du contrat</h2>
          <p>
            Les présentes Conditions Générales ont pour objet de définir les modalités de mise à disposition des services de Boutika au profit des commerçants créateurs de boutiques et des acheteurs consultant les vitrines.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-base text-stone-900">2. Responsabilité du contenu des boutiques</h2>
          <p>
            Chaque vendeur est légalement et exclusivement responsable des produits qu'il met en vente, des descriptions fournies, du respect des droits de propriété intellectuelle et de l'exécution effective des livraisons promises.
          </p>
          <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-950 font-medium">
            <strong>Articles formellement interdits :</strong> Sont rigoureusement prohibés sur Boutika : les substances illicites, contrefaçons manifestes, armes, produits dangereux, médicaments sans autorisation des autorités sénégalaises et tout contenu attentatoire aux bonnes mœurs.
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-base text-stone-900">3. Modération et suspension</h2>
          <p>
            Boutika se réserve le droit de suspendre sans préavis toute boutique ne respectant pas les règles légales ou faisant l'objet de signalements avérés pour escroquerie ou manquement grave.
          </p>
        </section>
      </div>
    </div>
  );
};
