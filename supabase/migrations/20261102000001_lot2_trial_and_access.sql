-- ==============================================================================
-- BOUTIKA : LOT 2 - ESSAI DE 3 JOURS, ACCÈS PAR ABONNEMENT, FORMULES TOUTES PAYANTES
-- Fichier : supabase/migrations/20261102000001_lot2_trial_and_access.sql
--
-- Ce script :
--   1. supprime la formule gratuite : "decouverte" devient "standard" ;
--   2. donne 3 jours d'essai (une seule fois par vendeur) à chaque nouvelle boutique, côté base ;
--   3. crée la fonction d'accès : essai en cours OU abonnement actif et non expiré ;
--   4. n'affiche plus dans la Marketplace les boutiques sans accès, et interdit à un vendeur sans
--      accès d'ajouter ou modifier des produits (la règle est appliquée par la base, pas seulement par l'écran) ;
--   5. accorde UN essai de 3 jours à compter de maintenant aux boutiques déjà existantes qui n'en ont pas.
--
-- Prérequis : les scripts du lot 1 (20261101000001, 000002, 000003) ont été exécutés.
-- Idempotent : peut être rejoué sans risque. Ne supprime AUCUNE donnée.
-- ==============================================================================

-- 1. Plus de formule gratuite
UPDATE public.stores SET plan_id = 'standard' WHERE plan_id IS NULL OR plan_id = 'decouverte';
ALTER TABLE public.stores ALTER COLUMN plan_id SET DEFAULT 'standard';

-- 2. Essai de 3 jours automatique à la création d'une boutique, une seule fois par vendeur.
-- Les dates sont fixées par la base : un vendeur ne peut pas les choisir lui-même.
CREATE OR REPLACE FUNCTION public.set_store_trial_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_privileged BOOLEAN;
BEGIN
  v_privileged := (
    COALESCE(auth.jwt() ->> 'role', '') = 'service_role'
    OR current_user IN ('service_role', 'postgres')
    OR public.is_super_admin()
  );

  IF v_privileged THEN
    RETURN NEW;
  END IF;

  -- La formule choisie doit être l'une des trois formules payantes
  IF NEW.plan_id IS NULL OR NEW.plan_id NOT IN ('standard', 'premium', 'vip') THEN
    NEW.plan_id := 'standard';
  END IF;

  -- Un seul essai par vendeur
  IF EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.vendor_id = NEW.vendor_id AND s.trial_start_date IS NOT NULL
  ) THEN
    NEW.trial_used := TRUE;
    NEW.trial_start_date := NULL;
    NEW.trial_end_date := NULL;
  ELSE
    NEW.trial_used := FALSE;
    NEW.trial_start_date := NOW();
    NEW.trial_end_date := NOW() + INTERVAL '3 days';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_store_trial_on_insert ON public.stores;
CREATE TRIGGER trg_set_store_trial_on_insert
BEFORE INSERT ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.set_store_trial_on_insert();

-- 3. Fonction d'accès : essai en cours OU abonnement actif non expiré
CREATE OR REPLACE FUNCTION public.store_has_active_access(p_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = p_store_id
        AND s.trial_end_date IS NOT NULL
        AND s.trial_end_date > NOW()
    )
    OR EXISTS (
      SELECT 1 FROM public.subscription_records r
      WHERE r.store_id::text = p_store_id::text
        AND r.status = 'active'
        AND r.valid_until IS NOT NULL
        AND r.valid_until > NOW()
    );
$$;

REVOKE ALL ON FUNCTION public.store_has_active_access(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.store_has_active_access(UUID) TO anon, authenticated, service_role;

-- 4a. Création de boutique : la formule et les dates d'essai sont normalisées par le trigger ci-dessus
DROP POLICY IF EXISTS "lot1_stores_insert_auth" ON public.stores;
CREATE POLICY "lot1_stores_insert_auth"
ON public.stores FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (
    vendor_id::text = auth.uid()::text
    AND COALESCE(is_founding_store, FALSE) = FALSE
    AND COALESCE(is_vip_promoted, FALSE) = FALSE
  )
);

