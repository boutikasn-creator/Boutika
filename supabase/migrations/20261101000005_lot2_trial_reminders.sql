-- ==============================================================================
-- BOUTIKA : LOT 2 (suite) - RAPPELS DE FIN D'ESSAI
-- Fichier : supabase/migrations/20261101000005_lot2_trial_reminders.sql
--
-- Ajoute :
--   - stores.trial_reminder_sent_at : date d'envoi du rappel (un seul rappel par essai) ;
--   - trial_notifications : journal des envois (e-mail / WhatsApp), lisible par le Super Admin.
-- Idempotent : peut être rejoué sans risque. Ne supprime AUCUNE donnée.
-- ==============================================================================

ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS trial_reminder_sent_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.trial_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trial_notifications_store ON public.trial_notifications(store_id);

ALTER TABLE public.trial_notifications ENABLE ROW LEVEL SECURITY;

-- Seul le Super Admin lit le journal ; les écritures viennent du serveur (clé de service, qui ignore la RLS)
DROP POLICY IF EXISTS "lot2_trial_notifications_admin_select" ON public.trial_notifications;
CREATE POLICY "lot2_trial_notifications_admin_select"
ON public.trial_notifications FOR SELECT
TO authenticated
USING (public.is_super_admin());

GRANT SELECT ON public.trial_notifications TO authenticated;

NOTIFY pgrst, 'reload schema';
