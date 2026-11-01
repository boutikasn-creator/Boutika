/**
 * Couche d'accès aux données Boutika (Supabase / PostgreSQL).
 * Source de vérité unique : plus aucune donnée métier dans le localStorage.
 * Les droits sont appliqués par la RLS (voir supabase/migrations/20261101000001_lot1_data_layer.sql).
 */
import { supabase, isSupabaseConfigured } from './supabase';
import type {
  Store,
  Product,
  Order,
  SubscriptionRecord,
  ContactMessage,
  AuditLog,
  DeliveryZone,
  UserRole,
  PlanTierId
} from '../types';

type Row = Record<string, any>;

export type DbResult = { ok: boolean; error?: string };

export const DEFAULT_LOGO_URL =
  'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=300&q=80';
export const DEFAULT_BANNER_URL =
  'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1200&q=80';
export const DEFAULT_CATEGORIES = ['Mode & Wax', 'Accessoires', 'Beauté'];
export const DEFAULT_DELIVERY_ZONES: DeliveryZone[] = [
  { id: 'zone-dakar-1', name: 'Dakar Centre / Plateau', price: 1500, estimatedTime: '24h - 48h' },
  { id: 'zone-dakar-2', name: 'Banlieue / Pikine / Guédiawaye', price: 2500, estimatedTime: '24h - 48h' },
  { id: 'zone-regions', name: 'Régions (Envoi GP / Poste)', price: 4000, estimatedTime: '3 - 5 jours' }
];

const client = () => (isSupabaseConfigured && supabase ? supabase : null);

const asArray = <T,>(value: any, fallback: T[]): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed as T[];
    } catch {
      /* ignore */
    }
  }
  return fallback;
};

const fail = (error: any): DbResult => ({
  ok: false,
  error: (error && (error.message || String(error))) || 'Erreur inconnue'
});

/* -------------------------------------------------------------------------- */
/* Boutiques                                                                   */
/* -------------------------------------------------------------------------- */

export const rowToStore = (r: Row): Store => {
  const categories = asArray<string>(r.categories, []);
  const zones = asArray<DeliveryZone>(r.delivery_zones, []);
  return {
    id: String(r.id),
    vendorId: String(r.vendor_id ?? ''),
    name: r.name ?? '',
    slug: r.slug ?? '',
    description: r.description ?? '',
    whatsappNumber: r.whatsapp_number ?? '',
    phone: r.phone ?? r.whatsapp_number ?? '',
    email: r.email ?? '',
    address: r.address ?? '',
    city: r.city ?? '',
    logoUrl: r.logo_url || DEFAULT_LOGO_URL,
    bannerUrl: r.banner_url || DEFAULT_BANNER_URL,
    categories: categories.length ? categories : DEFAULT_CATEGORIES,
    deliveryZones: zones.length ? zones : DEFAULT_DELIVERY_ZONES,
    status: (r.status as Store['status']) ?? 'active',
    suspensionReason: r.suspension_reason ?? undefined,
    planId: (r.plan_id as PlanTierId) ?? 'decouverte',
    createdAt: r.created_at ?? new Date().toISOString(),
    trialStartDate: r.trial_start_date ?? undefined,
    trialEndDate: r.trial_end_date ?? undefined,
    trialUsed: Boolean(r.trial_used),
    isFoundingStore: Boolean(r.is_founding_store),
    foundingOrder: r.founding_order ?? undefined,
    promotionBadge: r.promotion_badge ?? undefined,
    isVipPromoted: Boolean(r.is_vip_promoted),
    vipPromotionOrder: r.vip_promotion_order ?? undefined
  };
};

const STORE_COLUMNS: [keyof Store, string][] = [
  ['name', 'name'],
  ['slug', 'slug'],
  ['description', 'description'],
  ['whatsappNumber', 'whatsapp_number'],
  ['phone', 'phone'],
  ['email', 'email'],
  ['address', 'address'],
  ['city', 'city'],
  ['logoUrl', 'logo_url'],
  ['bannerUrl', 'banner_url'],
  ['categories', 'categories'],
  ['deliveryZones', 'delivery_zones'],
  ['status', 'status'],
  ['suspensionReason', 'suspension_reason'],
  ['planId', 'plan_id'],
  ['trialStartDate', 'trial_start_date'],
  ['trialEndDate', 'trial_end_date'],
  ['trialUsed', 'trial_used'],
  ['isFoundingStore', 'is_founding_store'],
  ['foundingOrder', 'founding_order'],
  ['promotionBadge', 'promotion_badge'],
  ['isVipPromoted', 'is_vip_promoted'],
  ['vipPromotionOrder', 'vip_promotion_order']
];

