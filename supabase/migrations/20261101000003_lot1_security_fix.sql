-- ==============================================================================
-- BOUTIKA : LOT 1 (suite) - SÉCURITÉ, RÔLES, AUDIT (adapté à votre schéma réel)
-- Fichier : supabase/migrations/20261101000003_lot1_security_fix.sql
--
-- Remplace la migration 20261029000001_security_roles_audit.sql, qui ne pouvait pas
-- s'appliquer sur votre base : ids en uuid (et non text), table profiles sans colonne
-- e-mail, table payment_events d'une autre forme.
-- Ne lancez PAS 20261029000001 : lancez celle-ci à la place.
--
-- Idempotent : peut être rejoué sans risque. Ne supprime AUCUNE donnée.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Fonction de contrôle Super Admin (SECURITY DEFINER : pas de récursion RLS)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT (
    COALESCE((auth.jwt() ->> 'role') = 'service_role', false)
    OR COALESCE(
      (SELECT role = 'super_admin' FROM public.profiles WHERE id = auth.uid()),
      false
    )
  );
$$;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;

-- 2. Journal d'audit
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  details TEXT,
  actor_email TEXT,
  actor_role TEXT,
  ip_address TEXT,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs(severity);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lot1_audit_select_admin" ON public.audit_logs;
CREATE POLICY "lot1_audit_select_admin"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.is_super_admin());

-- Seuls les comptes connectés écrivent dans le journal (plus d'écriture anonyme)
DROP POLICY IF EXISTS "lot1_audit_insert_auth" ON public.audit_logs;
CREATE POLICY "lot1_audit_insert_auth"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;

-- 3. Profils : chacun lit/modifie le sien, le Super Admin lit tout
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lot1_profiles_select_own" ON public.profiles;
CREATE POLICY "lot1_profiles_select_own"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "lot1_profiles_select_admin" ON public.profiles;
CREATE POLICY "lot1_profiles_select_admin"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_super_admin());

DROP POLICY IF EXISTS "lot1_profiles_update_own" ON public.profiles;
CREATE POLICY "lot1_profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Auto-création de son propre profil, toujours en rôle vendeur
DROP POLICY IF EXISTS "lot1_profiles_insert_own" ON public.profiles;
CREATE POLICY "lot1_profiles_insert_own"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id AND role = 'vendor');

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- 4. Interdiction stricte de l'auto-élévation de rôle
-- (le SQL Editor de Supabase et la clé service_role restent autorisés)
CREATE OR REPLACE FUNCTION public.guard_profile_role_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_service_role BOOLEAN;
  v_is_admin BOOLEAN;
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    v_is_service_role := (
      COALESCE(auth.jwt() ->> 'role', '') = 'service_role'
      OR current_user IN ('service_role', 'postgres')
      OR COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    );
    v_is_admin := public.is_super_admin();

    IF NOT v_is_service_role AND NOT v_is_admin THEN
      RAISE EXCEPTION 'Sécurité Boutika : interdiction de modifier le rôle utilisateur (tentative d’élévation détectée).';
    END IF;

    INSERT INTO public.audit_logs (action, target, details, actor_email, actor_role, severity, timestamp)
    VALUES (
      'ROLE_CHANGED',
      NEW.id::TEXT,
      'Changement de rôle : [' || COALESCE(OLD.role, '?') || '] -> [' || COALESCE(NEW.role, '?') || ']',
      COALESCE(auth.jwt() ->> 'email', current_user),
      CASE WHEN v_is_service_role THEN 'service_role' ELSE 'super_admin' END,
      'critical',
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_role ON public.profiles;
CREATE TRIGGER trg_guard_profile_role
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_profile_role_update();

-- 5. Promotion contrôlée d'un compte en Super Admin
CREATE OR REPLACE FUNCTION public.admin_promote_user(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_super_admin() AND COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'Accès refusé : seul un Super Admin peut promouvoir un compte.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'Utilisateur introuvable avec l’ID %.', target_user_id;
  END IF;

  UPDATE public.profiles SET role = 'super_admin' WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_promote_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_promote_user(UUID) TO authenticated, service_role;

-- 6. Missions Kimsi (réservées au Super Admin)
CREATE TABLE IF NOT EXISTS public.kimsi_missions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  target_objective TEXT NOT NULL,
  duration_hours NUMERIC NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'expired')),
  mission_type TEXT DEFAULT 'general',
  audit_run_count INT DEFAULT 0,
  last_audit_run_at TIMESTAMPTZ,
  logs JSONB NOT NULL DEFAULT '[]'::JSONB,
  summary_report TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.kimsi_missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lot1_kimsi_admin_all" ON public.kimsi_missions;
