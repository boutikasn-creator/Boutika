import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { Toast } from './components/common/Toast';
import { VendorAccessGate } from './components/vendor/VendorAccessGate';
import { VendorAssistantChat } from './components/vendor/VendorAssistantChat';
import { AdminSubscriptionsPanel } from './components/admin/AdminSubscriptionsPanel';
import { AuthModal } from './pages/public/AuthModal';
import { HomePage } from './pages/public/HomePage';
import { AboutPage } from './pages/public/AboutPage';
import { HowItWorksPage } from './pages/public/HowItWorksPage';
import { PricingPage } from './pages/public/PricingPage';
import { ContactPage } from './pages/public/ContactPage';
import { 
  LegalMentionsPage, 
  LegalPrivacyPage, 
  LegalTermsPage 
} from './pages/public/LegalPages';
import { PublicStorePage } from './pages/storefront/PublicStorePage';
import { MarketplacePage } from './pages/public/MarketplacePage';
import { VendorDashboard } from './pages/vendor/VendorDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { RegisterPage } from './pages/auth/RegisterPage';
import { LoginPage } from './pages/auth/LoginPage';
import { AuthCallbackPage } from './pages/auth/AuthCallbackPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { ShieldCheck, LogOut } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentView, currentUser, isAuthenticated, signOutUser } = useApp();

  // ---------------------------------------------------------------------------
  // ESPACE ADMINISTRATEUR : interface séparée et exclusive.
  // Le Super Admin ne voit AUCUNE interface utilisateur : ni le site public (accueil, marketplace,
  // tarifs, panier, pied de page), ni l'espace vendeur. Il n'a pas de boutique : il ne voit que
  // la console d'administration de la plateforme.
  // ---------------------------------------------------------------------------
  const isAdmin = currentUser.role === 'super_admin' && isAuthenticated;

  if (isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-stone-100 text-stone-900">
        <header className="bg-stone-950 text-white border-b border-stone-800 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 via-orange-600 to-amber-500 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <span className="font-heading font-black text-lg tracking-tight">Boutika</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-600 text-white uppercase tracking-wider">
                Administration
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="font-bold text-stone-200 truncate max-w-[160px]">{currentUser.fullName}</span>
              <button
                type="button"
                onClick={signOutUser}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 font-bold transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Se déconnecter</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1">
          {/* Panneau d'abonnements puis console d'administration */}
          <AdminSubscriptionsPanel />
          <AdminDashboard />
        </main>

        <Toast />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // SITE PUBLIC ET ESPACE VENDEUR
  // ---------------------------------------------------------------------------
  const isPublicStoreView = currentView === 'public-store';
  const isDashboardView = currentView === 'vendor-dashboard' || currentView === 'admin-dashboard';
  const isAuthView = currentView === 'register' || currentView === 'login' || currentView === 'reset-password' || currentView === 'auth-callback';

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 selection:bg-amber-200 selection:text-amber-900">
      {/* Main Navbar (Hidden in full public storefront mode and dedicated auth pages) */}
      {!isPublicStoreView && !isAuthView && <Navbar />}

      {/* Main View Router */}
      <main className="flex-1">
        {/* L'ancienne page technique "Architecture" n'est plus accessible : on revient à l'accueil */}
        {(currentView === 'home' || currentView === 'architecture') && <HomePage />}
        {currentView === 'marketplace' && <MarketplacePage />}
        {currentView === 'about' && <AboutPage />}
        {currentView === 'how-it-works' && <HowItWorksPage />}
        {currentView === 'pricing' && <PricingPage />}
        {currentView === 'contact' && <ContactPage />}
        {currentView === 'legal-mentions' && <LegalMentionsPage />}
        {currentView === 'legal-privacy' && <LegalPrivacyPage />}
        {currentView === 'legal-terms' && <LegalTermsPage />}
        {currentView === 'public-store' && <PublicStorePage />}
        {currentView === 'vendor-dashboard' && (
          <VendorAccessGate>
            <VendorDashboard />
            {/* Discussion avec l'assistant IA (visible seulement pour la formule VIP) */}
            <VendorAssistantChat />
          </VendorAccessGate>
        )}
        {/* Un compte non administrateur n'a jamais accès à la console : retour à l'accueil */}
        {currentView === 'admin-dashboard' && <HomePage />}
        {currentView === 'register' && <RegisterPage />}
        {currentView === 'login' && <LoginPage />}
        {currentView === 'reset-password' && <ResetPasswordPage />}
        {currentView === 'auth-callback' && <AuthCallbackPage />}
      </main>

      {/* Footer (Displayed on public pages) */}
      {!isPublicStoreView && !isDashboardView && !isAuthView && <Footer />}

      {/* Interactive Global Modals & Toasts */}
      <AuthModal />
      <Toast />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
