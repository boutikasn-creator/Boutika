import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
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
  Check
} from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { 
    setCurrentView, 
    signUpWithSupabase, 
    isSupabaseConfigured, 
    showToast 
  } = useApp();

  // Form inputs
  const [fullName, setFullName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [phone, setPhone] = useState('+221 ');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Live slug preview
  const slugPreview = storeName
    ? storeName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    : 'votre-boutique';

  const validateForm = (): boolean => {
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Veuillez indiquer votre nom complet.');
      return false;
    }
    if (!storeName.trim()) {
      setErrorMessage('Veuillez indiquer le nom de votre boutique.');
      return false;
    }
    if (!phone.trim() || phone.trim() === '+221') {
      setErrorMessage('Veuillez renseigner votre numéro WhatsApp professionnel.');
      return false;
    }
    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setErrorMessage('Veuillez renseigner une adresse e-mail valide.');
      return false;
    }
    if (password.length < 8) {
      setErrorMessage('Le mot de passe doit comporter au moins 8 caractères.');
      return false;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Les mots de passe saisis ne correspondent pas.');
      return false;
    }
    if (!acceptTerms) {
      setErrorMessage('Vous devez accepter les conditions d’utilisation et la politique de confidentialité.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!isSupabaseConfigured) {
      setErrorMessage(
        'Supabase n’est pas configuré. Veuillez renseigner VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY dans l’environnement pour activer la création de compte.'
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await signUpWithSupabase(email, password, fullName, phone, storeName);
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

  // Screen when email confirmation is required
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
            <p>1. Ouvrez votre messagerie et cherchez l'e-mail de confirmation.</p>
            <p>2. Cliquez sur le lien pour valider votre compte.</p>
            <p>3. Revenez sur Boutika pour vous connecter à votre boutique.</p>
            <p className="text-[11px] text-stone-400 pt-1">
              Astuce : Pensez à vérifier vos courriers indésirables (Spams) si vous ne le recevez pas sous 2 minutes.
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

  return (
    <div className="min-h-screen bg-stone-100/60 py-10 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      
      {/* Top Navigation */}
      <div className="w-full max-w-xl mb-6 flex items-center justify-between">
        <button
          onClick={() => setCurrentView('home')}
          className="inline-flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-stone-900 bg-white px-3.5 py-2 rounded-xl border border-stone-200 shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à l'accueil</span>
        </button>

        <div 
          onClick={() => setCurrentView('home')}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-orange-600 flex items-center justify-center text-white shadow-xs">
            <Store className="w-4 h-4" />
          </div>
          <span className="font-heading font-black text-xl text-stone-900 tracking-tight">
            Boutika
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 uppercase">
            SN
          </span>
        </div>
      </div>

      {/* Main Registration Card */}
      <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-stone-200 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
            Inscription Vendeur Gratuite
          </span>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-stone-900 pt-1">
            Créez votre boutique en ligne
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-md mx-auto">
            Présentez vos articles avec photos, fixez vos prix en Francs CFA et recevez des commandes prêtes sur WhatsApp. Aucune compétence technique requise.
          </p>
        </div>

        {/* Warning if Supabase is not configured */}
        {!isSupabaseConfigured && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Backend Supabase en cours de configuration :</p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Les variables <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> doivent être injectées pour enregistrer votre compte dans la base de données PostgreSQL.
              </p>
            </div>
          </div>
        )}

        {/* Error alert */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Nom complet */}
          <div>
            <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
              Votre Nom & Prénom *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="ex: Aminata Diallo"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all font-medium"
              />
            </div>
          </div>

          {/* Nom de la boutique & Slug preview */}
          <div>
            <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
              Nom de votre boutique *
            </label>
            <div className="relative">
              <Store className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="ex: Teranga Wax & Mode"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all font-medium"
              />
            </div>
            {storeName && (
              <p className="text-[11px] text-stone-500 mt-1 flex items-center gap-1 font-mono">
                <span className="text-stone-400">Lien public :</span>
                <span className="text-amber-700 font-bold">boutika.sn/v/{slugPreview}</span>
              </p>
            )}
          </div>

          {/* WhatsApp & Email in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                WhatsApp Vendeur *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+221 77 123 45 67"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none font-mono font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                Adresse e-mail *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="aminata@commerce.sn"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none font-medium"
                />
              </div>
            </div>
          </div>

          {/* Password & Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                Mot de passe (8 car. min) *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-stone-400 hover:text-stone-700 p-0.5"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                Confirmer mot de passe *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-stone-400 hover:text-stone-700 p-0.5"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Terms checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded mt-0.5 shrink-0 focus:ring-amber-500"
              />
              <span className="text-stone-600 text-[11px] leading-relaxed">
                J'accepte les{' '}
                <button
                  type="button"
                  onClick={() => setCurrentView('legal-terms')}
                  className="text-amber-700 font-bold hover:underline"
                >
                  Conditions Générales d'Utilisation
                </button>{' '}
                et la{' '}
                <button
                  type="button"
                  onClick={() => setCurrentView('legal-privacy')}
                  className="text-amber-700 font-bold hover:underline"
                >
                  Politique de Confidentialité
                </button>{' '}
                de Boutika (Conformité CDP Sénégal).
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-extrabold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Création de votre boutique en cours...</span>
                </>
              ) : (
                <>
                  <span>Créer ma boutique gratuitement</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Switch to Login */}
          <div className="text-center pt-3 border-t border-stone-100">
            <p className="text-stone-500 text-xs">
              Vous possédez déjà une boutique ?{' '}
              <button
                type="button"
                onClick={() => setCurrentView('login')}
                className="font-bold text-amber-700 hover:underline"
              >
                Se connecter
              </button>
            </p>
          </div>

        </form>

        {/* Security badge footer */}
        <div className="pt-2 border-t border-stone-100 flex items-center justify-center gap-2 text-[11px] text-stone-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Données protégées par Row Level Security (RLS) sur PostgreSQL</span>
        </div>

      </div>

    </div>
  );
};
