import { 
  Store, 
  Product, 
  Order, 
  SubscriptionPlan, 
  SubscriptionRecord, 
  ContactMessage, 
  AuditLog, 
  UserProfile 
} from '../types';

export const INITIAL_PLANS: SubscriptionPlan[] = [
  {
    id: 'standard',
    name: 'Formule Standard',
    tagline: 'L’essentiel pour vendre en ligne simplement et recevoir vos commandes sur WhatsApp.',
    priceMonthly: 0,
    priceYearly: 0,
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
      'Jusqu’à 50 produits avec variantes (tailles & couleurs)',
      'Lien de boutique personnalisable (boutika.sn/v/nom)',
      'Copie manuelle de lien & partage direct',
      'Parcours de commande WhatsApp formaté en 1-clic',
      'Gestion des stocks par variante et alertes',
      'Calcul automatique des frais de livraison (Dakar & Régions)',
      'Formule gratuite en permanence sans limite de durée',
      'Zéro commission sur vos ventes'
    ]
  },
  {
    id: 'premium',
    name: 'Formule Premium',
    tagline: 'Pour les commerçants dynamiques voulant un panier complet et des analyses par IA.',
    priceMonthly: 7500, // 7 500 FCFA / mois (~11.50 €)
    priceYearly: 75000,
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
      'Jusqu’à 150 produits avec variantes et stocks dédiés',
      'Boutons de partage manuel vers réseaux sociaux (WhatsApp, Facebook, X, etc.)',
      'Formulaire de commande avancé multi-étapes',
      'Sélection du mode de paiement (Wave, Orange Money, Espèces)',
      'Analyses commerciales assistées par IA (meilleures ventes, ruptures)',
      'Gestionnaire des commandes et statuts de livraison',
      'Frais de livraison par zone personnalisables',
      'Assistance prioritaire 6j/7',
      'Essai gratuit de 3 jours sans engagement'
    ]
  },
  {
    id: 'vip',
    name: 'Formule VIP',
    tagline: 'L’expérience ultime avec l’assistant IA VIP Kimsi, analyse photo et catalogue étendu jusqu’à 500 produits.',
    priceMonthly: 19000, // 19 000 FCFA / mois (~29 €)
    priceYearly: 190000,
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
      'Jusqu’à 500 produits dans votre catalogue',
      'Assistant IA VIP dédié pour la création automatique de fiches',
      'Analyse intelligente de photos d’articles (titre, descriptif & variantes)',
      'Génération instantanée de descriptions & recommandations de prix',
      'Toutes les fonctionnalités de la formule Premium incluses',
      'Analyses commerciales prédictives et stratégie de vente',
      'Mise en avant prioritaire sur la Marketplace Boutika',
      'Conseiller e-commerce dédié et support VIP 7j/7',
      'Essai gratuit de 3 jours sans engagement'
    ]
  }
];

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'usr-vendor-1',
    email: 'fatou.diop@terangawax.sn',
    fullName: 'Fatou Diop',
    phone: '+221 77 654 32 10',
    role: 'vendor',
    storeId: 'store-teranga-wax',
    createdAt: '2026-08-15T10:00:00Z'
  },
  {
    id: 'usr-admin-1',
    email: 'admin.super@boutika.sn',
    fullName: 'Amadou Seck (Super Admin)',
    phone: '+221 78 111 22 33',
    role: 'super_admin',
    createdAt: '2026-06-01T08:00:00Z'
  },
  {
    id: 'usr-visitor-demo',
    email: 'visiteur@demo.sn',
    fullName: 'Aïssatou Diallo (Acheteuse)',
    phone: '+221 76 999 88 77',
    role: 'visitor',
    createdAt: '2026-10-20T12:00:00Z'
  }
];

