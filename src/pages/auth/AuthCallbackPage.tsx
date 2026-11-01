import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Store, 
  RefreshCw, 
  Mail, 
  AlertTriangle 
} from 'lucide-react';

export const AuthCallbackPage: React.FC = () => {
  const { 
    authCallbackMessage, 
    setCurrentView, 
    authStatus, 
    currentUser, 
    activeStore 
  } = useApp();

  const [counter, setCounter] = useState(5);

  const isSuccess = authCallbackMessage?.type === 'success' || authStatus === 'ready' || authStatus === 'connected_no_store';
  const isError = authCallbackMessage?.type === 'error';

  useEffect(() => {
    // If confirmation succeeds and user is ready, allow auto-redirection after countdown
    if (isSuccess && (authStatus === 'ready' || authStatus === 'connected_no_store')) {
      const timer = setInterval(() => {
        setCounter((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCurrentView('vendor-dashboard');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isSuccess, authStatus, setCurrentView]);

  return (
    <div className="min-h-screen bg-stone-100/70 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-stone-200 text-center space-y-6">
        
        {/* Logo Boutika */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-600 flex items-center justify-center text-white shadow-md">
            <Store className="w-5 h-5" />
          </div>
          <span className="font-heading font-black text-2xl text-stone-900 tracking-tight">
            Boutika
          </span>
        </div>

        {/* Status Illustration */}
        {isSuccess ? (
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs animate-bounce-subtle">
            <CheckCircle2 className="w-8 h-8" />
          </div>
        ) : isError ? (
          <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-xs">
            <XCircle className="w-8 h-8" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-xs animate-spin">
            <RefreshCw className="w-8 h-8" />
          </div>
        )}

        {/* Title & Description */}
        <div className="space-y-2">
          <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
            isSuccess 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : isError
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {isSuccess ? 'Confirmation Réussie' : isError ? 'Erreur de Validation' : 'Vérification en cours'}
          </span>

          <h2 className="font-heading font-black text-2xl sm:text-3xl text-stone-900 pt-1">
            {authCallbackMessage?.title || (isSuccess ? 'E-mail confirmé avec succès !' : 'Vérification du lien...')}
          </h2>

          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            {authCallbackMessage?.detail || (
              isSuccess 
                ? 'Votre adresse e-mail a été validée par Supabase. Votre compte marchand Boutika est maintenant actif.'
                : 'Nous validons votre jeton de sécurité avec le serveur...'
            )}
          </p>
        </div>

        {/* Additional guidance card */}
        {isSuccess && (
          <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-left text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Votre compte est prêt :</span>
            </div>
            <p className="text-emerald-800 leading-relaxed">
              {currentUser.email ? (
                <>Connecté en tant que <strong>{currentUser.email}</strong>. Redirection automatique vers votre tableau de bord dans <strong>{counter}s</strong>...</>
              ) : (
                <>Votre e-mail est validé. Vous pouvez dès maintenant vous connecter à votre compte.</>
              )}
            </p>
          </div>
        )}

        {isError && (
          <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-left text-xs space-y-2 text-red-800 leading-relaxed">
            <p className="font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Pourquoi ce message apparaît-il ?</span>
            </p>
            <p>
              Le lien de confirmation Supabase a peut-être expiré (durée de validité dépassée) ou a déjà été utilisé.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col gap-3">
          {isSuccess ? (
            currentUser.email ? (
              <button
                onClick={() => setCurrentView('vendor-dashboard')}
                className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Accéder à mon espace commerçant maintenant</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setCurrentView('login')}
                className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Se connecter avec mon mot de passe</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )
          ) : (
            <button
              onClick={() => setCurrentView('login')}
              className="w-full py-3.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>Retourner à la page de connexion</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setCurrentView('home')}
            className="w-full py-2.5 text-xs text-stone-500 hover:text-stone-800 font-semibold"
          >
            Retour au site public
          </button>
        </div>

      </div>
    </div>
  );
};
