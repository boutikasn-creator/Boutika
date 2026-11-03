-- ==============================================================================
-- BOUTIKA : LOT 1 (suite) - COMPATIBILITÉ AVEC LES ANCIENNES COLONNES
-- Fichier : supabase/migrations/20261101000002_lot1_legacy_columns.sql
--
-- Vos tables contiennent d'anciennes colonnes (price_xof, total_xof, delivery_area,
-- whatsapp_phone, is_published, ...). Ce script :
--   1. les rend facultatives, pour que les nouveaux ajouts ne soient pas bloqués ;
--   2. retire les anciennes contraintes CHECK sur les statuts / paiements / formules,
--      qui refuseraient les valeurs utilisées par l'application ;
--   3. recopie les anciennes valeurs dans les nouvelles colonnes ;
--   4. demande à l'API Supabase de recharger son schéma.
-- Idempotent : peut être rejoué sans risque. Ne supprime AUCUNE donnée.
-- ==============================================================================

-- 1. Anciennes colonnes obligatoires -> facultatives
ALTER TABLE public.products ALTER COLUMN price_xof DROP NOT NULL;
ALTER TABLE public.products ALTER COLUMN compare_at_price_xof DROP NOT NULL;
ALTER TABLE public.products ALTER COLUMN image_url DROP NOT NULL;

ALTER TABLE public.orders ALTER COLUMN total_xof DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN delivery_area DROP NOT NULL;

ALTER TABLE public.stores ALTER COLUMN whatsapp_phone DROP NOT NULL;
ALTER TABLE public.stores ALTER COLUMN currency DROP NOT NULL;
ALTER TABLE public.stores ALTER COLUMN is_published DROP NOT NULL;

-- 2. Anciennes contraintes CHECK sur les statuts / paiements / formules
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname AS conname, rel.relname AS relname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND con.contype = 'c'
      AND rel.relname IN ('orders', 'stores')
      AND (
        pg_get_constraintdef(con.oid) ILIKE '%status%'
        OR pg_get_constraintdef(con.oid) ILIKE '%payment%'
        OR pg_get_constraintdef(con.oid) ILIKE '%plan_id%'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.relname, r.conname);
  END LOOP;
END $$;

-- 3. Reprise des anciennes valeurs dans les nouvelles colonnes (uniquement si vides)
UPDATE public.products SET price = price_xof
 WHERE (price IS NULL OR price = 0) AND price_xof IS NOT NULL;

UPDATE public.products SET compare_at_price = compare_at_price_xof
 WHERE compare_at_price IS NULL AND compare_at_price_xof IS NOT NULL;

UPDATE public.products SET images = jsonb_build_array(image_url)
 WHERE image_url IS NOT NULL AND image_url <> ''
   AND (images IS NULL OR images = '[]'::JSONB);

UPDATE public.orders SET total = total_xof
 WHERE (total IS NULL OR total = 0) AND total_xof IS NOT NULL;

UPDATE public.orders SET delivery_zone = delivery_area
 WHERE delivery_zone IS NULL AND delivery_area IS NOT NULL;

UPDATE public.stores SET whatsapp_number = whatsapp_phone
 WHERE whatsapp_number IS NULL AND whatsapp_phone IS NOT NULL;

-- 4. Recharger le schéma de l'API Supabase (nouvelles colonnes visibles immédiatement)
NOTIFY pgrst, 'reload schema';
