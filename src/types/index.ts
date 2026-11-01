export type UserRole = 'visitor' | 'vendor' | 'super_admin';

export type AuthStatus = 
  | 'loading' 
  | 'unauthenticated' 
  | 'connected_no_profile' 
  | 'connected_no_store' 
  | 'ready';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  createdAt: string;
  storeId?: string;
}

export interface StoreCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

export interface ProductVariant {
  id: string;
  sku?: string;
  size?: string; // e.g. "S", "M", "L", "XL", "42", "44", etc.
  color?: string; // e.g. "Indigo Wax", "Ocre", "Blanc", "Noir"
  stock: number;
  priceDelta?: number; // difference from base price in FCFA
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: number; // in FCFA (XOF)
  compareAtPrice?: number; // old price for discount in FCFA
  category: string;
  images: string[];
  stock: number;
  isActive: boolean;
  isAvailable?: boolean;
  isFeatured?: boolean;
  sku?: string;
  colors?: string[];
  sizes?: string[];
  variants?: ProductVariant[];
  createdAt: string;
}

export type OrderStatus = 'nouvelle' | 'en_preparation' | 'expediee' | 'livree' | 'annulee';

export type PaymentMethod = 'especes_livraison' | 'wave' | 'orange_money' | 'carte_bancaire';

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  image?: string;
  variantId?: string;
  selectedSize?: string;
  selectedColor?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  storeId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerCity: string;
  deliveryAddress: string;
  deliveryZone: string;
  deliveryFee: number;
  items: OrderItem[];
  subtotal: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: 'en_attente' | 'paye' | 'echec';
  notes?: string;
  createdAt: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  price: number; // in FCFA
  estimatedTime: string;
}

export type PlanTierId = 'standard' | 'premium' | 'vip' | 'decouverte' | 'pro' | 'business';

export interface Store {
  id: string;
  vendorId: string;
  name: string;
  slug: string; // e.g. "dakar-wax" -> boutika.sn/v/dakar-wax
  description: string;
  whatsappNumber: string; // international format without spaces, e.g. "221771234567"
  phone: string;
  email: string;
  address: string;
  city: string;
  logoUrl: string;
  bannerUrl: string;
  categories: string[];
  deliveryZones: DeliveryZone[];
  status: 'active' | 'en_attente' | 'suspendue';
  suspensionReason?: string;
  planId: PlanTierId;
  createdAt: string;
  // Free trial tracking (3-day trial)
  trialStartDate?: string;
  trialEndDate?: string;
  trialActive?: boolean;
  trialExpired?: boolean;
  trialUsed?: boolean;
  // Founding stores & promotions
  isFoundingStore?: boolean;
  foundingOrder?: number; // 1 to 5
  promotionActive?: boolean;
  promotionStartDate?: string;
  promotionEndDate?: string;
  promotionBadge?: string;
  // VIP promoted spotlight
  isVipPromoted?: boolean;
  vipPromotionOrder?: number;
}

export interface SubscriptionPlan {
  id: PlanTierId;
  name: string;
  tagline: string;
  priceMonthly: number; // in FCFA
  priceYearly: number; // in FCFA
  maxProducts: number; // 50 for Standard, 150 for Premium, 500 for VIP
  features: string[];
  commissionRate: number; // 0%
  customDomainAllowed: boolean;
  prioritySupport: boolean;
  popular?: boolean;
  hasWhatsAppCheckout: boolean;
  hasAdvancedCheckout: boolean;
  hasManualSocialShare: boolean;
  hasAiAnalytics: boolean;
  hasVipAiAssistant: boolean; // Kimsi-powered VIP Assistant for merchants
}

export interface SubscriptionRecord {
  id: string;
  storeId: string;
  storeName: string;
  planId: PlanTierId;
  planName: string;
  amount: number;
  currency: 'XOF';
  status: 'active' | 'expire' | 'en_attente_validation';
  paymentGateway: 'Wave' | 'Orange Money' | 'Carte Bancaire' | 'Gratuit';
  transactionRef?: string;
  validUntil: string;
  createdAt: string;
}

export interface ContactMessage {
  id: string;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  subject: string;
  message: string;
  status: 'nouveau' | 'traite' | 'archive';
  priority?: 'normale' | 'urgente' | 'basse';
  adminReply?: string;
  repliedAt?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorEmail: string;
  actorRole: UserRole;
  action: string;
  target: string;
  details: string;
  ipAddress: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface CartItem {
  product: Product;
  quantity: number;
  variantId?: string;
  selectedSize?: string;
  selectedColor?: string;
}

export interface KimsiMission {
  id: string;
  title: string;
  targetObjective: string;
  durationHours: number;
  startedAt: string;
  expiresAt: string;
  status: 'active' | 'completed' | 'cancelled';
  logs: { timestamp: string; action: string; details: string; severity?: 'info' | 'warning' | 'critical' }[];
  summaryReport?: string;
}

export interface KimsiChatMessage {
  id: string;
  sender: 'admin' | 'kimsi';
  content: string;
  timestamp: string;
  insights?: string[];
  suggestedActions?: { label: string; actionType: string; payload?: any }[];
}

