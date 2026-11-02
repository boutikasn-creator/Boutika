-- ==============================================================================
-- BOUTIKA : LOT 1 - COUCHE DE DONNÉES SUPABASE (SOURCE DE VÉRITÉ UNIQUE)
-- Fichier : supabase/migrations/20261101000001_lot1_data_layer.sql
-- (v2 : ajoute aussi les colonnes de base si une table existait déjà sans elles)
--
-- Objectif : plus aucune donnée métier dans le localStorage du navigateur.
-- Boutiques, produits, commandes, abonnements, messages et audit vivent
-- dans PostgreSQL, protégés par RLS.
--
-- Cette migration est IDEMPOTENTE : elle peut être rejouée sans casser l'existant.
-- Elle suppose que la migration 20261029000001_security_roles_audit.sql est déjà
-- appliquée (fonction public.is_super_admin(), table audit_logs, table profiles).
--
-- NOTE : aucune clé étrangère n'est créée volontairement, car le type exact des
-- colonnes id existantes (uuid ou text) n'est pas connu. Les comparaisons se font
-- en ::text pour fonctionner dans les deux cas.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. BOUTIQUES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stores (
  id TEXT PRIMARY KEY DEFAULT ('store-' || gen_random_uuid()::text),
  vendor_id UUID,
  name TEXT NOT NULL,
  slug TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Colonnes de base (au cas où la table existait déjà sans elles)
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS vendor_id UUID;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '[]'::JSONB;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS delivery_zones JSONB DEFAULT '[]'::JSONB;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS plan_id TEXT DEFAULT 'decouverte';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS business_type TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT FALSE;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_founding_store BOOLEAN DEFAULT FALSE;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS founding_order INT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS promotion_badge TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_vip_promoted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS vip_promotion_order INT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_stores_vendor_id ON public.stores(vendor_id);
CREATE INDEX IF NOT EXISTS idx_stores_status ON public.stores(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_slug_uniq ON public.stores(slug);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Lecture publique : uniquement les boutiques actives (marketplace, vitrines)
DROP POLICY IF EXISTS "lot1_stores_select_public" ON public.stores;
CREATE POLICY "lot1_stores_select_public"
ON public.stores FOR SELECT
TO anon
USING (status = 'active');

-- Lecture connectée : boutiques actives + sa propre boutique + tout pour le Super Admin
DROP POLICY IF EXISTS "lot1_stores_select_auth" ON public.stores;
CREATE POLICY "lot1_stores_select_auth"
ON public.stores FOR SELECT
TO authenticated
USING (
  status = 'active'
  OR vendor_id::text = auth.uid()::text
  OR public.is_super_admin()
);

-- Création : un vendeur ne crée que SA boutique, sans s'octroyer de promotion
DROP POLICY IF EXISTS "lot1_stores_insert_auth" ON public.stores;
CREATE POLICY "lot1_stores_insert_auth"
ON public.stores FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (
    vendor_id::text = auth.uid()::text
    AND COALESCE(plan_id, 'decouverte') IN ('decouverte', 'standard')
    AND COALESCE(is_founding_store, FALSE) = FALSE
    AND COALESCE(is_vip_promoted, FALSE) = FALSE
  )
);

-- Modification : propriétaire ou Super Admin
DROP POLICY IF EXISTS "lot1_stores_update_auth" ON public.stores;
CREATE POLICY "lot1_stores_update_auth"
ON public.stores FOR UPDATE
TO authenticated
USING (vendor_id::text = auth.uid()::text OR public.is_super_admin())
WITH CHECK (vendor_id::text = auth.uid()::text OR public.is_super_admin());

-- Suppression : Super Admin uniquement
DROP POLICY IF EXISTS "lot1_stores_delete_admin" ON public.stores;
CREATE POLICY "lot1_stores_delete_admin"
ON public.stores FOR DELETE
TO authenticated
USING (public.is_super_admin());

-- Colonnes sensibles : seul le Super Admin (ou service_role) peut les modifier.
-- Empêche un vendeur de se donner la formule VIP, de se promouvoir ou de se réactiver.
CREATE OR REPLACE FUNCTION public.guard_store_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_service_role BOOLEAN;
BEGIN
  v_is_service_role := (
    COALESCE(auth.jwt() ->> 'role', '') = 'service_role'
    OR current_user = 'service_role'
    OR current_user = 'postgres'
  );

  IF v_is_service_role OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.vendor_id IS DISTINCT FROM OLD.vendor_id
     OR NEW.plan_id IS DISTINCT FROM OLD.plan_id
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.suspension_reason IS DISTINCT FROM OLD.suspension_reason
     OR NEW.is_founding_store IS DISTINCT FROM OLD.is_founding_store
     OR NEW.founding_order IS DISTINCT FROM OLD.founding_order
     OR NEW.promotion_badge IS DISTINCT FROM OLD.promotion_badge
     OR NEW.is_vip_promoted IS DISTINCT FROM OLD.is_vip_promoted
     OR NEW.vip_promotion_order IS DISTINCT FROM OLD.vip_promotion_order
     OR NEW.trial_start_date IS DISTINCT FROM OLD.trial_start_date
     OR NEW.trial_end_date IS DISTINCT FROM OLD.trial_end_date
     OR NEW.trial_used IS DISTINCT FROM OLD.trial_used
  THEN
    RAISE EXCEPTION 'Sécurité Boutika : modification réservée à l’administration (formule, statut, promotion ou essai).';
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_store_sensitive_columns ON public.stores;
CREATE TRIGGER trg_guard_store_sensitive_columns
BEFORE UPDATE ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.guard_store_sensitive_columns();

-- ------------------------------------------------------------------------------
-- 2. PRODUITS
-- (les tailles / couleurs / variantes sont stockées en JSONB dans cette étape ;
--  le stock par variante dédié arrive au lot 3)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY DEFAULT ('prod-' || gen_random_uuid()::text),
  store_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Colonnes de base (au cas où la table existait déjà sans elles)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS store_id TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock INT DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS colors JSONB DEFAULT '[]'::JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sizes JSONB DEFAULT '[]'::JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lot1_products_select_public" ON public.products;
CREATE POLICY "lot1_products_select_public"
ON public.products FOR SELECT
TO anon
USING (
  COALESCE(is_active, TRUE) = TRUE
  AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::text = products.store_id::text AND s.status = 'active'
  )
);