-- 4b. Marketplace et boutiques publiques : seulement les boutiques avec accès valide
DROP POLICY IF EXISTS "lot1_stores_select_public" ON public.stores;
CREATE POLICY "lot1_stores_select_public"
ON public.stores FOR SELECT
TO anon
USING (status = 'active' AND public.store_has_active_access(id));

DROP POLICY IF EXISTS "lot1_stores_select_auth" ON public.stores;
CREATE POLICY "lot1_stores_select_auth"
ON public.stores FOR SELECT
TO authenticated
USING (
  (status = 'active' AND public.store_has_active_access(id))
  OR vendor_id::text = auth.uid()::text
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS "lot1_products_select_public" ON public.products;
CREATE POLICY "lot1_products_select_public"
ON public.products FOR SELECT
TO anon
USING (
  COALESCE(is_active, TRUE) = TRUE
  AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::text = products.store_id::text
      AND s.status = 'active'
      AND public.store_has_active_access(s.id)
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
      AND (
        s.vendor_id::text = auth.uid()::text
        OR (s.status = 'active' AND public.store_has_active_access(s.id) AND COALESCE(products.is_active, TRUE) = TRUE)
      )
  )
);

-- 4c. Un vendeur sans accès ne peut plus ajouter ni modifier de produits (il peut encore en supprimer)
DROP POLICY IF EXISTS "lot1_products_write_auth" ON public.products;
DROP POLICY IF EXISTS "lot2_products_insert_auth" ON public.products;
DROP POLICY IF EXISTS "lot2_products_update_auth" ON public.products;
DROP POLICY IF EXISTS "lot2_products_delete_auth" ON public.products;

CREATE POLICY "lot2_products_insert_auth"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::text = products.store_id::text
      AND s.vendor_id::text = auth.uid()::text
      AND public.store_has_active_access(s.id)
  )
);

CREATE POLICY "lot2_products_update_auth"
ON public.products FOR UPDATE
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
    WHERE s.id::text = products.store_id::text
      AND s.vendor_id::text = auth.uid()::text
      AND public.store_has_active_access(s.id)
  )
);

CREATE POLICY "lot2_products_delete_auth"
ON public.products FOR DELETE
TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::text = products.store_id::text AND s.vendor_id::text = auth.uid()::text
  )
);

-- 4d. Commandes : seulement dans une boutique active avec accès valide
DROP POLICY IF EXISTS "lot1_orders_insert_public" ON public.orders;
CREATE POLICY "lot1_orders_insert_public"
ON public.orders FOR INSERT
TO anon, authenticated
WITH CHECK (
  COALESCE(status, 'nouvelle') = 'nouvelle'
  AND COALESCE(payment_status, 'en_attente') = 'en_attente'
  AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::text = orders.store_id::text
      AND s.status = 'active'
      AND public.store_has_active_access(s.id)
  )
);

-- 5. Boutiques déjà existantes sans essai : un essai unique de 3 jours à partir de maintenant
-- (une seule boutique par vendeur reçoit cet essai ; les autres sont marquées "essai déjà utilisé")
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY vendor_id ORDER BY created_at ASC) AS rn
  FROM public.stores
  WHERE trial_end_date IS NULL AND COALESCE(trial_used, FALSE) = FALSE
)
UPDATE public.stores s
SET trial_start_date = NOW(),
    trial_end_date = NOW() + INTERVAL '3 days'
FROM ranked r
WHERE s.id = r.id AND r.rn = 1;

UPDATE public.stores
SET trial_used = TRUE
WHERE trial_end_date IS NULL AND COALESCE(trial_used, FALSE) = FALSE;

NOTIFY pgrst, 'reload schema';
