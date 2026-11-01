import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Store, 
  ArrowLeft, 
  ArrowRight, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  KeyRound
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { 
    setCurrentView, 
    signInWithSupabase, 
    resetPasswordWithSupabase,
    isSupabaseConfigured, 
    showToast
  } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot password sub-state
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Veuillez renseigner votre adresse e-mail et votre mot de passe.');
      return;
    }

    setIsSubmitting(true);
    const res = await signInWithSupabase(email, password);
    setIsSubmitting(false);

    if (res.success) {
      showToast('Connexion réussie !');
      if (res.role === 'super_admin') {
        setCurrentView('admin-dashboard');
      } else {
        setCurrentView('vendor-dashboard');
      }
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !resetEmail.includes('@')) {
      setErrorMessage('Veuillez saisir une adresse e-mail valide pour la réinitialisation.');
      return;
    }

    setIsResetSubmitting(true);
    setErrorMessage(null);
    const res = await resetPasswordWithSupabase(resetEmail);
    setIsResetSubmitting(false);

    if (res.success) {
      setResetSuccessMessage(res.message);
    } else {
      setErrorMessage(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100/60 py-10 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      
      {/* Top Header */}
      <div className="w-full max-w-md mb-6 flex items-center justify-between">
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

      {/* Main Card */}
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-200 space-y-6">
        
        {isForgotPasswordMode ? (
          /* FORGOT PASSWORD SCREEN */
          <div className="space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-2xs">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="font-heading font-black text-2xl text-stone-900">
                Mot de passe oublié ?
              </h2>
              <p className="text-xs text-stone-600 leading-relaxed max-w-xs mx-auto">
                Indiquez l'adresse e-mail de votre boutique pour recevoir un lien sécurisé de réinitialisation.
              </p>
            </div>

            {resetSuccessMessage ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-950 space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="font-medium leading-relaxed">{resetSuccessMessage}</p>
                </div>
                <button
                  onClick={() => {
                    setIsForgotPasswordMode(false);
                    setResetSuccessMessage(null);
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-2xs transition-colors"
                >
                  Retourner à la connexion
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Adresse e-mail du compte *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="votre.email@boutika.sn"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isResetSubmitting}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {isResetSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Envoi en cours...</span>
                    </>
                  ) : (
                    <span>Envoyer le lien de réinitialisation</span>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPasswordMode(false);
                      setErrorMessage(null);
                    }}
                    className="text-stone-500 hover:text-stone-900 font-bold"
                  >
                    Annuler et revenir à la connexion
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* STANDARD LOGIN SCREEN */
          <>
            <div className="text-center space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                Espace Commerçant
              </span>
              <h1 className="font-heading font-black text-2xl sm:text-3xl text-stone-900 pt-1">
                Connexion à Boutika
              </h1>
              <p className="text-xs text-stone-600 leading-relaxed">
                Connectez-vous pour gérer votre catalogue et vos commandes.
              </p>
            </div>

            {/* Warning if Supabase is not configured */}
            {!isSupabaseConfigured && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 text-xs flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Supabase non configuré :</p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Les variables <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> doivent être injectées pour l'authentification réelle.
                  </p>
                </div>
              </div>
            )}

            {/* Error display */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
              
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
                    placeholder="votre.email@boutika.sn"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-stone-700 uppercase tracking-wider">
                    Mot de passe *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPasswordMode(true);
                      setResetEmail(email);
                      setErrorMessage(null);
                    }}
                    className="text-[11px] text-amber-700 hover:underline font-semibold"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
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

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-extrabold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Connexion en cours...</span>
                    </>
                  ) : (
                    <>
                      <span>Se connecter</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Link to Register */}
              <div className="text-center pt-3 border-t border-stone-100">
                <p className="text-stone-500 text-xs">
                  Pas encore de boutique ?{' '}
                  <button
                    type="button"
                    onClick={() => setCurrentView('register')}
                    className="font-bold text-amber-700 hover:underline"
                  >
                    Créer mon compte gratuitement
                  </button>
                </p>
              </div>

            </form>
          </>
        )}

      </div>

    </div>
  );
};
