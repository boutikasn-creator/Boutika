import type { SubscriptionPlan } from '../types';

/**
 * SOURCE UNIQUE DES FORMULES BOUTIKA.
 * Toutes les pages (accueil, tarifs, inscription, tableau de bord, blocage d'accès) lisent ces données
 * via le contexte (`plans`). Aucune formule gratuite : les trois formules sont payantes,
 * avec 3 jours d'essai offerts une seule fois par vendeur.
 *
 * Prix mensuels : Standard 5 000 FCFA, Premium 12 500 FCFA, VIP 25 500 FCFA.
 * priceYearly est conservé pour compatibilité (12 mois avec 15 % de remise) mais la facturation annuelle
 * n'est pas proposée pour l'instant : l'activation d'une formule couvre 30 jours.
 *
 * Les fonctionnalités « bientôt disponible » sont annoncées comme telles : elles ne sont pas encore développées.
 */
export const TRIAL_DAYS = 3;

export const INITIAL_PLANS: SubscriptionPlan[] = [
  {
    id: 'standard',
    name: 'Formule Standard',
    tagline: 'L’essentiel pour vendre en ligne simplement et recevoir vos commandes sur WhatsApp.',
    priceMonthly: 5000,
    priceYearly: 51000,
    maxProducts: 50,
    commissionRate: 0,
    customDomainAllowed: false,
    prioritySupport: false,
    hasWhatsAppCheckout: true,
    hasAdvancedCheckout: false,
    hasManualSocialShare: false,
    hasAiAnalytics: false,
    hasVipAiAssistant: false,
    features: [
      'Jusqu’à 50 produits avec variantes (tailles, couleurs, quantités)',
      'Logo, description et informations de votre boutique',
      'Lien de boutique à copier et partager (boutika.sn/v/nom)',
      'Commande du client envoyée directement sur votre WhatsApp',
      'Gestion des stocks et alertes de stock faible',
      'Calcul des frais de livraison par zone',
      'Agent IA : publication de votre lien toutes les 24 h sur 1 réseau social (bientôt disponible)',
      'Zéro commission sur vos ventes',
      '3 jours d’essai offerts (une seule fois)'
    ]
  },
  {
    id: 'premium',
    name: 'Formule Premium',
    tagline: 'Pour les commerçants dynamiques : commande complète, partage direct et assistant de gestion.',
    priceMonthly: 12500,
    priceYearly: 127500,
    maxProducts: 150,
    commissionRate: 0,
    customDomainAllowed: true,
    prioritySupport: true,
    popular: true,
    hasWhatsAppCheckout: true,
    hasAdvancedCheckout: true,
    hasManualSocialShare: true,
    hasAiAnalytics: true,
    hasVipAiAssistant: false,
    features: [
      'Jusqu’à 150 produits avec variantes (tailles, couleurs, quantités)',
      'Boutons de partage direct vers vos réseaux sociaux (Facebook, Instagram, WhatsApp…)',
      'Parcours de commande complet : moyen de paiement, livraison et coordonnées du client',
      'Notification de chaque nouvelle commande',
      'Agent IA : publication de votre lien toutes les 24 h sur 2 réseaux sociaux (bientôt disponible)',
      'Assistant IA comptabilité : total des ventes, ruptures, meilleurs et moins bons produits (bientôt disponible)',
      'Assistance prioritaire 6j/7',
      'Zéro commission sur vos ventes',
      '3 jours d’essai offerts (une seule fois)'
    ]
  },
  {
    id: 'vip',
    name: 'Formule VIP',
    tagline: 'L’expérience complète : catalogue étendu, assistant IA avancé et mise en avant sur la Marketplace.',
    priceMonthly: 25500,
    priceYearly: 260100,
    maxProducts: 500,
    commissionRate: 0,
    customDomainAllowed: true,
    prioritySupport: true,
    hasWhatsAppCheckout: true,
    hasAdvancedCheckout: true,
    hasManualSocialShare: true,
    hasAiAnalytics: true,
    hasVipAiAssistant: true,
    features: [
      'Jusqu’à 500 produits avec variantes (tailles, couleurs, quantités)',
      'Toutes les fonctionnalités de la formule Premium',
      'Génération IA de la description, des tailles et du prix conseillé de vos produits',
      'Agent IA : publication de votre lien toutes les 24 h sur tous vos réseaux sociaux (bientôt disponible)',
      'Assistant IA avancé : stratégies de vente, gestion de votre tableau de bord et de vos produits (bientôt disponible)',
      'Scan d’un produit par photo : fiche créée automatiquement par l’IA (bientôt disponible)',
      'Discussion avec l’IA depuis votre tableau de bord (bientôt disponible)',
      'Mise en avant de votre boutique sur la Marketplace Boutika',
      'Support VIP 7j/7',
      '3 jours d’essai offerts (une seule fois)'
    ]
  }
];
