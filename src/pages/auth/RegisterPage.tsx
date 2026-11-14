import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BUSINESS_TYPES, SENEGAL_CITIES, TRIAL_DAYS } from '../../data/plans';
import type { PlanTierId } from '../../types';
import { 
  Store, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  RefreshCw,
  ShieldCheck,
  MapPin
} from 'lucide-react';

/**
 * Inscription vendeur en 3 étapes :
 *   1. Votre compte      (nom, WhatsApp, e-mail, mot de passe)
 *   2. Votre boutique    (nom, description, type de commerce, ville, adresse)
 *   3. Votre formule     (Standard / Premium / VIP) -> démarre l'essai gratuit de 3 jours
 * La formule n'est PAS présélectionnée : le vendeur doit cliquer sur celle qu'il veut.
 * Le logo est ajouté à la première connexion (après confirmation de l'e-mail), car l'envoi d'une image
 * demande un compte connecté.
 */
export const RegisterPage: React.FC = () => {
  const { 
    setCurrentView, 
    signUpWithSupabase, 
    isSupabaseConfigured, 
    showToast,
    plans,
    formatFCFA
  } = useApp();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Étape 1
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+221 ');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Étape 2
  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [city, setCity] = useState('Dakar');
  const [address, setAddress] = useState('');

  // Étape 3 : aucune formule n'est présélectionnée
  const [planId, setPlanId] = useState<PlanTierId | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // UI
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const slugPreview = storeName
    ? storeName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    : 'votre-boutique';

  const chosenPlan = plans.find((p) => p.id === planId);

  const validateStep1 = (): boolean => {
    if (!fullName.trim()) { setErrorMessage('Veuillez indiquer votre nom complet.'); return false; }
    if (!phone.trim() || phone.replace(/[^0-9]/g, '').length < 9) {
      setErrorMessage('Veuillez renseigner votre numéro WhatsApp professionnel.');
      return false;
    }
    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setErrorMessage('Veuillez renseigner une adresse e-mail valide.');
      return false;
    }
    if (password.length < 8) { setErrorMessage('Le mot de passe doit comporter au moins 8 caractères.'); return false; }
    if (password !== confirmPassword) { setErrorMessage('Les mots de passe saisis ne correspondent pas.'); return false; }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!storeName.trim()) { setErrorMessage('Veuillez indiquer le nom de votre boutique.'); return false; }
    if (!businessType) { setErrorMessage('Veuillez choisir votre type de commerce.'); return false; }
    if (!city) { setErrorMessage('Veuillez choisir votre ville.'); return false; }
    return true;
  };

  const goNext = () => {
    setErrorMessage(null);
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const goBack = () => {
    setErrorMessage(null);
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 3) { goNext(); return; }
    setErrorMessage(null);

    if (!validateStep1()) { setStep(1); return; }
    if (!validateStep2()) { setStep(2); return; }
    if (!planId) {
      setErrorMessage('Veuillez choisir votre formule (Standard, Premium ou VIP) en cliquant sur l’une des trois cartes.');
      return;
    }
    if (!acceptTerms) {
      setErrorMessage('Vous devez accepter les conditions d’utilisation et la politique de confidentialité.');
      return;
    }
    if (!isSupabaseConfigured) {
      setErrorMessage('Supabase n’est pas configuré. Veuillez renseigner VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY.');
      return;
    }

    setIsSubmitting(true);
    const res = await signUpWithSupabase(email, password, fullName, phone, storeName, {
      description: description.trim(),
      businessType,
      city,
      address: address.trim(),
      planId
    });
    setIsSubmitting(false);

    if (res.success) {
      if (res.requiresEmailConfirmation) {
        setEmailConfirmationRequired(true);
        setRegisteredEmail(email);
      } else {
        showToast('Votre compte et votre boutique ont été créés avec succès !');
        setCurrentView('vendor-dashboard');
      }
    } else {
      setErrorMessage(res.message);
    }
  };

  // Écran : confirmation de l'e-mail à faire
  if (emailConfirmationRequired) {
    return (
      <div className="min-h-screen bg-stone-100/60 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-stone-200 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <Mail className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Vérification requise
            </span>
            <h2 className="font-heading font-black text-2xl sm:text-3xl text-stone-900">
              Vérifiez votre boîte e-mail !
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed pt-2">
              Un message de confirmation sécurisé a été envoyé à :
            </p>
            <p className="font-mono font-bold text-sm text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200">
              {registeredEmail}
            </p>
          </div>

          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-600 text-left space-y-2 leading-relaxed">
            <p className="font-bold text-stone-800">Prochaines étapes :</p>
            <p>1. Ouvrez votre messagerie et cliquez sur le lien de confirmation.</p>
            <p>2. Connectez-vous à Boutika : votre boutique est créée et votre essai gratuit de {TRIAL_DAYS} jours démarre{chosenPlan ? ` avec la formule ${chosenPlan.name}` : ''}.</p>
            <p>3. Ajoutez votre logo et vos premiers produits.</p>
            <p className="text-[11px] text-stone-400 pt-1">
              Astuce : pensez à vérifier vos courriers indésirables (spams) si vous ne le recevez pas sous 2 minutes.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <button
              onClick={() => setCurrentView('login')}
              className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <span>Aller à la page de connexion</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentView('home')}
              className="w-full py-2.5 text-xs text-stone-500 hover:text-stone-800 font-semibold"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stepLabels = ['Votre compte', 'Votre boutique', 'Votre formule'];
  const inputCls =
    'w-full pl-10 pr-3.5 py-2.5 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all font-medium';
  const plainInputCls =
    'w-full px-3.5 py-2.5 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all font-medium bg-white';

  return (
    <div className="min-h-screen bg-stone-100/60 py-10 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      
      {/* Top Navigation */}
      <div className="w-full max-w-2xl mb-6 flex items-center justify-between">
        <button
          onClick={() => setCurrentView('home')}
          className="inline-flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-stone-900 bg-white px-3.5 py-2 rounded-xl border border-stone-200 shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à l'accueil</span>
        </button>

        <div onClick={() => setCurrentView('home')} className="flex items-center gap-2 cursor-pointer group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-orange-600 flex items-center justify-center text-white shadow-xs">
            <Store className="w-4 h-4" />
          </div>
          <span className="font-heading font-black text-xl text-stone-900 tracking-tight">Boutika</span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 uppercase">SN</span>
        </div>
      </div>

      {/* Main Registration Card */}
      <div className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-stone-200 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
            Essai gratuit de {TRIAL_DAYS} jours
          </span>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-stone-900 pt-1">
            Créez votre boutique en ligne
          </h1>
        </div>

        {/* Stepper */}
        <ol className="flex items-center justify-between gap-2">
          {stepLabels.map((label, i) => {
            const n = i + 1;
            const done = step > n;
            const current = step === n;
            return (
              <li key={label} className="flex-1 flex flex-col items-center gap-1">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                    done ? 'bg-emerald-600 text-white' : current ? 'bg-amber-600 text-white' : 'bg-stone-200 text-stone-500'
                  }`}
                >
                  {done ? <CheckCircle2 className="w-4 h-4" /> : n}
                </span>
                <span className={`text-[11px] font-bold text-center ${current ? 'text-stone-900' : 'text-stone-400'}`}>
                  {label}
                </span>
              </li>
            );
          })}
        </ol>

        {!isSupabaseConfigured && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Backend Supabase en cours de configuration :</p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Les variables <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> doivent être renseignées.
              </p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">

          {/* ---------------- ÉTAPE 1 : COMPTE ---------------- */}
          {step === 1 && (
            <>
              <div>
                <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">Votre nom & prénom *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                    placeholder="ex: Aminata Diallo" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">WhatsApp vendeur *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                      placeholder="+221 77 123 45 67" className={`${inputCls} font-mono`} />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">Adresse e-mail *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="aminata@commerce.sn" className={inputCls} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">Mot de passe (8 car. min) *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                    <input type={showPassword ? 'text' : 'password'} value={password}
                      onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••"
                      className={`${inputCls} pr-10`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-stone-400 hover:text-stone-700 p-0.5" tabIndex={-1}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">Confirmer le mot de passe *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                    <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••••••"
                      className={`${inputCls} pr-10`} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-stone-400 hover:text-stone-700 p-0.5" tabIndex={-1}>
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ---------------- ÉTAPE 2 : BOUTIQUE ---------------- */}
          {step === 2 && (
            <>
              <div>
                <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">Nom de votre boutique *</label>
                <div className="relative">
                  <Store className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)}
                    placeholder="ex: Teranga Wax & Mode" className={inputCls} />
                </div>
                {storeName && (
                  <p className="text-[11px] text-stone-500 mt-1 flex items-center gap-1 font-mono">
                    <span className="text-stone-400">Lien public :</span>
                    <span className="text-amber-700 font-bold">boutika.sn/v/{slugPreview}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">Courte description</label>
                <textarea value={description} maxLength={240} rows={3}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Que vendez-vous ? Qu'est-ce qui vous rend unique ?"
                  className={plainInputCls} />
                <p className="text-[11px] text-stone-400 mt-0.5 text-right">{description.length}/240</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">Type de commerce *</label>
                  <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} className={plainInputCls}>
                    <option value="">Choisir...</option>
                    {BUSINESS_TYPES.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">Ville *</label>
                  <select value={city} onChange={(e) => setCity(e.target.value)} className={plainInputCls}>
                    {SENEGAL_CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">Adresse / quartier de la boutique</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                    placeholder="ex: Sacré-Cœur 3, près du marché" className={inputCls} />
                </div>
              </div>

              <p className="text-[11px] text-stone-500 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2">
                Votre logo s'ajoute à votre première connexion, juste après la confirmation de votre e-mail.
              </p>
            </>
          )}

          {/* ---------------- ÉTAPE 3 : FORMULE ---------------- */}
          {step === 3 && (
            <>
              <p className="text-stone-600 text-xs leading-relaxed">
                Cliquez sur la formule de votre choix. Vous profitez de <strong>{TRIAL_DAYS} jours d'essai gratuit</strong> (une seule fois),
                puis vous activez cette formule, ou vous en changez, pour garder l'accès à votre tableau de bord.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {plans.map((p) => {
                  const active = planId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setPlanId(p.id); setErrorMessage(null); }}
                      className={`relative text-left rounded-2xl border-2 p-4 transition-all ${
                        active ? 'border-amber-600 bg-amber-50/40 shadow-md' : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      {p.popular && (
                        <span className="absolute -top-2.5 left-3 text-[10px] font-black uppercase bg-amber-600 text-white px-2 py-0.5 rounded-full">
                          Populaire
                        </span>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-black text-base text-stone-900">{p.name}</span>
                        {active && <CheckCircle2 className="w-5 h-5 text-amber-600" />}
                      </div>
                      <p className="mt-1 text-xl font-black text-stone-900">
                        {formatFCFA(p.priceMonthly)}
                        <span className="text-[11px] font-semibold text-stone-500"> / mois</span>
                      </p>
                      <p className="text-[11px] text-stone-500 mt-0.5">Jusqu'à {p.maxProducts} produits</p>
                      <ul className="mt-2 space-y-1">
                        {p.features.slice(0, 4).map((f) => (
                          <li key={f} className="text-[11px] text-stone-600 flex gap-1.5 leading-snug">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>

              <p className={`text-xs font-bold text-center rounded-xl py-2 border ${
                chosenPlan ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : 'text-stone-500 bg-stone-50 border-stone-200'
              }`}>
                {chosenPlan
                  ? `Formule choisie : ${chosenPlan.name} (${formatFCFA(chosenPlan.priceMonthly)} / mois après l'essai)`
                  : 'Aucune formule choisie pour le moment'}
              </p>

              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded mt-0.5 shrink-0 focus:ring-amber-500" />
                  <span className="text-stone-600 text-[11px] leading-relaxed">
                    J'accepte les{' '}
                    <button type="button" onClick={() => setCurrentView('legal-terms')} className="text-amber-700 font-bold hover:underline">
                      Conditions Générales d'Utilisation
                    </button>{' '}
                    et la{' '}
                    <button type="button" onClick={() => setCurrentView('legal-privacy')} className="text-amber-700 font-bold hover:underline">
                      Politique de Confidentialité
                    </button>{' '}
                    de Boutika (conformité CDP Sénégal).
                  </span>
                </label>
              </div>
            </>
          )}

          {/* ---------------- BOUTONS ---------------- */}
          <div className="pt-3 flex flex-col-reverse sm:flex-row gap-3">
            {step > 1 && (
              <button type="button" onClick={goBack}
                className="sm:w-40 py-3 border border-stone-300 text-stone-700 font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-stone-50">
                <ArrowLeft className="w-4 h-4" />
                <span>Retour</span>
              </button>
            )}
            {step < 3 ? (
              <button type="button" onClick={goNext}
                className="flex-1 py-3 px-6 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm">
                <span>Continuer</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="submit" disabled={isSubmitting || !planId}
                className="flex-1 py-3 px-6 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm">
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Création de votre boutique...</span>
                  </>
                ) : (
                  <>
                    <span>Démarrer mon essai gratuit de {TRIAL_DAYS} jours</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>

          <div className="text-center pt-3 border-t border-stone-100">
            <p className="text-stone-500 text-xs">
              Vous possédez déjà une boutique ?{' '}
              <button type="button" onClick={() => setCurrentView('login')} className="font-bold text-amber-700 hover:underline">
                Se connecter
              </button>
            </p>
          </div>
        </form>

        <div className="pt-2 border-t border-stone-100 flex items-center justify-center gap-2 text-[11px] text-stone-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Données protégées par Row Level Security (RLS) sur PostgreSQL</span>
        </div>
      </div>
    </div>
  );
};
