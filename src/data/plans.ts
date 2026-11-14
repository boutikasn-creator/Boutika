import type { SubscriptionPlan } from '../types';

/**
 * SOURCE UNIQUE des formules Boutika.
 * Toutes les pages (accueil, tarifs, inscription, tableau de bord, écran de blocage)
 * lisent ces données via le contexte : plus aucun prix écrit en dur ailleurs.
 *
 * AUCUNE formule n'est gratuite. Seul l'essai de 3 jours (une seule fois par vendeur) est offert.
 * Tarif annuel = 10 mois payés sur 12 (2 mois offerts).
 *
 * Les fonctionnalités pas encore développées portent la mention "(bientôt disponible)" :
 * elles sont annoncées honnêtement, partout où la liste est affichée.
 */
export const TRIAL_DAYS = 3;

export const BUSINESS_TYPES: string[] = [
  'Mode & habillement',
  'Pâtisserie & restauration',
  'Beauté & cosmétiques',
  'Bijoux & accessoires',
  'Artisanat & wax',
  'Maison & décoration',
  'Électronique & téléphonie',
  'Alimentation & épicerie',
  'Santé & bien-être',
  'Autre'
];

export const SENEGAL_CITIES: string[] = [
  'Dakar',
  'Pikine',
  'Guédiawaye',
  'Rufisque',
  'Thiès',
  'Mbour',
  'Saint-Louis',
  'Touba',
  'Kaolack',
  'Ziguinchor',
  'Autre'
];

export const INITIAL_PLANS: SubscriptionPlan[] = [
  {
    id: 'standard',
    name: 'Standard',
    tagline: 'Pour lancer votre boutique et recevoir vos commandes sur WhatsApp',
    priceMonthly: 5000,
    priceYearly: 50000,
    maxProducts: 50,
    features: [
      'Jusqu’à 50 produits',
      'Logo et informations de votre boutique',
      'Lien de boutique à copier et partager',
      'Commande du client envoyée sur votre WhatsApp',
      'Agent IA : publie le lien de votre boutique toutes les 24 h sur 1 réseau social (bientôt disponible)',
      '0 % de commission sur vos ventes'
    ],
    commissionRate: 0,
    customDomainAllowed: false,
    prioritySupport: false,
    hasWhatsAppCheckout: true,
    hasAdvancedCheckout: false,
    hasManualSocialShare: false,
    hasAiAnalytics: false,
    hasVipAiAssistant: false
  },
  {
    id: 'premium',
    name: 'Premium',
    tagline: 'Pour développer vos ventes avec le panier complet et le bilan de vos ventes',
    priceMonthly: 12500,
    priceYearly: 125000,
    maxProducts: 150,
    popular: true,
    features: [
      'Jusqu’à 150 produits',
      'Logo et informations de votre boutique',
      'Boutons de partage vers vos réseaux sociaux (WhatsApp, Facebook, Instagram...)',
      'Bilan de vos ventes : total des ventes, ruptures de stock, produits les plus et les moins vendus',
      'Commande complète : choix du paiement, de la livraison et informations du client',
      'Notification de chaque nouvelle commande dans votre tableau de bord',
      'Agent IA : publie le lien de votre boutique toutes les 24 h sur 2 réseaux sociaux (bientôt disponible)',
      '0 % de commission sur vos ventes'
    ],
    commissionRate: 0,
    customDomainAllowed: false,
    prioritySupport: false,
    hasWhatsAppCheckout: true,
    hasAdvancedCheckout: true,
    hasManualSocialShare: true,
    hasAiAnalytics: true,
    hasVipAiAssistant: false
  },
  {
    id: 'vip',
    name: 'VIP',
    tagline: 'L’offre complète : conseils de vente, IA et mise en avant auprès des acheteurs',
    priceMonthly: 25500,
    priceYearly: 255000,
    maxProducts: 500,
    features: [
      'Jusqu’à 500 produits',
      'Boutons de partage vers tous vos réseaux sociaux',
      'Bilan de vos ventes et conseils de vente personnalisés',
      'Description, tailles et prix suggérés par l’IA quand vous ajoutez un produit',
      'Mise en avant de votre boutique auprès des acheteurs (Marketplace)',
      'Commande complète et notifications de commande',
      'Agent IA : publie le lien de votre boutique toutes les 24 h sur tous vos réseaux (bientôt disponible)',
      'Scan d’un produit : l’IA le décrit et l’ajoute pour vous (bientôt disponible)',
      'Discussion directe avec votre agent IA, qui gère votre tableau de bord (bientôt disponible)',
      '0 % de commission sur vos ventes'
    ],
    commissionRate: 0,
    customDomainAllowed: true,
    prioritySupport: true,
    hasWhatsAppCheckout: true,
    hasAdvancedCheckout: true,
    hasManualSocialShare: true,
    hasAiAnalytics: true,
    hasVipAiAssistant: true
  }
];
