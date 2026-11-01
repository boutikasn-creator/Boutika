import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Store, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle,
  Lock,
  Mail,
  Phone,
  User,
  Database,
  RefreshCw
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    setIsAuthModalOpen, 
    authModalMode, 
    setAuthModalMode,
    setCurrentUser,
    setCurrentView,
    showToast,
    addAuditLog,
    isSupabaseConfigured,
    signUpWithSupabase,
    signInWithSupabase,
    testConnection,
    supabaseConnectionStatus
  } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('+221 ');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleTestConnectionClick = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await testConnection();
    setIsTesting(false);
    setTestResult(res.message);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErrorMessage(null);
    setIsSubmitting(true);

    if (authModalMode === 'register') {
      const res = await signUpWithSupabase(email, password, fullName, whatsappPhone, storeName);
      setIsSubmitting(false);
      if (res.success) {
        showToast(res.message);
        setIsAuthModalOpen(false);
        setCurrentView('vendor-dashboard');
      } else {
        setAuthErrorMessage(res.message);
      }
    } else {
      const res = await signInWithSupabase(email, password);
      setIsSubmitting(false);
      if (res.success) {
        showToast(res.message);
        setIsAuthModalOpen(false);
        if (res.role === 'super_admin') {
          setCurrentView('admin-dashboard');
        } else {
          setCurrentView('vendor-dashboard');
        }
      } else {
        setAuthErrorMessage(res.message);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-stone-200">
        
        {/* Header */}
        <div className="bg-stone-50 px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
            <h3 className="font-heading font-bold text-lg text-stone-900">
              {authModalMode === 'login' ? 'Connexion à Boutika' : 'Créer votre boutique en ligne'}
            </h3>
          </div>
          <button 
            onClick={() => setIsAuthModalOpen(false)}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Supabase Connection Status Banner */}
        {isSupabaseConfigured ? (
          <div className="bg-emerald-50 px-6 py-2.5 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600 shrink-0" />
              <span><strong>Supabase Auth actif :</strong> Connexion au projet configurée.</span>
            </div>
            <button
              type="button"
              onClick={handleTestConnectionClick}
              disabled={isTesting}
              className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded font-semibold text-[11px] flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Test...' : 'Vérifier'}</span>
            </button>
          </div>
        ) : (
          <div className="bg-amber-50 px-6 py-3 border-b border-amber-100 space-y-2 text-xs text-amber-900">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Supabase non configuré (Mode Démo actif)</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Les variables <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> ne sont pas encore renseignées dans votre environnement.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleTestConnectionClick}
                disabled={isTesting}
                className="px-2 py-1 bg-amber-200/70 hover:bg-amber-200 text-amber-950 rounded font-semibold text-[11px] shrink-0 flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                <span>Tester</span>
              </button>
            </div>
            {testResult && (
              <p className="text-[11px] font-mono p-2 bg-amber-100/70 rounded border border-amber-200 text-amber-950">
                {testResult}
              </p>
            )}
          </div>
        )}

        {/* Authentication Form */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
          {authModalMode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Nom complet du vendeur
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="ex: Aminata Touré"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Nom de votre future boutique
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="ex: Dakar Bio Cosmétiques"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Numéro WhatsApp professionnel
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    placeholder="+221 77 123 45 67"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Adresse email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre.email@boutika.sn"
                className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          {authErrorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{authErrorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Traitement en cours...</span>
              </>
            ) : (
              <>
                <span>{authModalMode === 'login' ? 'Se connecter' : 'Valider mon inscription'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="text-center pt-2">
            {authModalMode === 'login' ? (
              <p className="text-xs text-stone-500">
                Vous n'avez pas encore de boutique ?{' '}
                <button
                  type="button"
                  onClick={() => setAuthModalMode('register')}
                  className="font-bold text-amber-700 hover:underline"
                >
                  Créer un compte vendeur
                </button>
              </p>
            ) : (
              <p className="text-xs text-stone-500">
                Vous possédez déjà un compte ?{' '}
                <button
                  type="button"
                  onClick={() => setAuthModalMode('login')}
                  className="font-bold text-amber-700 hover:underline"
                >
                  Se connecter
                </button>
              </p>
            )}
          </div>
        </form>

        {/* Security rule footer note */}
        <div className="bg-stone-50 px-6 py-3 border-t border-stone-200 text-[11px] text-stone-500 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Sécurité renforcée : Les privilèges administrateur sont vérifiés exclusivement côté serveur.</span>
        </div>

      </div>
    </div>
  );
};
