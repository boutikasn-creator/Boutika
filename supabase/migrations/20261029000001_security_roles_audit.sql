-- ==============================================================================
-- BOUTIKA : MIGRATION OFFICIELLE DE SÉCURITÉ, RÔLES, KIMSI & WEBHOOKS
-- Fichier : supabase/migrations/20261029000001_security_roles_audit.sql
-- ==============================================================================

-- 1. EXTENSIONS REQUISES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLE DU JOURNAL D’AUDIT DE SÉCURITÉ (AVEC UUID GARANTI SANS COLLISION)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY DEFAULT ('aud-' || gen_random_uuid()::text),
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

-- Seul le Super Admin ou le service_role peut lire les journaux d'audit
CREATE POLICY "Lecture réservée aux super administrateurs"
ON public.audit_logs FOR SELECT
TO authenticated, service_role
USING (
  COALESCE((auth.jwt() ->> 'role') = 'service_role', false)
  OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Tout utilisateur authentifié ou fonction système peut insérer un log
CREATE POLICY "Insertion de logs d'audit autorisée"
ON public.audit_logs FOR INSERT
TO authenticated, service_role, anon
WITH CHECK (true);

-- 3. FONCTION DE CONTRÔLE SUPER ADMIN SANS AUCUN RISQUE DE RÉCURSION
-- Caractéristiques : SECURITY DEFINER, STABLE, search_path verrouillé
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT (
    -- Cas 1 : Requête exécutée avec la clé secrète service_role
    COALESCE((auth.jwt() ->> 'role') = 'service_role', false)
    OR
    -- Cas 2 : Utilisateur authentifié dont le rôle en base est 'super_admin'
    COALESCE(
      (SELECT role = 'super_admin' FROM public.profiles WHERE id = auth.uid()),
      false
    )
  );
$$;

-- Restreindre les privilèges d'exécution aux rôles légitimes
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;

-- 4. POLITIQUES DE SÉCURITÉ ROW LEVEL SECURITY (RLS) SUR PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture de son propre profil" ON public.profiles;
CREATE POLICY "Lecture de son propre profil"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Super Admin consulte tous les profils" ON public.profiles;
CREATE POLICY "Super Admin consulte tous les profils"
ON public.profiles FOR SELECT
TO authenticated, service_role
USING (public.is_super_admin());

DROP POLICY IF EXISTS "Utilisateur modifie son profil" ON public.profiles;
CREATE POLICY "Utilisateur modifie son profil"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- 5. DÉCLENCHEUR DE SÉCURITÉ INVIOLABLE : INTERDICTION STRICTE D'AUTO-ÉLÉVATION
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
    -- Détection multicouche fiable de service_role (PostgREST JWT ou utilisateur Postgres)
    v_is_service_role := (
      COALESCE(auth.jwt() ->> 'role', '') = 'service_role'
      OR current_user = 'service_role'
      OR COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    );
    
    v_is_admin := public.is_super_admin();

    -- Interdire formellement si ce n'est ni un Super Admin existant ni service_role
    IF NOT v_is_service_role AND NOT v_is_admin THEN
      RAISE EXCEPTION 'Sécurité Boutika : Interdiction formelle de modifier le rôle utilisateur (Tentative d’élévation détectée).';
    END IF;

    -- Consigner obligatoirement l'événement dans le journal d'audit
    INSERT INTO public.audit_logs (
      action,
      target,
      details,
      actor_email,
      actor_role,
      severity,
      timestamp
    ) VALUES (
      'ROLE_ELEVATION_ATTEMPT_PROCESSED',
      NEW.id::TEXT,
      'Modification du rôle pour ' || NEW.email || ' : [' || OLD.role || '] -> [' || NEW.role || ']',
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

-- 6. PROCÉDURE D'ADMINISTRATION CONTRÔLÉE : PROMOTION D'UN UTILISATEUR
CREATE OR REPLACE FUNCTION public.admin_promote_user(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target_email TEXT;
BEGIN
  -- 1. Contrôle d'autorisation strict de l'appelant
  IF NOT public.is_super_admin() AND COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'Accès refusé : Seul un Super Admin peut exécuter la promotion d’un compte.';
  END IF;

  -- 2. Vérification de l'existence de l'utilisateur cible
  SELECT email INTO v_target_email FROM public.profiles WHERE id = target_user_id;
  IF v_target_email IS NULL THEN
    RAISE EXCEPTION 'Utilisateur introuvable avec l’ID %.', target_user_id;
  END IF;

  -- 3. Mise à jour contrôlée
  UPDATE public.profiles
  SET role = 'super_admin', updated_at = NOW()
  WHERE id = target_user_id;

  -- 4. Journalisation critique
  INSERT INTO public.audit_logs (
    action,
    target,
    details,
    actor_email,
    actor_role,
    severity,
    timestamp
  ) VALUES (
    'ADMIN_PROMOTION_GRANTED',
    target_user_id::TEXT,
    'Compte ' || v_target_email || ' promu au rôle super_admin via procédure administrative contrôlée.',
    COALESCE(auth.jwt() ->> 'email', 'service_role'),
    'super_admin',
    'critical',
    NOW()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_promote_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_promote_user(UUID) TO authenticated, service_role;

-- 7. TABLE DES MISSIONS KIMSI PERSISTANTE (DURABILITÉ MULTI-INSTANCES CLOUD RUN)
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

CREATE POLICY "Super Admin et Service Role gèrent les missions Kimsi"
ON public.kimsi_missions FOR ALL
TO authenticated, service_role
USING (public.is_super_admin());

-- 8. TABLE DES ÉVÉNEMENTS DE PAIEMENT & IDEMPOTENCE (RÉSILIENCE CONCURRENTE)
CREATE TABLE IF NOT EXISTS public.payment_events (
  id TEXT PRIMARY KEY DEFAULT ('pay-' || gen_random_uuid()::text),
  idempotency_key TEXT NOT NULL UNIQUE,
  gateway TEXT NOT NULL CHECK (gateway IN ('wave', 'orange_money', 'simulation')),
  event_type TEXT NOT NULL,
  order_number TEXT,
  order_id TEXT,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'XOF',
  status TEXT NOT NULL CHECK (status IN ('paye', 'echec', 'en_attente')),
  raw_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_order_number ON public.payment_events(order_number);
CREATE INDEX IF NOT EXISTS idx_payment_events_idempotency ON public.payment_events(idempotency_key);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture des événements de paiement"
ON public.payment_events FOR SELECT
TO authenticated, service_role
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.stores s ON s.id = o.store_id
    WHERE (o.order_number = payment_events.order_number OR o.id = payment_events.order_id)
      AND s.vendor_id = auth.uid()
  )
);

-- Mise à niveau non-destructive des colonnes de payment_events si la table existait préalablement
ALTER TABLE public.payment_events ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE public.payment_events ADD COLUMN IF NOT EXISTS gateway TEXT DEFAULT 'wave';
ALTER TABLE public.payment_events ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'checkout.session.completed';
ALTER TABLE public.payment_events ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE public.payment_events ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE public.payment_events ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
ALTER TABLE public.payment_events ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'XOF';
ALTER TABLE public.payment_events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'paye';
ALTER TABLE public.payment_events ADD COLUMN IF NOT EXISTS raw_payload JSONB DEFAULT '{}'::JSONB;
ALTER TABLE public.payment_events ADD COLUMN IF NOT EXISTS integrity_note TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_events_idempotency_uniq ON public.payment_events(idempotency_key);

-- 9. TABLE DES VARIANTES DE PRODUITS (TAILLES, COULEURS & STOCKS DÉDIÉS)
CREATE TABLE IF NOT EXISTS public.product_variants (
  id TEXT PRIMARY KEY DEFAULT ('var-' || gen_random_uuid()::text),
  product_id TEXT NOT NULL,
  size TEXT,
  color TEXT,
  sku TEXT,
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  price NUMERIC CHECK (price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture publique des variantes de produits" ON public.product_variants;
CREATE POLICY "Lecture publique des variantes de produits"
ON public.product_variants FOR SELECT
TO anon, authenticated, service_role
USING (true);

DROP POLICY IF EXISTS "Vendeur gère les variantes de ses produits" ON public.product_variants;
CREATE POLICY "Vendeur gère les variantes de ses produits"
ON public.product_variants FOR ALL
TO authenticated, service_role
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.stores s ON s.id = p.store_id
    WHERE p.id = product_variants.product_id AND s.vendor_id = auth.uid()
  )
);

-- 10. DÉCLENCHEUR DE RESPECT STRICT DES QUOTAS DE CATALOGUE (STANDARD=50, PREMIUM=150, VIP=500)
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
    OR current_user = 'service_role'
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
    -- Standard : gratuit en permanence, maximum 50 produits
    v_max_allowed := 50;
  END IF;

  SELECT COUNT(*) INTO v_current_count
  FROM public.products
  WHERE store_id = NEW.store_id;

  IF v_current_count >= v_max_allowed THEN
    RAISE EXCEPTION 'Quota catalogue atteint : Votre formule (%) autorise au maximum % produits. Contactez Boutika pour passer à la formule supérieure.', v_plan_id, v_max_allowed;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_product_store_quota ON public.products;
CREATE TRIGGER trg_guard_product_store_quota
BEFORE INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.guard_product_store_quota();
