import React, { useState } from 'react';
import { useApp, CurrentView } from '../../context/AppContext';
import { 
  Store, 
  Menu, 
  X, 
  ShoppingBag, 
  ArrowRight, 
  ShieldCheck, 
  User, 
  LogIn,
  LogOut
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { 
    currentView, 
    setCurrentView, 
    currentUser, 
    isAuthenticated,
    signOutUser,
    cartCount
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { label: string; view: CurrentView; highlight?: boolean }[] = [
    { label: 'Accueil', view: 'home' },
    { label: 'Marketplace', view: 'marketplace', highlight: true },
    { label: 'Fonctionnement', view: 'how-it-works' },
    { label: 'Tarifs', view: 'pricing' },
    { label: 'À propos', view: 'about' },
    { label: 'Contact', view: 'contact' },
  ];

  const handleNavClick = (view: CurrentView) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-stone-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div 
            onClick={() => handleNavClick('home')} 
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-orange-600 to-amber-500 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-black text-2xl tracking-tight text-stone-900">
                  Boutika
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 uppercase tracking-wider">
                  SN
                </span>
              </div>
              <p className="text-[11px] text-stone-500 -mt-1 font-medium hidden sm:block">
                La vitrine digitale du commerce sénégalais
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = currentView === item.view;
              return (
                <button
                  key={item.view}
                  onClick={() => handleNavClick(item.view)}
                  className={`px-3.5 py-2 text-sm font-semibold rounded-lg transition-all ${
                    isActive
                      ? 'text-amber-700 bg-amber-50/80'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/70'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {currentUser.role === 'vendor' ? (
                  <button
                    onClick={() => setCurrentView('vendor-dashboard')}
                    className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-semibold hover:bg-stone-800 transition-colors shadow-sm"
                  >
                    <Store className="w-4 h-4 text-amber-400" />
                    <span>Mon Espace Vendeur</span>
                  </button>
                ) : currentUser.role === 'super_admin' ? (
                  <button
                    onClick={() => setCurrentView('admin-dashboard')}
                    className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded-lg text-sm font-semibold hover:bg-red-800 transition-colors shadow-sm"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Console Super Admin</span>
                  </button>
                ) : null}

                <div className="flex items-center gap-1.5 pl-2 border-l border-stone-200">
                  <span className="text-xs font-bold text-stone-700 truncate max-w-[120px]">
                    {currentUser.fullName}
                  </span>
                  <button
                    onClick={signOutUser}
                    className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                    title="Se déconnecter"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setCurrentView('login')}
                  className="px-3.5 py-2 text-sm font-semibold text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Connexion</span>
                </button>

                <button
                  onClick={() => setCurrentView('register')}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-lg transition-all shadow-sm hover:shadow"
                >
                  <span>Créer ma boutique</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Quick Demo Store Preview button */}
            <button
              onClick={() => setCurrentView('public-store')}
              className="p-2 text-stone-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors relative"
              title="Tester la vitrine publique du client"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>

          {/* Mobile menu toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setCurrentView('public-store')}
              className="p-2 text-stone-700 rounded-lg hover:bg-stone-100 relative"
              aria-label="Panier boutique"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-amber-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-lg"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg">
          <div className="flex flex-col space-y-1">
            {navItems.map((item) => (
              <button
                key={item.view}
                onClick={() => handleNavClick(item.view)}
                className={`text-left px-3 py-2.5 rounded-lg text-base font-semibold ${
                  currentView === item.view
                    ? 'bg-amber-50 text-amber-700'
                    : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-stone-200 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <div className="p-2 text-xs text-stone-600 flex items-center justify-between border-b border-stone-100 mb-1">
                  <span>Connecté : <strong>{currentUser.fullName}</strong></span>
                  <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                    {currentUser.role}
                  </span>
                </div>
                {currentUser.role === 'vendor' ? (
                  <button
                    onClick={() => handleNavClick('vendor-dashboard')}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-stone-900 text-white rounded-lg font-bold"
                  >
                    <Store className="w-4 h-4 text-amber-400" />
                    <span>Mon Espace Vendeur</span>
                  </button>
                ) : currentUser.role === 'super_admin' ? (
                  <button
                    onClick={() => handleNavClick('admin-dashboard')}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-red-700 text-white rounded-lg font-bold"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Console Super Admin</span>
                  </button>
                ) : null}

                <button
                  onClick={() => {
                    signOutUser();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 text-center font-bold text-red-600 hover:bg-red-50 rounded-lg text-xs flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Se déconnecter</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setCurrentView('login');
                  }}
                  className="w-full py-2.5 text-center font-bold text-stone-700 bg-stone-100 rounded-lg text-sm"
                >
                  Connexion Vendeur
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setCurrentView('register');
                  }}
                  className="w-full py-3 text-center font-bold text-white bg-amber-600 rounded-lg shadow text-sm"
                >
                  Créer ma boutique gratuitement
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
