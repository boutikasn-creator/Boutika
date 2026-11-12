-- ==============================================================================
-- BOUTIKA : LOT 2 - FORMULES PAYANTES, ESSAI DE 3 JOURS, LOGOS
-- Fichier : supabase/migrations/20261101000004_lot2_plans_trial_logos.sql
--
-- 1. Plus aucune formule gratuite : les anciennes boutiques "decouverte" passent en "standard".
-- 2. L'essai de 3 jours est posé par la BASE à la création de la boutique :
--      - une seule boutique par vendeur ;
--      - un seul essai par numéro WhatsApp (un numéro déjà utilisé par une autre boutique
--        n'a pas de nouvel essai : la boutique est bloquée tant qu'une formule n'est pas activée).
-- 3. Le vendeur peut choisir Standard, Premium ou VIP à l'inscription, jamais une autre valeur.
-- 4. Création du stockage public des logos (bucket "store-logos").
--
-- Idempotent : peut être rejoué sans risque. Ne supprime AUCUNE donnée.
-- ==============================================================================

-- 1. Plus de formule gratuite
ALTER TABLE public.stores ALTER COLUMN plan_id SET DEFAULT 'standard';
UPDATE public.stores SET plan_id = 'standard' WHERE plan_id IS NULL OR plan_id = 'decouverte';

-- Boutiques d'avant le lot 2 (comptes de test) : un essai de 3 jours à compter d'aujourd'hui,
-- uniquement pour celles qui n'ont encore aucune date d'essai.
UPDATE public.stores
SET trial_start_date = NOW(),
    trial_end_date = NOW() + INTERVAL '3 days',
    trial_used = TRUE
WHERE trial_start_date IS NULL;

-- 2. Un vendeur choisit sa formule parmi les trois seulement
DROP POLICY IF EXISTS "lot1_stores_insert_auth" ON public.stores;
DROP POLICY IF EXISTS "lot2_stores_insert_auth" ON public.stores;
CREATE POLICY "lot2_stores_insert_auth"
ON public.stores FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (
    vendor_id::text = auth.uid()::text
    AND COALESCE(plan_id, 'standard') IN ('standard', 'premium', 'vip')
    AND COALESCE(is_founding_store, FALSE) = FALSE
    AND COALESCE(is_vip_promoted, FALSE) = FALSE
  )
);

-- 3. Règles de l'essai gratuit, appliquées par la base (impossibles à contourner depuis le navigateur)
CREATE OR REPLACE FUNCTION public.enforce_store_trial_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_service_role BOOLEAN;
  v_digits TEXT;
BEGIN
  v_is_service_role := (
    COALESCE(auth.jwt() ->> 'role', '') = 'service_role'
    OR current_user IN ('service_role', 'postgres')
  );

  -- L'administration et le service interne gardent la main (création manuelle d'une boutique)
  IF v_is_service_role OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  -- Une seule boutique par vendeur
  IF EXISTS (SELECT 1 FROM public.stores WHERE vendor_id::text = NEW.vendor_id::text) THEN
    RAISE EXCEPTION 'Un vendeur ne peut créer qu’une seule boutique.';
  END IF;

  -- Formule : uniquement Standard, Premium ou VIP
  IF NEW.plan_id IS NULL OR NEW.plan_id NOT IN ('standard', 'premium', 'vip') THEN
    NEW.plan_id := 'standard';
  END IF;

  NEW.trial_used := TRUE;
  NEW.trial_start_date := NOW();

  -- Un numéro WhatsApp déjà utilisé par une autre boutique n'a plus droit à l'essai gratuit
  v_digits := regexp_replace(COALESCE(NEW.whatsapp_number, ''), '[^0-9]', '', 'g');
  IF v_digits <> '' AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE regexp_replace(COALESCE(s.whatsapp_number, ''), '[^0-9]', '', 'g') = v_digits
  ) THEN
    NEW.trial_end_date := NOW();
  ELSE
    NEW.trial_end_date := NOW() + INTERVAL '3 days';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_store_trial_rules ON public.stores;
CREATE TRIGGER trg_enforce_store_trial_rules
BEFORE INSERT ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.enforce_store_trial_rules();

-- 4. Stockage public des logos de boutiques (images uniquement, 2 Mo maximum)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-logos',
  'store-logos',
  TRUE,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = TRUE,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

-- Lecture publique ; écriture réservée au vendeur connecté, dans SON dossier (nommé d'après son identifiant)
DROP POLICY IF EXISTS "lot2_logos_read_public" ON storage.objects;
CREATE POLICY "lot2_logos_read_public"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'store-logos');

DROP POLICY IF EXISTS "lot2_logos_insert_own" ON storage.objects;
CREATE POLICY "lot2_logos_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'store-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "lot2_logos_update_own" ON storage.objects;
CREATE POLICY "lot2_logos_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'store-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "lot2_logos_delete_own" ON storage.objects;
CREATE POLICY "lot2_logos_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'store-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

NOTIFY pgrst, 'reload schema';