export const INITIAL_STORES: Store[] = [
  {
    id: 'store-teranga-wax',
    vendorId: 'usr-vendor-1',
    name: 'Teranga Wax & Créations',
    slug: 'teranga-wax',
    description: 'Boutique artisanale dakaroise de prêt-à-porter en wax authentique, boubous modernes, accessoires et sacs faits main au Sénégal.',
    whatsappNumber: '221776543210',
    phone: '+221 77 654 32 10',
    email: 'contact@terangawax.sn',
    address: 'Rue 14 angle Boulevard Dial Diop, Médina',
    city: 'Dakar',
    logoUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=400&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80',
    categories: ['Mode & Wax', 'Boubous & Robes', 'Chemises Hommes', 'Accessoires & Sacs'],
    deliveryZones: [
      { id: 'zone-1', name: 'Dakar Centre & Plateau (Médina, Fann, Point E)', price: 1500, estimatedTime: 'Livraison 24h' },
      { id: 'zone-2', name: 'Zone Nord & Almadies (Mermoz, Ouakam, Ngor, Yoff)', price: 2000, estimatedTime: 'Livraison 24h' },
      { id: 'zone-3', name: 'Banlieue Dakaroise (Pikine, Guédiawaye, Rufisque)', price: 2500, estimatedTime: 'Livraison 24h-48h' },
      { id: 'zone-4', name: 'Régions (Thiès, Mbour, Saint-Louis, Kaolack via GP)', price: 4000, estimatedTime: '2 à 3 jours ouvrés' }
    ],
    status: 'active',
    planId: 'vip',
    createdAt: '2026-08-15T10:30:00Z',
    isFoundingStore: true,
    foundingOrder: 1,
    promotionActive: true,
    promotionBadge: 'Boutique Fondatrice #1',
    isVipPromoted: true,
    vipPromotionOrder: 1
  },
  {
    id: 'store-keur-thiouraye',
    vendorId: 'usr-vendor-2',
    name: 'Keur Thiouraye & Senteurs',
    slug: 'keur-thiouraye',
    description: 'Senteurs traditionnelles du Sénégal, encens Thiouraye raffinés faits selon les recettes ancestrales, huiles essentielles et diffuseurs.',
    whatsappNumber: '221772223344',
    phone: '+221 77 222 33 44',
    email: 'senteurs@keurthiouraye.sn',
    address: 'Cité Keur Gorgui',
    city: 'Dakar',
    logoUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=400&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
    categories: ['Beauté & Senteurs', 'Thiouraye Gowe', 'Encens Précieux', 'Paniers Cadeaux'],
    deliveryZones: [
      { id: 'z-dkr', name: 'Tout Dakar Intra-Muros', price: 2000, estimatedTime: 'Jour même ou 24h' },
      { id: 'z-reg', name: 'Envoi Régions & International', price: 5000, estimatedTime: '2 à 5 jours' }
    ],
    status: 'active',
    planId: 'standard',
    createdAt: '2026-09-01T14:00:00Z',
    isFoundingStore: true,
    foundingOrder: 2,
    promotionActive: true,
    promotionBadge: 'Boutique Fondatrice #2'
  },
  {
    id: 'store-dakar-tech',
    vendorId: 'usr-vendor-3',
    name: 'Dakar Mobile & Gadgets',
    slug: 'dakar-tech',
    description: 'Accessoires pour smartphones, chargeurs rapides certifiés, écouteurs sans fil, supports voiture et gadgets high-tech garantis.',
    whatsappNumber: '221783334455',
    phone: '+221 78 333 44 55',
    email: 'ventes@dakartech.sn',
    address: 'Avenue Lamine Guèye, Plateau',
    city: 'Dakar',
    logoUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
    categories: ['High-Tech & Électronique', 'Écouteurs & Audio', 'Câbles & Chargeurs', 'Smartwatches'],
    deliveryZones: [
      { id: 'z-dkr-express', name: 'Dakar Express 3h', price: 2500, estimatedTime: 'En 3 heures chrono' },
      { id: 'z-dkr-std', name: 'Dakar Standard', price: 1500, estimatedTime: '24h' }
    ],
    status: 'active',
    planId: 'premium',
    createdAt: '2026-07-20T09:15:00Z',
    isFoundingStore: true,
    foundingOrder: 3,
    promotionActive: true,
    promotionBadge: 'Boutique Fondatrice #3'
  },
  {
    id: 'store-saveurs-baobab',
    vendorId: 'usr-vendor-4',
    name: 'Saveurs du Baobab & Épicerie Fine',
    slug: 'saveurs-baobab',
    description: 'Produits du terroir sénégalais : poudre de pain de singe (bouye), bissap bio séché, miel de Casamance pur, kinkeliba et confitures artisanales.',
    whatsappNumber: '221775556677',
    phone: '+221 77 555 66 77',
    email: 'contact@saveursbaobab.sn',
    address: 'Place du Souvenir, Fann Résidence',
    city: 'Dakar',
    logoUrl: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=400&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
    categories: ['Alimentation & Épicerie', 'Jus & Sirops Bio', 'Miels du Terroir', 'Tisanes & Kinkeliba'],
    deliveryZones: [
      { id: 'z-dkr', name: 'Livraison Dakar 24h', price: 1500, estimatedTime: '24h' },
      { id: 'z-reg', name: 'Envoi Régions Thiès/Mbour', price: 3000, estimatedTime: '48h' }
    ],
    status: 'active',
    planId: 'premium',
    createdAt: '2026-08-01T12:00:00Z',
    isFoundingStore: true,
    foundingOrder: 4,
    promotionActive: true,
    promotionBadge: 'Boutique Fondatrice #4'
  },
  {
    id: 'store-bijoux-goree',
    vendorId: 'usr-vendor-5',
    name: 'Bijoux & Orfèvrerie Gorée',
    slug: 'bijoux-goree',
    description: 'Créations de haute bijouterie artisanale : filigrane d’argent sénégalais, parures en bronze doré, perles de verre soufflé et bagues gravées.',
    whatsappNumber: '221764448899',
    phone: '+221 76 444 88 99',
    email: 'bijoux@goreecreation.sn',
    address: 'Rue Saint-Germain, Île de Gorée',
    city: 'Dakar',
    logoUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=400&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1200&q=80',
    categories: ['Artisanat & Bijoux', 'Filigrane Argent', 'Colliers & Parures', 'Bracelets Jonc'],
    deliveryZones: [
      { id: 'z-goree-dkr', name: 'Livraison Sécurisée Dakar', price: 2500, estimatedTime: '24h contre signature' },
      { id: 'z-intl', name: 'Envoi Express International', price: 12000, estimatedTime: '3 à 5 jours DHL' }
    ],
    status: 'active',
    planId: 'vip',
    createdAt: '2026-08-10T16:00:00Z',
    isFoundingStore: true,
    foundingOrder: 5,
    promotionActive: true,
    promotionBadge: 'Boutique Fondatrice #5',
    isVipPromoted: true,
    vipPromotionOrder: 2
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    storeId: 'store-teranga-wax',
    name: 'Ensemble Boubou Moderne Wax Royal',
    description: 'Ensemble raffiné deux pièces en tissu wax hollandais véritable avec finitions brodées au col. Idéal pour les vendredis, cérémonies et sorties élégantes.',
    price: 25000,
    compareAtPrice: 30000,
    category: 'Mode & Wax',
    images: [
      'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80'
    ],
    stock: 14,
    isActive: true,
    isAvailable: true,
    isFeatured: true,
    sku: 'TW-BOUB-01',
    sizes: ['M', 'L', 'XL', 'XXL'],
    colors: ['Indigo Wax', 'Jaune Soleil', 'Vert Teranga'],
    variants: [
      { id: 'v-1a', sku: 'TW-BOUB-01-M-IND', size: 'M', color: 'Indigo Wax', stock: 4 },
      { id: 'v-1b', sku: 'TW-BOUB-01-L-IND', size: 'L', color: 'Indigo Wax', stock: 5 },
      { id: 'v-1c', sku: 'TW-BOUB-01-XL-JAU', size: 'XL', color: 'Jaune Soleil', stock: 3 },
      { id: 'v-1d', sku: 'TW-BOUB-01-XXL-VER', size: 'XXL', color: 'Vert Teranga', stock: 2 }
    ],
    createdAt: '2026-09-10T11:00:00Z'
  },
  {
    id: 'prod-2',
    storeId: 'store-teranga-wax',
    name: 'Robe Évasée Coton & Motifs Africains',
    description: 'Robe d’été légère et fluide, coupe cintrée à la taille avec poches latérales discrètes. Tissu respirant 100% coton lavable en machine.',
    price: 18500,
    compareAtPrice: 22000,
    category: 'Mode & Wax',
    images: [
      'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=800&q=80'
    ],
    stock: 8,
    isActive: true,
    isAvailable: true,
    isFeatured: true,
    sku: 'TW-ROB-02',
    sizes: ['S', 'M', 'L'],
    colors: ['Ocre & Bleu', 'Corail Pastel'],
    variants: [
      { id: 'v-2a', sku: 'TW-ROB-02-S-OCR', size: 'S', color: 'Ocre & Bleu', stock: 2 },
      { id: 'v-2b', sku: 'TW-ROB-02-M-OCR', size: 'M', color: 'Ocre & Bleu', stock: 4 },
      { id: 'v-2c', sku: 'TW-ROB-02-L-COR', size: 'L', color: 'Corail Pastel', stock: 2 }
    ],
    createdAt: '2026-09-12T14:30:00Z'
  },
  {
    id: 'prod-3',
    storeId: 'store-teranga-wax',
    name: 'Sac Cabas Cuir & Tissu Tissé Manjak',
    description: 'Pièce artisanale confectionnée à la main par des artisans sénégalais. Alliance de cuir de zébu souple et de tissu traditionnel Manjak tissé au métier traditionnel.',
    price: 22000,
    compareAtPrice: 26000,
    category: 'Mode & Wax',
    images: [
      'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80'
    ],
    stock: 5,
    isActive: true,
    isAvailable: true,
    isFeatured: true,
    sku: 'TW-CAB-03',
    colors: ['Cuir Caramel & Noir', 'Cuir Chocolat & Blanc'],
    variants: [
      { id: 'v-3a', sku: 'TW-CAB-03-CAR', color: 'Cuir Caramel & Noir', stock: 3 },
      { id: 'v-3b', sku: 'TW-CAB-03-CHO', color: 'Cuir Chocolat & Blanc', stock: 2 }
    ],
    createdAt: '2026-09-15T09:00:00Z'
  },
  {
    id: 'prod-4',
    storeId: 'store-keur-thiouraye',
    name: 'Thiouraye Gowe Royal Parfumé',
    description: 'Encens traditionnel d’exception à base de graines de gowe marinées dans des essences rares de musc blanc, de rose et d’ambre noir pendant 12 mois.',
    price: 8000,
    category: 'Beauté & Senteurs',
    images: [
      'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80'
    ],
    stock: 25,
    isActive: true,
    isAvailable: true,
    isFeatured: true,
    sku: 'KT-GOWE-01',
    sizes: ['Pot 100g', 'Pot 250g', 'Coffret Prestige 500g'],
    variants: [
      { id: 'v-4a', sku: 'KT-GOWE-100G', size: 'Pot 100g', stock: 15, priceDelta: 0 },
      { id: 'v-4b', sku: 'KT-GOWE-250G', size: 'Pot 250g', stock: 7, priceDelta: 7000 },
      { id: 'v-4c', sku: 'KT-GOWE-500G', size: 'Coffret Prestige 500g', stock: 3, priceDelta: 16000 }
    ],
    createdAt: '2026-09-20T10:00:00Z'
  },
  {
    id: 'prod-5',
    storeId: 'store-dakar-tech',
    name: 'Écouteurs Sans Fil Téranga Bass Pro ANC',
    description: 'Écouteurs intra-auriculaires Bluetooth 5.3 avec réduction active de bruit (-35dB), autonomie de 28 heures avec boîtier, résistants à la transpiration.',
    price: 15000,
    compareAtPrice: 19500,
    category: 'High-Tech & Électronique',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'
    ],
    stock: 12,
    isActive: true,
    isAvailable: true,
    isFeatured: true,
    sku: 'DT-EAR-01',
    colors: ['Noir Mat', 'Blanc Perle', 'Bleu Nuit'],
    variants: [
      { id: 'v-5a', sku: 'DT-EAR-01-NOIR', color: 'Noir Mat', stock: 6 },
      { id: 'v-5b', sku: 'DT-EAR-01-BLC', color: 'Blanc Perle', stock: 4 },
      { id: 'v-5c', sku: 'DT-EAR-01-BLU', color: 'Bleu Nuit', stock: 2 }
    ],
    createdAt: '2026-09-22T15:00:00Z'
  },
  {
    id: 'prod-6',
    storeId: 'store-saveurs-baobab',
    name: 'Pack Découverte Terroir du Sénégal',
    description: 'Coffret 4 trésors : 1x Poudre de Bouye bio (200g), 1x Bissap rouge pur (250g), 1x Miel de mangrove de Casamance (250g) et 1x Tisane Kinkeliba.',
    price: 12500,
    compareAtPrice: 15000,
    category: 'Alimentation & Épicerie',
    images: [
      'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80'
    ],
    stock: 18,
    isActive: true,
    isAvailable: true,
    isFeatured: true,
    sku: 'SB-PACK-01',
    createdAt: '2026-09-25T11:00:00Z'
  },
  {
    id: 'prod-7',
    storeId: 'store-bijoux-goree',
    name: 'Collier Pendentif Filigrane Goréen Argent 925',
    description: 'Pendentif en forme de cœur stylisé façonné en filigrane d’argent massif par les maîtres bijoutiers de Gorée. Livré dans un écrin de velours avec certificat.',
    price: 28000,
    compareAtPrice: 32000,
    category: 'Artisanat & Bijoux',
    images: [
      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80'
    ],
    stock: 6,
    isActive: true,
    isAvailable: true,
    isFeatured: true,
    sku: 'BG-COL-01',
    createdAt: '2026-09-28T14:00:00Z'
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-1001',
    orderNumber: 'CMD-SN-2601',
    storeId: 'store-teranga-wax',
    customerName: 'Awa Ndiaye',
    customerPhone: '+221 77 412 89 65',
    customerEmail: 'awa.ndiaye@gmail.com',
    customerCity: 'Dakar',
    deliveryAddress: 'Cité Keur Gorgui, Immeuble Horizon 3e étage',
    deliveryZone: 'Dakar Centre & Plateau',
    deliveryFee: 1500,
    items: [
      {
        productId: 'prod-1',
        productName: 'Ensemble Boubou Moderne Wax Royal',
        price: 25000,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=800&q=80',
        selectedSize: 'L',
        selectedColor: 'Indigo Wax'
      }
    ],
    subtotal: 25000,
    total: 26500,
    status: 'en_preparation',
    paymentMethod: 'wave',
    paymentStatus: 'paye',
    notes: 'Livraison souhaitée avant 14h. Appeler dès arrivée au portail.',
    createdAt: '2026-10-23T14:15:00Z'
  },
  {
    id: 'ord-1002',
    orderNumber: 'CMD-SN-2602',
    storeId: 'store-teranga-wax',
    customerName: 'Mamadou Ba',
    customerPhone: '+221 78 520 11 44',
    customerCity: 'Thiès',
    deliveryAddress: 'Quartier Dixième, près de la pharmacie du Rail',
    deliveryZone: 'Régions (Thiès, Mbour via GP)',
    deliveryFee: 4000,
    items: [
      {
        productId: 'prod-2',
        productName: 'Robe Évasée Coton & Motifs Africains',
        price: 18500,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=800&q=80',
        selectedSize: 'M',
        selectedColor: 'Ocre & Bleu'
      }
    ],
    subtotal: 18500,
    total: 22500,
    status: 'livree',
    paymentMethod: 'orange_money',
    paymentStatus: 'paye',
    notes: 'Livré via GP Express Thiès.',
    createdAt: '2026-10-18T11:00:00Z'
  }
];

