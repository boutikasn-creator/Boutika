-- ==============================================================================
-- BOUTIKA : NETTOYAGE DES COMPTES ET DONNÉES DE TEST (À LANCER À LA MAIN)
-- (v2 : adapté à votre base réelle — les e-mails sont lus dans auth.users,
--  la table profiles n'ayant pas de colonne e-mail)
--
-- À exécuter dans Supabase > SQL Editor, JAMAIS automatiquement.
--
-- Principe : on garde les Super Admin + les e-mails que vous listez ci-dessous,
-- et on supprime TOUT le reste (comptes, boutiques, produits, commandes...).
--
-- MODE D'EMPLOI
--  1. Lancez d'abord uniquement l'ÉTAPE 1 (aperçu) pour voir tous les comptes.
--  2. Renseignez les e-mails à conserver dans l'ÉTAPE 2.
--  3. Faites une sauvegarde (Supabase > Database > Backups).
--  4. Lancez les ÉTAPES 2 à 4. La transaction se termine par ROLLBACK par défaut :
--     relisez les chiffres affichés, puis remplacez ROLLBACK par COMMIT et relancez.
-- ==============================================================================

-- ÉTAPE 1 : APERÇU (lecture seule)
SELECT u.id, u.email, p.role, u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at;

SELECT id, name, slug, vendor_id, plan_id, status, created_at FROM public.stores ORDER BY created_at;

-- ÉTAPES 2 à 4 : SUPPRESSION
BEGIN;

-- ÉTAPE 2 : comptes à CONSERVER (ajoutez les e-mails entre les apostrophes, séparés par des virgules)
CREATE TEMP TABLE keep_users ON COMMIT DROP AS
SELECT u.id
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.role = 'super_admin'
   OR lower(u.email) = ANY (ARRAY[
        -- 'mon.email@exemple.com',
        '__aucun__'
      ]::TEXT[]);

SELECT 'Comptes conservés' AS info, count(*) AS total FROM keep_users;

-- ÉTAPE 3 : données métier liées aux comptes supprimés
CREATE TEMP TABLE drop_stores ON COMMIT DROP AS
SELECT id::text AS id FROM public.stores
WHERE vendor_id IS NULL OR vendor_id NOT IN (SELECT id FROM keep_users);

DELETE FROM public.payment_events
WHERE order_id::text IN (SELECT id::text FROM public.orders WHERE store_id::text IN (SELECT id FROM drop_stores))
   OR order_number IN (SELECT order_number FROM public.orders WHERE store_id::text IN (SELECT id FROM drop_stores));

DELETE FROM public.orders WHERE store_id::text IN (SELECT id FROM drop_stores);
DELETE FROM public.product_variants
WHERE product_id::text IN (SELECT id::text FROM public.products WHERE store_id::text IN (SELECT id FROM drop_stores));
DELETE FROM public.products WHERE store_id::text IN (SELECT id FROM drop_stores);
DELETE FROM public.subscription_records WHERE store_id::text IN (SELECT id FROM drop_stores);
DELETE FROM public.trial_notifications WHERE store_id::text IN (SELECT id FROM drop_stores);
DELETE FROM public.stores WHERE id::text IN (SELECT id FROM drop_stores);

-- Messages de contact, journaux et missions issus des tests
DELETE FROM public.contact_messages;
DELETE FROM public.audit_logs;
DELETE FROM public.kimsi_missions;

-- ÉTAPE 4 : profils et comptes d'authentification
DELETE FROM public.profiles WHERE id NOT IN (SELECT id FROM keep_users);
DELETE FROM auth.users WHERE id NOT IN (SELECT id FROM keep_users);

-- Contrôle final avant validation
SELECT 'Boutiques restantes' AS info, count(*) AS total FROM public.stores
UNION ALL SELECT 'Produits restants', count(*) FROM public.products
UNION ALL SELECT 'Commandes restantes', count(*) FROM public.orders
UNION ALL SELECT 'Comptes restants', count(*) FROM auth.users;

-- Par sécurité : ROLLBACK annule tout. Remplacez par COMMIT quand les chiffres vous conviennent.
ROLLBACK;
-- COMMIT;
