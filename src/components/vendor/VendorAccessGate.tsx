import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { DEFAULT_LOGO_URL } from '../../lib/db';
import { BUSINESS_TYPES, SENEGAL_CITIES, TRIAL_DAYS } from '../../data/plans';
import type { PlanTierId } from '../../types';
import { Lock, Clock, CheckCircle2, Upload, Store, LogOut, RefreshCw } from 'lucide-react';

/**
 * Barrière d'accès du tableau de bord vendeur.
 *  1. Essai terminé et aucune formule active -> accès BLOQUÉ (choix et activation d'une formule).
 *  2. Première connexion -> étape "Complétez votre boutique" (logo, description, type de commerce, lieu).
 *  3. Pendant l'essai -> bandeau "X jour(s) restant(s)" au-dessus du tableau de bord.
 * Le tableau de bord lui-même n'est pas modifié : il est simplement envelopppé par cette barrière.
 */
export const VendorAccessGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    currentUser,
    activeStore,
    authStatus,
    checkStoreTrialStatus,
    plans,
    subscriptionRecords,
    simulateServerPaymentUpgrade,
    updateStoreProfile,
    signOutUser,
    formatFCFA,
    showToast
  } = useApp();

  // --- État : activation d'une formule ---
  const [selectedPlan, setSelectedPlan] = useState<PlanTierId>('premium');
  const [gateway, setGateway] = useState<'Wave' | 'Orange Money'>('Wave');
  const [busy, setBusy] = useState(false);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);

  // --- État : compléter la boutique ---
  const [description, setDescription] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setDescription(activeStore.description || '');
    setBusinessType(activeStore.businessType || '');
    setCity(activeStore.city || '');
    setAddress(activeStore.address || '');
    setLogoUrl(activeStore.logoUrl === DEFAULT_LOGO_URL ? '' : activeStore.logoUrl);
  }, [activeStore.id]);

  // Le vendeur seul est concerné ; l'admin et les visiteurs passent directement
  if (currentUser.role !== 'vendor' || authStatus !== 'ready' || !activeStore.id) {
    return <>{children}</>;
  }

  const trial = checkStoreTrialStatus(activeStore) as ReturnType<typeof checkStoreTrialStatus> & { isPaid?: boolean };

  // ---------------------------------------------------------------------------
  // 1. ACCÈS BLOQUÉ : essai terminé, aucune formule active
  // ---------------------------------------------------------------------------
  if (trial.isExpired) {
    const pending = subscriptionRecords.find(
      (r) => r.storeId === activeStore.id && r.status === 'en_attente_validation'
    );

    const handleActivate = async () => {
      setBusy(true);
      setRequestMessage(null);
      const res = await simulateServerPaymentUpgrade(selectedPlan, gateway);
      setBusy(false);
      setRequestMessage(res.message);
    };

    return (
      <div className="min-h-screen bg-stone-100/70 py-10 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-xl p-6 sm:p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="font-heading font-black text-2xl sm:text-3xl text-stone-900">
              Votre essai gratuit de {TRIAL_DAYS} jours est terminé
            </h1>
            <p className="text-sm text-stone-600 max-w-xl mx-auto leading-relaxed">
              Pour accéder à votre tableau de bord de <strong>{activeStore.name}</strong>, activez une formule.
              Vos produits et vos commandes sont conservés : rien n'est perdu.
            </p>
            {pending && (
              <p className="inline-block text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                Votre demande pour la formule {pending.planName} est en attente de validation par l'équipe Boutika.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((p) => {
              const active = selectedPlan === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPlan(p.id)}
                  className={`text-left rounded-2xl border-2 p-5 bg-white transition-all ${
                    active ? 'border-amber-600 shadow-lg' : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-black text-lg text-stone-900">{p.name}</span>
                    {active && <CheckCircle2 className="w-5 h-5 text-amber-600" />}
                  </div>
                  <p className="mt-1 text-2xl font-black text-stone-900">
                    {formatFCFA(p.priceMonthly)}
                    <span className="text-xs font-semibold text-stone-500"> / mois</span>
                  </p>
                  <p className="text-xs text-stone-500 mt-1">Jusqu'à {p.maxProducts} produits</p>
                </button>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-700">Moyen de paiement</p>
            <div className="flex flex-wrap gap-3">
              {(['Wave', 'Orange Money'] as const).map((g) => (
                <label
                  key={g}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer text-sm font-bold ${
                    gateway === g ? 'border-amber-600 bg-amber-50 text-amber-900' : 'border-stone-200 text-stone-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="gateway"
                    checked={gateway === g}
                    onChange={() => setGateway(g)}
                    className="accent-amber-600"
                  />
                  {g}
                </label>
              ))}
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Le paiement en ligne automatique arrive bientôt. Pour l'instant, votre demande est enregistrée et
              l'équipe Boutika active votre formule dès réception de votre paiement.
            </p>

            {requestMessage && (
              <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                {requestMessage}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={handleActivate}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-extrabold rounded-xl text-sm flex items-center justify-center gap-2"
              >
                {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                <span>Activer la formule {plans.find((p) => p.id === selectedPlan)?.name}</span>
              </button>
              <button
                type="button"
                onClick={() => signOutUser()}
                className="px-5 py-3 border border-stone-300 text-stone-700 font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-stone-50"
              >
                <LogOut className="w-4 h-4" />
                <span>Se déconnecter</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. COMPLÉTER LA BOUTIQUE (logo, description, type de commerce, lieu)
  // ---------------------------------------------------------------------------
  const doneKey = `boutika_onboarding_done_${activeStore.id}`;
  let onboardingDone = false;
  try {
    onboardingDone = localStorage.getItem(doneKey) === '1';
  } catch {
    onboardingDone = false;
  }
  void tick;

  const markDone = () => {
    try {
      localStorage.setItem(doneKey, '1');
    } catch {
      /* ignore */
    }
    setTick((t) => t + 1);
  };

  if (!onboardingDone && activeStore.logoUrl === DEFAULT_LOGO_URL) {
    const handleLogoFile = async (file: File) => {
      if (!supabase || !isSupabaseConfigured) {
        showToast('Supabase n’est pas configuré.');
        return;
      }
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        showToast('Format refusé : utilisez une image PNG, JPG ou WebP.');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        showToast('Image trop lourde : 2 Mo maximum.');
        return;
      }
      setUploading(true);
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `${currentUser.id}/${activeStore.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('store-logos')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) {
        showToast(`Logo non envoyé : ${error.message}`);
      } else {
        const { data } = supabase.storage.from('store-logos').getPublicUrl(path);
        setLogoUrl(data.publicUrl);
        showToast('Logo envoyé.');
      }
      setUploading(false);
    };

    const handleSave = () => {
      updateStoreProfile(activeStore.id, {
        description: description.trim(),
        businessType: businessType || undefined,
        city,
        address: address.trim(),
        ...(logoUrl ? { logoUrl } : {})
      });
      markDone();
    };

    return (
      <div className="min-h-screen bg-stone-100/70 py-10 px-4 flex items-start justify-center">
        <div className="w-full max-w-xl bg-white rounded-3xl border border-stone-200 shadow-xl p-6 sm:p-8 space-y-5">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <Store className="w-6 h-6" />
            </div>
            <h1 className="font-heading font-black text-2xl text-stone-900">Complétez votre boutique</h1>
            <p className="text-xs text-stone-600">
              Ajoutez votre logo et vérifiez vos informations : elles s'affichent sur votre vitrine.
            </p>
          </div>

          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl border border-stone-200 bg-stone-50 overflow-hidden flex items-center justify-center shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Store className="w-8 h-8 text-stone-300" />
              )}
            </div>
            <label className="flex-1 cursor-pointer">
              <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-800 hover:bg-stone-50">
                {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {logoUrl ? 'Changer le logo' : 'Ajouter mon logo'}
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleLogoFile(f);
                  e.target.value = '';
                }}
              />
              <p className="text-[11px] text-stone-500 mt-1">PNG, JPG ou WebP, 2 Mo maximum.</p>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Courte description
            </label>
            <textarea
              value={description}
              maxLength={240}
              rows={3}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Type de commerce
              </label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="">Choisir...</option>
                {BUSINESS_TYPES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">Ville</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 outline-none"
              >
                {!SENEGAL_CITIES.includes(city) && city ? <option value={city}>{city}</option> : null}
                {SENEGAL_CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Adresse / quartier de la boutique
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="ex: Sacré-Cœur 3, près du marché"
              className="w-full px-3.5 py-2.5 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={uploading}
              className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-extrabold rounded-xl text-sm"
            >
              Enregistrer et accéder à mon tableau de bord
            </button>
            <button
              type="button"
              onClick={markDone}
              className="px-5 py-3 border border-stone-300 text-stone-600 font-bold rounded-xl text-sm hover:bg-stone-50"
            >
              Plus tard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. TABLEAU DE BORD (avec bandeau d'essai si la formule n'est pas encore activée)
  // ---------------------------------------------------------------------------
  return (
    <>
      {!trial.isPaid && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-center text-xs text-amber-900 font-semibold flex items-center justify-center gap-2 flex-wrap">
          <Clock className="w-4 h-4 shrink-0" />
          <span>
            Essai gratuit : il vous reste {trial.daysRemaining} jour{trial.daysRemaining > 1 ? 's' : ''}.
            Activez une formule depuis l'onglet « Abonnement & Facturation » pour ne pas perdre l'accès.
          </span>
        </div>
      )}
      {children}
    </>
  );
};