export const INITIAL_SUBSCRIPTION_RECORDS: SubscriptionRecord[] = [
  {
    id: 'sub-rec-01',
    storeId: 'store-teranga-wax',
    storeName: 'Teranga Wax & Créations',
    planId: 'vip',
    planName: 'Formule VIP',
    amount: 19000,
    currency: 'XOF',
    status: 'active',
    paymentGateway: 'Wave',
    transactionRef: 'WAVE-SN-TX-884210',
    validUntil: '2026-11-15T10:00:00Z',
    createdAt: '2026-10-15T10:00:00Z'
  },
  {
    id: 'sub-rec-02',
    storeId: 'store-dakar-tech',
    storeName: 'Dakar Mobile & Gadgets',
    planId: 'premium',
    planName: 'Formule Premium',
    amount: 7500,
    currency: 'XOF',
    status: 'active',
    paymentGateway: 'Orange Money',
    transactionRef: 'OM-SN-TX-990142',
    validUntil: '2026-11-01T09:15:00Z',
    createdAt: '2026-10-01T09:15:00Z'
  },
  {
    id: 'sub-rec-03',
    storeId: 'store-keur-thiouraye',
    storeName: 'Keur Thiouraye & Senteurs',
    planId: 'standard',
    planName: 'Formule Standard',
    amount: 0,
    currency: 'XOF',
    status: 'active',
    paymentGateway: 'Gratuit',
    validUntil: '2027-09-01T14:00:00Z',
    createdAt: '2026-09-01T14:00:00Z'
  }
];