DROP POLICY IF EXISTS "lot1_products_select_auth" ON public.products;
CREATE POLICY "lot1_products_select_auth"
ON public.products FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::text = products.store_id::text
      AND (s.vendor_id::text = auth.uid()::text
           OR (s.status = 'active' AND COALESCE(products.is_active, TRUE) = TRUE))
  )
);

DROP POLICY IF EXISTS "lot1_products_write_auth" ON public.products;
CREATE POLICY "lot1_products_write_auth"
ON public.products FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::text = products.store_id::text AND s.vendor_id::text = auth.uid()::text
  )
)
WITH CHECK (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::text = products.store_id::text AND s.vendor_id::text = auth.uid()::text
  )
);

-- Le trigger de quota existe déjà (migration 20261029000001) : trg_guard_product_store_quota

-- ------------------------------------------------------------------------------
-- 3. COMMANDES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY DEFAULT ('ord-' || gen_random_uuid()::text),
  store_id TEXT NOT NULL,
  order_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Colonnes de base (au cas où la table existait déjà sans elles : c'est ce qui causait l'erreur order_number)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS store_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_city TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_zone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::JSONB;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'nouvelle';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'en_attente';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders(store_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number_uniq ON public.orders(order_number);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Un client (même non connecté) peut passer commande dans une boutique active,
-- mais ne peut jamais créer une commande déjà "payée" ou déjà "livrée".
DROP POLICY IF EXISTS "lot1_orders_insert_public" ON public.orders;
CREATE POLICY "lot1_orders_insert_public"
ON public.orders FOR INSERT
TO anon, authenticated
WITH CHECK (
  COALESCE(status, 'nouvelle') = 'nouvelle'
  AND COALESCE(payment_status, 'en_attente') = 'en_attente'
  AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::text = orders.store_id::text AND s.status = 'active'
  )
);

DROP POLICY IF EXISTS "lot1_orders_select_auth" ON public.orders;
CREATE POLICY "lot1_orders_select_auth"
ON public.orders FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::text = orders.store_id::text AND s.vendor_id::text = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "lot1_orders_update_auth" ON public.orders;
CREATE POLICY "lot1_orders_update_auth"
ON public.orders FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::text = orders.store_id::text AND s.vendor_id::text = auth.uid()::text
  )
)
WITH CHECK (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::text = orders.store_id::text AND s.vendor_id::text = auth.uid()::text
  )
);

-- Un vendeur ne peut passer une commande en "payée" que pour un paiement à la livraison.
-- Les paiements Wave / Orange Money ne sont validés que par webhook serveur (service_role) ou admin.
CREATE OR REPLACE FUNCTION public.guard_order_payment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_service_role BOOLEAN;
BEGIN
  v_is_service_role := (
    COALESCE(auth.jwt() ->> 'role', '') = 'service_role'
    OR current_user = 'service_role'
    OR current_user = 'postgres'
  );

  IF v_is_service_role OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.store_id IS DISTINCT FROM OLD.store_id
     OR NEW.total IS DISTINCT FROM OLD.total
     OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
     OR NEW.order_number IS DISTINCT FROM OLD.order_number
     OR NEW.items IS DISTINCT FROM OLD.items
  THEN
    RAISE EXCEPTION 'Sécurité Boutika : les montants et articles d’une commande ne sont pas modifiables.';
  END IF;

  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
     AND COALESCE(NEW.payment_method, '') <> 'especes_livraison'
  THEN
    RAISE EXCEPTION 'Sécurité Boutika : seul un paiement à la livraison peut être confirmé manuellement.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_order_payment_status ON public.orders;
