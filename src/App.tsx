import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { Toast } from './components/common/Toast';
import { VendorAccessGate } from './components/vendor/VendorAccessGate';
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
import { ArchitecturePage } from './pages/tech/ArchitectureDrawer';
import { RegisterPage } from './pages/auth/RegisterPage';
import { LoginPage } from './pages/auth/LoginPage';
import { AuthCallbackPage } from './pages/auth/AuthCallbackPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

const AppContent: React.FC = () => {
  const { currentView } = useApp();

  const isPublicStoreView = currentView === 'public-store';
  const isDashboardView = currentView === 'vendor-dashboard' || currentView === 'admin-dashboard';
  const isAuthView = currentView === 'register' || currentView === 'login' || currentView === 'reset-password' || currentView === 'auth-callback';

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 selection:bg-amber-200 selection:text-amber-900">
      {/* Main Navbar (Hidden in full public storefront mode and dedicated auth pages) */}
      {!isPublicStoreView && !isAuthView && <Navbar />}

      {/* Main View Router */}
      <main className="flex-1">
        {currentView === 'home' && <HomePage />}
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
          </VendorAccessGate>
        )}
        {currentView === 'admin-dashboard' && <AdminDashboard />}
        {currentView === 'architecture' && <ArchitecturePage />}
        {currentView === 'register' && <RegisterPage />}
        {currentView === 'login' && <LoginPage />}
        {currentView === 'reset-password' && <ResetPasswordPage />}
        {currentView === 'auth-callback' && <AuthCallbackPage />}
      </main>

      {/* Footer (Displayed on public pages and architecture) */}
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