export const INITIAL_CONTACT_MESSAGES: ContactMessage[] = [
  {
    id: 'msg-01',
    senderName: 'Ousmane Fall',
    senderEmail: 'ousmane.fall@commerce-sandaga.sn',
    senderPhone: '+221 77 123 45 67',
    subject: 'Intégration d’une boutique physique à Sandaga',
    message: 'Bonjour l’équipe Boutika, j’ai une boutique de chaussures au marché Sandaga et je vends déjà beaucoup sur statut WhatsApp. Comment puis-je synchroniser mes 500 paires et former mes 2 apprentis vendeurs ?',
    status: 'nouveau',
    priority: 'urgente',
    createdAt: '2026-10-23T11:20:00Z'
  },
  {
    id: 'msg-02',
    senderName: 'Sokhna Ndao',
    senderEmail: 'sokhna.ndao@gmail.com',
    senderPhone: '+221 70 888 44 22',
    subject: 'Question sur les frais Wave et Orange Money',
    message: 'Bonjour, est-ce que les commissions des paiements Wave sont prélevées par Boutika ou directement par l’opérateur ? Merci d’avance pour la précision.',
    status: 'traite',
    priority: 'normale',
    adminReply: 'Bonjour Mme Ndao. Boutika applique 0% de commission sur vos ventes. Les seuls frais sont les frais d’opérateur usuels (1% chez Wave / OM) perçus directement par l’opérateur.',
    repliedAt: '2026-10-22T17:10:00Z',
    createdAt: '2026-10-22T16:45:00Z'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-01',
    timestamp: '2026-10-23T15:40:12Z',
    actorEmail: 'admin.super@boutika.sn',
    actorRole: 'super_admin',
    action: 'STORE_STATUS_CHECK',
    target: 'store-teranga-wax',
    details: 'Vérification de conformité KYC et validation des coordonnées marchandes.',
    ipAddress: '196.207.240.12',
    severity: 'info'
  },
  {
    id: 'aud-02',
    timestamp: '2026-10-23T09:12:00Z',
    actorEmail: 'system.worker@boutika.internal',
    actorRole: 'super_admin',
    action: 'WEBHOOK_PAYMENT_VERIFIED',
    target: 'sub-rec-01',
    details: 'Signature HMAC Wave validée côté serveur (Idempotency Key: wave_event_884210). Abonnement VIP prolongé de 30 jours.',
    ipAddress: '54.217.18.99',
    severity: 'info'
  },
  {
    id: 'aud-03',
    timestamp: '2026-10-22T18:04:30Z',
    actorEmail: 'fatou.diop@terangawax.sn',
    actorRole: 'vendor',
    action: 'PRODUCT_PRICE_UPDATED',
    target: 'prod-1',
    details: 'Modification du prix : 25 000 FCFA (Ancien: 28 000 FCFA)',
    ipAddress: '197.234.221.4',
    severity: 'info'
  },
  {
    id: 'aud-04',
    timestamp: '2026-10-21T14:22:10Z',
    actorEmail: 'admin.super@boutika.sn',
    actorRole: 'super_admin',
    action: 'SECURITY_ROLE_VERIFICATION',
    target: 'usr-admin-1',
    details: 'Attribution du rôle Super Admin confirmée exclusivement par token serveur sécurisé.',
    ipAddress: '196.207.240.12',
    severity: 'warning'
  }
];