CREATE TRIGGER trg_guard_order_payment_status
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.guard_order_payment_status();

-- Décrémentation automatique du stock à la création d'une commande
-- (le client anonyme n'a pas le droit d'écrire dans products : c'est la base qui le fait)
CREATE OR REPLACE FUNCTION public.decrement_stock_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  item RECORD;
BEGIN
  FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(NEW.items, '[]'::JSONB))
  LOOP
    UPDATE public.products
    SET stock = GREATEST(0, COALESCE(stock, 0) - COALESCE((item.value ->> 'quantity')::INT, 0))
    WHERE id::text = (item.value ->> 'productId')
      AND store_id::text = NEW.store_id::text;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_decrement_stock_on_order ON public.orders;
CREATE TRIGGER trg_decrement_stock_on_order
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.decrement_stock_on_order();

-- ------------------------------------------------------------------------------
-- 4. ABONNEMENTS (demandes et activations)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_records (
  id TEXT PRIMARY KEY DEFAULT ('sub-' || gen_random_uuid()::text),
  store_id TEXT NOT NULL,
  store_name TEXT,
  plan_id TEXT NOT NULL,
  plan_name TEXT,
  amount NUMERIC NOT NULL DEFAULT 0 CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'XOF',
  status TEXT NOT NULL DEFAULT 'en_attente_validation'
    CHECK (status IN ('active', 'expire', 'en_attente_validation')),
  payment_gateway TEXT,
  transaction_ref TEXT,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_records_store ON public.subscription_records(store_id);

ALTER TABLE public.subscription_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lot1_subs_select_auth" ON public.subscription_records;
CREATE POLICY "lot1_subs_select_auth"
ON public.subscription_records FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::text = subscription_records.store_id::text AND s.vendor_id::text = auth.uid()::text
  )
);

-- Le vendeur peut seulement DEMANDER un changement de formule (statut en attente).
DROP POLICY IF EXISTS "lot1_subs_insert_auth" ON public.subscription_records;
CREATE POLICY "lot1_subs_insert_auth"
ON public.subscription_records FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (
    status = 'en_attente_validation'
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id::text = subscription_records.store_id::text AND s.vendor_id::text = auth.uid()::text
    )
  )
);

DROP POLICY IF EXISTS "lot1_subs_update_admin" ON public.subscription_records;
CREATE POLICY "lot1_subs_update_admin"
ON public.subscription_records FOR UPDATE
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "lot1_subs_delete_admin" ON public.subscription_records;
CREATE POLICY "lot1_subs_delete_admin"
ON public.subscription_records FOR DELETE
TO authenticated
USING (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 5. MESSAGES DE CONTACT / SUPPORT
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id TEXT PRIMARY KEY DEFAULT ('msg-' || gen_random_uuid()::text),
  sender_name TEXT NOT NULL,
  sender_email TEXT,
  sender_phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'nouveau' CHECK (status IN ('nouveau', 'traite', 'archive')),
  priority TEXT DEFAULT 'normale',
  admin_reply TEXT,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lot1_contact_insert_public" ON public.contact_messages;
CREATE POLICY "lot1_contact_insert_public"
ON public.contact_messages FOR INSERT
TO anon, authenticated
WITH CHECK (status = 'nouveau' AND admin_reply IS NULL);

DROP POLICY IF EXISTS "lot1_contact_select_auth" ON public.contact_messages;
CREATE POLICY "lot1_contact_select_auth"
ON public.contact_messages FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR lower(COALESCE(sender_email, '')) = lower(COALESCE(auth.jwt() ->> 'email', ''))
);

DROP POLICY IF EXISTS "lot1_contact_update_admin" ON public.contact_messages;
CREATE POLICY "lot1_contact_update_admin"
ON public.contact_messages FOR UPDATE
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "lot1_contact_delete_admin" ON public.contact_messages;
CREATE POLICY "lot1_contact_delete_admin"
ON public.contact_messages FOR DELETE
TO authenticated
USING (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 6. DROITS D'ACCÈS AUX TABLES (en plus des politiques RLS)
-- ------------------------------------------------------------------------------
GRANT SELECT ON public.stores, public.products TO anon;
GRANT INSERT ON public.orders, public.contact_messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.stores, public.products, public.orders,
  public.subscription_records, public.contact_messages
TO authenticated;