export const storeToRow = (updates: Partial<Store>): Row => {
  const row: Row = {};
  for (const [key, column] of STORE_COLUMNS) {
    if (updates[key] !== undefined) row[column] = updates[key];
  }
  return row;
};

export async function fetchStores(): Promise<Store[]> {
  const c = client();
  if (!c) return [];
  const { data, error } = await c.from('stores').select('*').order('created_at', { ascending: false });
  if (error) {
    console.warn('[db] fetchStores:', error.message);
    return [];
  }
  return (data || []).map(rowToStore);
}

export async function updateStoreRowDb(storeId: string, patch: Row): Promise<DbResult> {
  const c = client();
  if (!c) return { ok: true };
  if (!patch || Object.keys(patch).length === 0) return { ok: true };
  const { error } = await c.from('stores').update(patch).eq('id', storeId);
  return error ? fail(error) : { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Produits                                                                    */
/* -------------------------------------------------------------------------- */

export const rowToProduct = (r: Row): Product => ({
  id: String(r.id),
  storeId: String(r.store_id),
  name: r.name ?? '',
  description: r.description ?? '',
  price: Number(r.price ?? 0),
  compareAtPrice: r.compare_at_price != null ? Number(r.compare_at_price) : undefined,
  category: r.category ?? '',
  images: asArray<string>(r.images, []),
  stock: Number(r.stock ?? 0),
  isActive: r.is_active !== false,
  isFeatured: Boolean(r.is_featured),
  sku: r.sku ?? undefined,
  colors: asArray<string>(r.colors, []),
  sizes: asArray<string>(r.sizes, []),
  variants: asArray<any>(r.variants, []).length ? asArray<any>(r.variants, []) : undefined,
  createdAt: r.created_at ?? new Date().toISOString()
});

export const productToRow = (p: Partial<Product>): Row => {
  const row: Row = {};
  if (p.id !== undefined) row.id = p.id;
  if (p.storeId !== undefined) row.store_id = p.storeId;
  if (p.name !== undefined) row.name = p.name;
  if (p.description !== undefined) row.description = p.description;
  if (p.price !== undefined) row.price = p.price;
  if ('compareAtPrice' in p) row.compare_at_price = p.compareAtPrice ?? null;
  if (p.category !== undefined) row.category = p.category;
  if (p.images !== undefined) row.images = p.images;
  if (p.stock !== undefined) row.stock = p.stock;
  if (p.isActive !== undefined) row.is_active = p.isActive;
  if (p.isFeatured !== undefined) row.is_featured = p.isFeatured;
  if (p.sku !== undefined) row.sku = p.sku;
  if (p.colors !== undefined) row.colors = p.colors;
  if (p.sizes !== undefined) row.sizes = p.sizes;
  if ('variants' in p) row.variants = p.variants ?? [];
  if (p.createdAt !== undefined) row.created_at = p.createdAt;
  return row;
};

export async function fetchProducts(): Promise<Product[]> {
  const c = client();
  if (!c) return [];
  const { data, error } = await c.from('products').select('*').order('created_at', { ascending: false });
  if (error) {
    console.warn('[db] fetchProducts:', error.message);
    return [];
  }
  return (data || []).map(rowToProduct);
}

export async function insertProductDb(product: Product): Promise<DbResult> {
  const c = client();
  if (!c) return { ok: true };
  const { error } = await c.from('products').insert(productToRow(product));
  return error ? fail(error) : { ok: true };
}

export async function updateProductDb(id: string, updates: Partial<Product>): Promise<DbResult> {
  const c = client();
  if (!c) return { ok: true };
  const row = productToRow(updates);
  delete row.id;
  delete row.store_id;
  if (Object.keys(row).length === 0) return { ok: true };
  const { error } = await c.from('products').update({ ...row, updated_at: new Date().toISOString() }).eq('id', id);
  return error ? fail(error) : { ok: true };
}

export async function deleteProductDb(id: string): Promise<DbResult> {
  const c = client();
  if (!c) return { ok: true };
  const { error } = await c.from('products').delete().eq('id', id);
  return error ? fail(error) : { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Commandes                                                                   */
/* -------------------------------------------------------------------------- */

export const rowToOrder = (r: Row): Order => ({
  id: String(r.id),
  orderNumber: r.order_number ?? '',
  storeId: String(r.store_id),
  customerName: r.customer_name ?? '',
  customerPhone: r.customer_phone ?? '',
  customerEmail: r.customer_email ?? undefined,
  customerCity: r.customer_city ?? '',
  deliveryAddress: r.delivery_address ?? '',
  deliveryZone: r.delivery_zone ?? '',
  deliveryFee: Number(r.delivery_fee ?? 0),
  items: asArray<any>(r.items, []),
  subtotal: Number(r.subtotal ?? 0),
  total: Number(r.total ?? 0),
  status: (r.status as Order['status']) ?? 'nouvelle',
  paymentMethod: (r.payment_method as Order['paymentMethod']) ?? 'especes_livraison',
  paymentStatus: (r.payment_status as Order['paymentStatus']) ?? 'en_attente',
  notes: r.notes ?? undefined,
  createdAt: r.created_at ?? new Date().toISOString()
});

export const orderToRow = (o: Order): Row => ({
  id: o.id,
  store_id: o.storeId,
  order_number: o.orderNumber,
  customer_name: o.customerName,
  customer_phone: o.customerPhone,
  customer_email: o.customerEmail ?? null,
  customer_city: o.customerCity,
  delivery_address: o.deliveryAddress,
  delivery_zone: o.deliveryZone,
  delivery_fee: o.deliveryFee,
  items: o.items,
  subtotal: o.subtotal,
  total: o.total,
  status: o.status,
  payment_method: o.paymentMethod,
  payment_status: o.paymentStatus,
  notes: o.notes ?? null,
  created_at: o.createdAt
});

export async function fetchOrders(): Promise<Order[]> {
  const c = client();
  if (!c) return [];
  const { data, error } = await c.from('orders').select('*').order('created_at', { ascending: false });
  if (error) {
    console.warn('[db] fetchOrders:', error.message);
    return [];
  }
  return (data || []).map(rowToOrder);
}

/** Insertion SANS .select() : un client anonyme n'a pas le droit de relire la commande. */
export async function insertOrderDb(order: Order): Promise<DbResult> {
  const c = client();
  if (!c) return { ok: true };
  const { error } = await c.from('orders').insert(orderToRow(order));
  return error ? fail(error) : { ok: true };
}

export async function updateOrderDb(id: string, patch: Row): Promise<DbResult> {
  const c = client();
  if (!c) return { ok: true };
  const { error } = await c.from('orders').update(patch).eq('id', id);
  return error ? fail(error) : { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Abonnements                                                                 */
/* -------------------------------------------------------------------------- */

export const rowToSubscription = (r: Row): SubscriptionRecord => ({
  id: String(r.id),
  storeId: String(r.store_id),
  storeName: r.store_name ?? '',
  planId: r.plan_id as PlanTierId,
  planName: r.plan_name ?? '',
  amount: Number(r.amount ?? 0),
  currency: 'XOF',
  status: (r.status as SubscriptionRecord['status']) ?? 'en_attente_validation',
  paymentGateway: (r.payment_gateway as SubscriptionRecord['paymentGateway']) ?? 'Wave',
  transactionRef: r.transaction_ref ?? undefined,
  validUntil: r.valid_until ?? new Date().toISOString(),
  createdAt: r.created_at ?? new Date().toISOString()
});

export async function fetchSubscriptionRecords(): Promise<SubscriptionRecord[]> {
  const c = client();
  if (!c) return [];
  const { data, error } = await c
    .from('subscription_records')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[db] fetchSubscriptionRecords:', error.message);
    return [];
  }
  return (data || []).map(rowToSubscription);
}

export async function insertSubscriptionDb(rec: SubscriptionRecord): Promise<DbResult> {
  const c = client();
  if (!c) return { ok: true };
  const { error } = await c.from('subscription_records').insert({
    id: rec.id,
    store_id: rec.storeId,
    store_name: rec.storeName,
    plan_id: rec.planId,
    plan_name: rec.planName,
    amount: rec.amount,
    currency: rec.currency,
    status: rec.status,
    payment_gateway: rec.paymentGateway,
    transaction_ref: rec.transactionRef ?? null,
    valid_until: rec.validUntil,
    created_at: rec.createdAt
  });
  return error ? fail(error) : { ok: true };
}

export async function updateSubscriptionDb(id: string, patch: Row): Promise<DbResult> {
  const c = client();
  if (!c) return { ok: true };
  const { error } = await c.from('subscription_records').update(patch).eq('id', id);
  return error ? fail(error) : { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Messages de contact                                                         */
/* -------------------------------------------------------------------------- */

export const rowToContact = (r: Row): ContactMessage => ({
  id: String(r.id),
  senderName: r.sender_name ?? '',
  senderEmail: r.sender_email ?? '',
  senderPhone: r.sender_phone ?? '',
  subject: r.subject ?? '',
  message: r.message ?? '',
  status: (r.status as ContactMessage['status']) ?? 'nouveau',
  priority: (r.priority as ContactMessage['priority']) ?? 'normale',
  adminReply: r.admin_reply ?? undefined,
  repliedAt: r.replied_at ?? undefined,
  createdAt: r.created_at ?? new Date().toISOString()
});

export async function fetchContactMessages(): Promise<ContactMessage[]> {
  const c = client();
  if (!c) return [];
  const { data, error } = await c.from('contact_messages').select('*').order('created_at', { ascending: false });
  if (error) {
    console.warn('[db] fetchContactMessages:', error.message);
    return [];
  }
  return (data || []).map(rowToContact);
}

export async function insertContactDb(msg: ContactMessage): Promise<DbResult> {
  const c = client();
  if (!c) return { ok: true };
  const { error } = await c.from('contact_messages').insert({
    id: msg.id,
    sender_name: msg.senderName,
    sender_email: msg.senderEmail,
    sender_phone: msg.senderPhone,
    subject: msg.subject,
    message: msg.message,
    status: 'nouveau',
    priority: msg.priority ?? 'normale',
    created_at: msg.createdAt
  });
  return error ? fail(error) : { ok: true };
}

export async function updateContactDb(id: string, patch: Row): Promise<DbResult> {
  const c = client();
  if (!c) return { ok: true };
  const { error } = await c.from('contact_messages').update(patch).eq('id', id);
  return error ? fail(error) : { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Journal d'audit                                                             */
/* -------------------------------------------------------------------------- */

export const rowToAudit = (r: Row): AuditLog => ({
  id: String(r.id),
  timestamp: r.timestamp ?? new Date().toISOString(),
  actorEmail: r.actor_email ?? '',
  actorRole: (r.actor_role as UserRole) ?? 'vendor',
  action: r.action ?? '',
  target: r.target ?? '',
  details: r.details ?? '',
  ipAddress: r.ip_address ?? 'non collectée',
  severity: (r.severity as AuditLog['severity']) ?? 'info'
});

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const c = client();
  if (!c) return [];
  const { data, error } = await c
    .from('audit_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(300);
  if (error) {
    console.warn('[db] fetchAuditLogs:', error.message);
    return [];
  }
  return (data || []).map(rowToAudit);
}

export async function insertAuditLogDb(log: AuditLog): Promise<DbResult> {
  const c = client();
  if (!c) return { ok: true };
  const { error } = await c.from('audit_logs').insert({
    id: log.id,
    action: log.action,
    target: log.target,
    details: log.details,
    actor_email: log.actorEmail,
    actor_role: log.actorRole,
    ip_address: log.ipAddress,
    severity: log.severity,
    timestamp: log.timestamp
  });
  return error ? fail(error) : { ok: true };
}
