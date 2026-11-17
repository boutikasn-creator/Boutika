import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { updateStoreRowDb, updateSubscriptionDb } from '../../lib/db';
import type { PlanTierId } from '../../types';
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, RefreshCw, Send, Clock } from 'lucide-react';

/**
 * Panneau "Abonnements & essais" du Super Admin (affiché au-dessus du tableau de bord admin).
 *  - valider ou refuser les demandes d'activation de formule envoyées par les vendeurs ;
 *  - changer la formule d'une boutique (30 jours d'accès) ;
 *  - rouvrir un essai de 3 jours (geste commercial / support) ;
 *  - lancer les rappels de fin d'essai (e-mail + WhatsApp) sans attendre le passage automatique.
 */
export const AdminSubscriptionsPanel: React.FC = () => {
  const {
    currentUser,
    stores,
    plans,
    subscriptionRecords,
    activateSubscriptionRecord,
    setStorePlan,
    checkStoreTrialStatus,
    refreshData,
    formatFCFA,
    showToast
  } = useApp();

  const [open, setOpen] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [planChoice, setPlanChoice] = useState<Record<string, PlanTierId>>({});
  const [runningReminders, setRunningReminders] = useState(false);
  const [reminderSummary, setReminderSummary] = useState<string | null>(null);

  if (currentUser.role !== 'super_admin') return null;

  const pending = subscriptionRecords.filter((r) => r.status === 'en_attente_validation');

  const handleActivate = async (recordId: string) => {
    setBusyId(recordId);
    await activateSubscriptionRecord(recordId);
    setBusyId(null);
  };

  const handleReject = async (recordId: string) => {
    setBusyId(recordId);
    const res = await updateSubscriptionDb(recordId, { status: 'expire' });
    if (res.ok) {
      await refreshData('super_admin');
      showToast('Demande refusée.');
    } else {
      showToast(`Refus impossible : ${res.error}`);
    }
    setBusyId(null);
  };

  const handleApplyPlan = async (storeId: string, currentPlan: PlanTierId) => {
    setBusyId(storeId);
    await setStorePlan(storeId, planChoice[storeId] || currentPlan);
    setBusyId(null);
  };

  const handleReopenTrial = async (storeId: string) => {
    setBusyId(storeId);
    const res = await updateStoreRowDb(storeId, {
      trial_end_date: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
      trial_reminder_sent_at: null
    });
    if (res.ok) {
      await refreshData('super_admin');
      showToast('Essai rouvert pour 3 jours.');
    } else {
      showToast(`Action impossible : ${res.error}`);
    }
    setBusyId(null);
  };

  const handleRunReminders = async () => {
    setRunningReminders(true);
    setReminderSummary(null);
    try {
      const res = await fetch('/api/admin/trial-reminders/run', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setReminderSummary(data.message || 'Le serveur a refusé la demande (êtes-vous connecté en Super Admin ?).');
      } else {
        const extra = Array.isArray(data.details) && data.details.length ? ` — ${data.details.join(' | ')}` : '';
        setReminderSummary(`${data.checked} boutique(s) concernée(s), ${data.notified} vendeur(s) prévenu(s).${extra}`);
      }
    } catch {
      setReminderSummary('Serveur injoignable.');
    }
    setRunningReminders(false);
  };

  const accessLabel = (storeId: string) => {
    const store = stores.find((s) => s.id === storeId);
    if (!store) return { text: '-', cls: 'text-stone-500' };
    const st = checkStoreTrialStatus(store);
    const endDate = new Date(st.trialEndDate).toLocaleDateString('fr-FR');
    if (st.isPaid) return { text: `Abonnement actif jusqu'au ${endDate}`, cls: 'text-emerald-700' };
    if (!st.isExpired) return { text: `Essai jusqu'au ${endDate} (${st.daysRemaining} j)`, cls: 'text-amber-700' };
    return { text: `Bloquée depuis le ${endDate}`, cls: 'text-red-700' };
  };

  return (
    <div className="bg-white border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between gap-3 text-left"
        >
          <span className="font-heading font-black text-base text-stone-900 flex items-center gap-2 flex-wrap">
            Abonnements & essais
            {pending.length > 0 && (
              <span className="text-[11px] font-bold bg-amber-500 text-stone-950 px-2 py-0.5 rounded-full">
                {pending.length} demande{pending.length > 1 ? 's' : ''} en attente
              </span>
            )}
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-stone-500" /> : <ChevronDown className="w-4 h-4 text-stone-500" />}
        </button>

        {open && (
          <div className="pt-4 pb-3 space-y-6 text-xs">

            {/* Demandes en attente */}
            <div className="space-y-2">
              <p className="font-bold uppercase tracking-wider text-stone-500">Demandes d'activation</p>
              {pending.length === 0 ? (
                <p className="text-stone-500">Aucune demande en attente.</p>
              ) : (
                <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl">
                  {pending.map((rec) => (
                    <div key={rec.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-stone-900">
                          {rec.storeName} → formule {rec.planName} ({formatFCFA(rec.amount)})
                        </p>
                        <p className="text-stone-500">
                          {rec.paymentGateway} • Réf. {rec.transactionRef || 'N/A'} • demandée le{' '}
                          {new Date(rec.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={busyId === rec.id}
                          onClick={() => handleActivate(rec.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-lg flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Activer (30 jours)</span>
                        </button>
                        <button
                          type="button"
                          disabled={busyId === rec.id}
                          onClick={() => handleReject(rec.id)}
                          className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 disabled:opacity-60 text-stone-700 font-bold rounded-lg flex items-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Refuser</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-stone-400">
                N'activez une demande qu'après avoir reçu le paiement Wave ou Orange Money correspondant.
              </p>
            </div>

            {/* Boutiques : formule, accès, essai */}
            <div className="space-y-2">
              <p className="font-bold uppercase tracking-wider text-stone-500">Boutiques ({stores.length})</p>
              {stores.length === 0 ? (
                <p className="text-stone-500">Aucune boutique pour le moment.</p>
              ) : (
                <div className="overflow-x-auto border border-stone-200 rounded-xl">
                  <table className="w-full text-left">
                    <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Boutique</th>
                        <th className="py-2.5 px-3">Formule</th>
                        <th className="py-2.5 px-3">Accès</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-700">
                      {stores.map((store) => {
                        const acc = accessLabel(store.id);
                        const planKey: PlanTierId = store.planId === 'decouverte' ? 'standard' : store.planId;
                        return (
                          <tr key={store.id}>
                            <td className="py-2.5 px-3 font-bold text-stone-900">{store.name}</td>
                            <td className="py-2.5 px-3">
                              <select
                                value={planChoice[store.id] || planKey}
                                onChange={(e) => setPlanChoice((prev) => ({ ...prev, [store.id]: e.target.value as PlanTierId }))}
                                className="border border-stone-300 rounded-lg px-2 py-1 bg-white font-medium"
                              >
                                {plans.map((p) => (
                                  <option key={p.id} value={p.id}>{p.name} ({formatFCFA(p.priceMonthly)})</option>
                                ))}
                              </select>
                            </td>
                            <td className={`py-2.5 px-3 font-semibold ${acc.cls}`}>{acc.text}</td>
                            <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                disabled={busyId === store.id}
                                onClick={() => handleApplyPlan(store.id, planKey)}
                                className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 disabled:opacity-60 text-white font-bold rounded-lg"
                              >
                                Appliquer (30 jours)
                              </button>
                              <button
                                type="button"
                                disabled={busyId === store.id}
                                onClick={() => handleReopenTrial(store.id)}
                                className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 disabled:opacity-60 text-amber-900 font-bold rounded-lg inline-flex items-center gap-1"
                              >
                                <Clock className="w-3 h-3" />
                                <span>Rouvrir l'essai (3 j)</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Rappels de fin d'essai */}
            <div className="space-y-2">
              <p className="font-bold uppercase tracking-wider text-stone-500">Rappels de fin d'essai</p>
              <p className="text-stone-500 leading-relaxed">
                Le serveur envoie automatiquement, toutes les 6 heures, un e-mail et un message WhatsApp aux vendeurs dont l'essai se termine dans les 24 prochaines heures. Vous pouvez lancer un passage maintenant.
              </p>
              <button
                type="button"
                disabled={runningReminders}
                onClick={handleRunReminders}
                className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-60 text-white font-bold rounded-lg inline-flex items-center gap-2"
              >
                {runningReminders ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Lancer les rappels maintenant</span>
              </button>
              {reminderSummary && (
                <p className="text-[11px] font-semibold text-stone-700 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                  {reminderSummary}
                </p>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