CREATE POLICY "lot1_kimsi_admin_all"
ON public.kimsi_missions FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- 7. Événements de paiement : on COMPLÈTE la table existante (provider, provider_reference...)
ALTER TABLE public.payment_events ADD COLUMN IF NOT EXISTS gateway TEXT;
ALTER TABLE public.payment_events ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE public.payment_events ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE public.payment_events ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE public.payment_events ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
ALTER TABLE public.payment_events ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'XOF';
ALTER TABLE public.payment_events ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.payment_events ADD COLUMN IF NOT EXISTS raw_payload JSONB DEFAULT '{}'::JSONB;
ALTER TABLE public.payment_events ADD COLUMN IF NOT EXISTS integrity_note TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_events_order_number ON public.payment_events(order_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_events_idempotency_uniq ON public.payment_events(idempotency_key);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lot1_payment_events_select" ON public.payment_events;
CREATE POLICY "lot1_payment_events_select"
ON public.payment_events FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.stores s ON s.id::text = o.store_id::text
    WHERE (o.order_number = payment_events.order_number OR o.id::text = payment_events.order_id)
      AND s.vendor_id::text = auth.uid()::text
  )
);

-- 8. Variantes de produits (stock par taille / couleur : utilisé au lot 3)
CREATE TABLE IF NOT EXISTS public.product_variants (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id UUID NOT NULL,
  size TEXT,
  color TEXT,
  sku TEXT,
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  price NUMERIC CHECK (price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lot1_variants_select_public" ON public.product_variants;
CREATE POLICY "lot1_variants_select_public"
ON public.product_variants FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "lot1_variants_write_vendor" ON public.product_variants;
CREATE POLICY "lot1_variants_write_vendor"
ON public.product_variants FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.stores s ON s.id::text = p.store_id::text
    WHERE p.id::text = product_variants.product_id::text AND s.vendor_id::text = auth.uid()::text
  )
)
WITH CHECK (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.stores s ON s.id::text = p.store_id::text
    WHERE p.id::text = product_variants.product_id::text AND s.vendor_id::text = auth.uid()::text
  )
);

GRANT SELECT ON public.product_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;

-- 9. Quotas de catalogue (50 / 150 / 500) appliqués par la base
CREATE OR REPLACE FUNCTION public.guard_product_store_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plan_id TEXT;
  v_current_count INT;
  v_max_allowed INT;
  v_is_service_role BOOLEAN;
BEGIN
  v_is_service_role := (
    COALESCE(auth.jwt() ->> 'role', '') = 'service_role'
    OR current_user IN ('service_role', 'postgres')
  );

  IF v_is_service_role THEN
    RETURN NEW;
  END IF;

  SELECT plan_id INTO v_plan_id FROM public.stores WHERE id = NEW.store_id;
  IF v_plan_id IS NULL THEN
    v_plan_id := 'standard';
  END IF;

  IF v_plan_id IN ('vip', 'business') THEN
    v_max_allowed := 500;
  ELSIF v_plan_id IN ('premium', 'pro') THEN
    v_max_allowed := 150;
  ELSE
    v_max_allowed := 50;
  END IF;

  SELECT COUNT(*) INTO v_current_count FROM public.products WHERE store_id = NEW.store_id;

  IF v_current_count >= v_max_allowed THEN
    RAISE EXCEPTION 'Quota catalogue atteint : votre formule (%) autorise au maximum % produits. Passez à la formule supérieure.', v_plan_id, v_max_allowed;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_product_store_quota ON public.products;
CREATE TRIGGER trg_guard_product_store_quota
BEFORE INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.guard_product_store_quota();

NOTIFY pgrst, 'reload schema';
