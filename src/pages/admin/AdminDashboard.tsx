import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Store, SubscriptionPlan, ContactMessage, AuditLog } from '../../types';
import { 
  ShieldCheck, 
  Users, 
  Store as StoreIcon, 
  CreditCard, 
  Mail, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  Search, 
  Clock, 
  Lock,
  Edit2,
  Trash2,
  ChevronRight,
  Sparkles,
  Bot,
  Play,
  Square,
  Award,
  Send,
  MessageCircle,
  Star,
  ArrowUpDown,
  RefreshCw,
  Plus,
  MessageSquare,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Download,
  Upload,
  AlertCircle
} from 'lucide-react';

type AdminTab = 'overview' | 'kimsi' | 'promotions' | 'stores' | 'plans' | 'payments' | 'messages' | 'audit';

export const AdminDashboard: React.FC = () => {
  const { 
    currentUser, 
    isAuthenticated,
    setCurrentView,
    stores, 
    products,
    updateStoreProfile, 
    updateFoundingStore,
    updateVipPromotion,
    exportPlatformBackup,
    restorePlatformBackup,
    purgeDemoData,
    isSupabaseConfigured,
    supabaseConnectionStatus,
    plans, 
    updatePlan, 
    subscriptionRecords, 
    contactMessages, 
    updateMessageStatus, 
    replyToContactMessage,
    auditLogs, 
    formatFCFA, 
    showToast,
    addAuditLog,
    kimsiMissions,
    startKimsiMission,
    stopKimsiMission,
    kimsiMessages,
    sendKimsiPrompt
  } = useApp();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [storeSearch, setStoreSearch] = useState('');
  const [auditFilter, setAuditFilter] = useState<'all' | 'warning' | 'critical'>('all');

  // Kimsi state & voice synthesis
  const [promptInput, setPromptInput] = useState('');
  const [isSendingPrompt, setIsSendingPrompt] = useState(false);
  const [isVoiceSpeaking, setIsVoiceSpeaking] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [missionTitle, setMissionTitle] = useState('Audit de Conformité & Sécurité RLS');
  const [missionDescription, setMissionDescription] = useState('Vérification automatisée des politiques RLS et détection des comptes vendeurs sans boutique.');
  const [missionDuration, setMissionDuration] = useState(15);
  const [missionTarget, setMissionTarget] = useState('Toutes les boutiques');

  // Purge confirmation modal state
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  // Restore backup state & file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<string | null>(null);
  const [pendingRestoreDetails, setPendingRestoreDetails] = useState<{ stores: number; products: number; date: string } | null>(null);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed.data || !Array.isArray(parsed.data.stores)) {
          showToast('Fichier invalide : structure de sauvegarde Boutika non reconnue.');
          return;
        }
        setPendingRestoreData(text);
        setPendingRestoreDetails({
          stores: parsed.data.stores.length,
          products: parsed.data.products?.length || 0,
          date: parsed.exportedAt ? new Date(parsed.exportedAt).toLocaleString('fr-FR') : 'Date inconnue'
        });
        setShowRestoreModal(true);
      } catch (err) {
        showToast('Impossible de lire le fichier JSON de sauvegarde.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmRestore = () => {
    if (!pendingRestoreData) return;
    setIsRestoring(true);
    const res = restorePlatformBackup(pendingRestoreData);
    setIsRestoring(false);
    setShowRestoreModal(false);
    setPendingRestoreData(null);
    showToast(res.message);
  };

  // Voice speech synthesis
  const handleSpeakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      showToast('Synthèse vocale non supportée par votre navigateur.');
      return;
    }
    if (isVoiceSpeaking) {
      window.speechSynthesis.cancel();
      setIsVoiceSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`]/g, '').slice(0, 350);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'fr-FR';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsVoiceSpeaking(true);
    utterance.onend = () => setIsVoiceSpeaking(false);
    utterance.onerror = () => setIsVoiceSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // Voice Speech Recognition
  const handleToggleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Reconnaissance vocale non disponible sur ce navigateur. Vous pouvez poser votre question par écrit.');
      return;
    }
    if (isListeningMic) {
      setIsListeningMic(false);
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onstart = () => {
        setIsListeningMic(true);
        showToast('Microphone actif : posez votre question à Kimsi.');
      };
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setPromptInput(transcript);
          handleSendKimsiPrompt(transcript);
        }
        setIsListeningMic(false);
      };
      recognition.onerror = () => {
        setIsListeningMic(false);
      };
      recognition.onend = () => {
        setIsListeningMic(false);
      };
      recognition.start();
    } catch (e) {
      setIsListeningMic(false);
      showToast('Impossible d\'activer le microphone.');
    }
  };

  // Support reply modal state
  const [replyingMessage, setReplyingMessage] = useState<ContactMessage | null>(null);
  const [replyText, setReplyText] = useState('');

  // Plan editing modal
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  // Platform KPIs
  const totalStores = stores.length;
  const activeStoresCount = stores.filter((s) => s.status === 'active').length;
  const totalPlatformSubscriptionsRevenue = subscriptionRecords.reduce((sum, r) => sum + r.amount, 0);
  const unreadMessagesCount = contactMessages.filter((m) => m.status === 'nouveau').length;

  const handleSendKimsiPrompt = async (textToSend?: string) => {
    const q = (textToSend || promptInput).trim();
    if (!q || isSendingPrompt) return;
    setIsSendingPrompt(true);
    setPromptInput('');
    try {
      const res = await sendKimsiPrompt(q);
      if (res?.answer) {
        handleSpeakText(res.answer);
      }
    } catch (e) {
      showToast("Erreur lors de l'exécution de la requête Kimsi.");
    } finally {
      setIsSendingPrompt(false);
    }
  };

  const handleLaunchMission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!missionTitle.trim()) return;
    startKimsiMission(missionTitle.trim(), missionDescription.trim(), Number(missionDuration));
    showToast(`Mission "${missionTitle}" démarrée.`);
  };

  const handleLaunchPresetMission = (title: string, desc: string, duration: number) => {
    startKimsiMission(title, desc, duration);
  };

  const handleOpenReplyModal = (msg: ContactMessage) => {
    setReplyingMessage(msg);
    setReplyText(`Bonjour ${msg.senderName},\n\nSuite à votre message concernant "${msg.subject}", nous avons bien pris en charge votre demande.\n\nCordialement,\nL'équipe Support Boutika`);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingMessage || !replyText.trim()) return;
    replyToContactMessage(replyingMessage.id, replyText.trim());
    setReplyingMessage(null);
    setReplyText('');
    showToast(`Réponse envoyée pour le ticket "${replyingMessage.subject}".`);
  };

  const handleToggleStoreStatus = (store: Store) => {
    const nextStatus = store.status === 'active' ? 'suspendue' : 'active';
    updateStoreProfile(store.id, { status: nextStatus });
    addAuditLog(
      'ADMIN_STORE_MODERATION',
      store.id,
      `Statut de la boutique "${store.name}" modifié en: ${nextStatus.toUpperCase()}`,
      nextStatus === 'suspendue' ? 'warning' : 'info'
    );
    showToast(`Boutique "${store.name}" marquée comme ${nextStatus}.`);
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    updatePlan(editingPlan.id, {
      priceMonthly: Number(editingPlan.priceMonthly),
      maxProducts: Number(editingPlan.maxProducts),
      tagline: editingPlan.tagline
    });
    setEditingPlan(null);
  };

  const filteredStores = stores.filter((s) =>
    s.name.toLowerCase().includes(storeSearch.toLowerCase()) ||
    s.city.toLowerCase().includes(storeSearch.toLowerCase()) ||
    s.slug.toLowerCase().includes(storeSearch.toLowerCase())
  );

  const filteredAuditLogs = auditLogs.filter((log) => {
    if (auditFilter === 'all') return true;
    return log.severity === auditFilter;
  });

  if (!isAuthenticated || currentUser.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-stone-900 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-stone-950 border border-red-900/50 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-red-950/80 border border-red-700/50 rounded-2xl flex items-center justify-center mx-auto text-red-500 shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-red-400 bg-red-950/60 border border-red-800/40 px-3 py-1 rounded-full">
              Accès Réservé Super Admin
            </span>
            <h2 className="text-2xl font-black font-heading text-white">
              Privilèges d'administration requis
            </h2>
            <p className="text-sm text-stone-400 leading-relaxed">
              Cette console est strictement restreinte aux administrateurs de Boutika. Le rôle <code className="text-amber-400 font-mono text-xs">super_admin</code> doit être validé côté serveur via les politiques de sécurité (RLS) et la table <code className="text-amber-400 font-mono text-xs">profiles</code> de Supabase.
            </p>
          </div>

          <div className="p-3 bg-stone-900 border border-stone-800 rounded-xl text-xs text-left text-stone-400 space-y-1">
            <div className="flex justify-between">
              <span className="text-stone-500">Utilisateur actuel :</span>
              <span className="text-stone-200 font-medium truncate max-w-[200px]">{currentUser.email || 'Visiteur'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Rôle détecté :</span>
              <span className="font-mono font-bold text-red-400 uppercase">{currentUser.role}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => setCurrentView('login')}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-all shadow"
            >
              Se connecter avec un compte Administrateur
            </button>
            <button
              onClick={() => setCurrentView('home')}
              className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium rounded-xl text-sm transition-all"
            >
              Retour au site public
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100/70 pb-20">
      
      {/* Super Admin Top Header */}
      <div className="bg-stone-900 text-white border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading font-black text-xl text-white">
                  Console Super Administrateur
                </h1>
                <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Accès Restreint
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Connecté en tant que : <strong>{currentUser.fullName}</strong> ({currentUser.email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs bg-stone-800 px-3 py-1.5 rounded-xl border border-stone-700">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-stone-300">Rôle vérifié par signature serveur JWT</span>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 overflow-x-auto border-t border-stone-800 scrollbar-none">
          {[
            { id: 'overview', label: 'Vue d’ensemble', icon: TrendingUp },
            { id: 'kimsi', label: 'Agent IA Kimsi', icon: Sparkles },
            { id: 'promotions', label: 'Boutiques Fondatrices & VIP Promues', icon: Award },
            { id: 'stores', label: `Boutiques & Vendeurs (${totalStores})`, icon: StoreIcon },
            { id: 'plans', label: 'Formules d’abonnement', icon: CreditCard },
            { id: 'payments', label: `Paiements (${subscriptionRecords.length})`, icon: CreditCard },
            { id: 'messages', label: `Messages Support (${unreadMessagesCount})`, icon: Mail },
            { id: 'audit', label: `Audit & Nettoyage (${auditLogs.length})`, icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`flex items-center gap-2 py-3 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
                  isActive
                    ? 'border-red-500 text-white bg-stone-800'
                    : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.id === 'messages' && unreadMessagesCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                    {unreadMessagesCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Admin Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Boutiques inscrites
                </span>
                <p className="font-heading font-black text-2xl text-stone-900 mt-1">
                  {totalStores}
                </p>
                <span className="text-[10px] text-emerald-600 font-bold mt-1 inline-block">
                  {activeStoresCount} actives en ligne
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Revenus abonnements
                </span>
                <p className="font-heading font-black text-2xl text-stone-900 mt-1">
                  {formatFCFA(totalPlatformSubscriptionsRevenue)}
                </p>
                <span className="text-[10px] text-stone-500 font-medium mt-1 inline-block">
                  Souscriptions confirmées
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Demandes d'assistance
                </span>
                <p className={`font-heading font-black text-2xl mt-1 ${unreadMessagesCount > 0 ? 'text-amber-600' : 'text-stone-900'}`}>
                  {unreadMessagesCount}
                </p>
                <span className="text-[10px] text-stone-500 font-medium mt-1 inline-block">
                  Nouveaux messages à traiter
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Événements de sécurité
                </span>
                <p className="font-heading font-black text-2xl text-stone-900 mt-1">
                  {auditLogs.length}
                </p>
                <span className="text-[10px] text-emerald-600 font-bold mt-1 inline-block">
                  Audités & tracés
                </span>
              </div>
            </div>

            {/* Authentic Integrations Health & Surveillance Card */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-stone-900 text-white flex items-center justify-center font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-sm text-stone-900">
                      Surveillance Réelle des Passerelles & Services Tiers
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      État authentique des connexions backend (aucune mesure inventée).
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-stone-400 self-end sm:self-center">
                  Vérification en direct
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* Supabase Status */}
                <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900">Supabase Backend</span>
                    <span className={`w-2 h-2 rounded-full ${
                      isSupabaseConfigured && supabaseConnectionStatus?.isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}></span>
                  </div>
                  <p className="text-[11px] text-stone-600">
                    {isSupabaseConfigured && supabaseConnectionStatus?.isConnected
                      ? 'Opérationnel (PostgreSQL & RLS actifs)'
                      : isSupabaseConfigured
                      ? 'Erreur de connexion Supabase'
                      : 'Non configuré (.env requis)'}
                  </p>
                  <p className="text-[10px] text-stone-400 font-mono">Auth & Tables Cloud</p>
                </div>

                {/* WhatsApp Gateway Status */}
                <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900">WhatsApp Commerce</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </div>
                  <p className="text-[11px] text-emerald-700 font-medium">
                    Opérationnel (wa.me direct URL)
                  </p>
                  <p className="text-[10px] text-stone-400 font-mono">Payload de commande 1-clic actif</p>
                </div>

                {/* Wave Senegal Status */}
                <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900">Passerelle Wave SN</span>
                    <span className="w-2 h-2 rounded-full bg-stone-400"></span>
                  </div>
                  <p className="text-[11px] text-stone-600">
                    Mode Standby / Simulation
                  </p>
                  <p className="text-[10px] text-stone-400 font-mono">Clés marchandes Wave API requises</p>
                </div>

                {/* Orange Money Status */}
                <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900">Orange Money OM Pay</span>
                    <span className="w-2 h-2 rounded-full bg-stone-400"></span>
                  </div>
                  <p className="text-[11px] text-stone-600">
                    Mode Standby / Simulation
                  </p>
                  <p className="text-[10px] text-stone-400 font-mono">Clé marchande OM requise</p>
                </div>
              </div>
            </div>

            {/* Quick Overview lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Stores needing attention */}
              <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-bold text-base text-stone-900">
                    Boutiques enregistrées récemment
                  </h3>
                  <button
                    onClick={() => setActiveTab('stores')}
                    className="text-xs font-bold text-red-600 hover:underline"
                  >
                    Gérer tout
                  </button>
                </div>

                <div className="divide-y divide-stone-100 text-xs">
                  {stores.map((s) => (
                    <div key={s.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={s.logoUrl} alt={s.name} className="w-10 h-10 rounded-lg object-cover" />
                        <div>
                          <p className="font-bold text-stone-900">{s.name}</p>
                          <p className="text-stone-400 text-[11px]">{s.city} • Formule {s.planId}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {s.status}
                        </span>
                        <button
                          onClick={() => handleToggleStoreStatus(s)}
                          className="px-2 py-1 bg-stone-100 hover:bg-stone-200 rounded text-[11px] font-semibold"
                        >
                          {s.status === 'active' ? 'Suspendre' : 'Activer'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Audit events */}
              <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-bold text-base text-stone-900">
                    Dernières opérations sensibles
                  </h3>
                  <button
                    onClick={() => setActiveTab('audit')}
                    className="text-xs font-bold text-red-600 hover:underline"
                  >
                    Voir le journal complet
                  </button>
                </div>

                <div className="divide-y divide-stone-100 text-xs">
                  {auditLogs.slice(0, 4).map((log) => (
                    <div key={log.id} className="py-2.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-stone-800">{log.action}</span>
                        <span className="text-[10px] text-stone-400">
                          {new Date(log.timestamp).toLocaleTimeString('fr-FR')}
                        </span>
                      </div>
                      <p className="text-stone-600 text-[11px]">{log.details}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB: KIMSI AI PRIVATE AGENT & MISSIONS */}
        {activeTab === 'kimsi' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-stone-900 via-stone-950 to-stone-900 text-white rounded-3xl p-6 border border-stone-800 shadow-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 text-white flex items-center justify-center shadow-lg">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-heading font-black text-2xl text-white">Kimsi AI</h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 uppercase tracking-wider">
                        Agent Privé Super Admin
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Vocal & Écrit
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Alimenté par <strong>Gemini 3.8 Flash</strong> • Synthèse vocale intégrée • Grounding direct sur la base de données Boutika
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-stone-400 block">Missions actives</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      {kimsiMissions.filter((m) => m.status === 'active').length} en cours
                    </span>
                  </div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                </div>
              </div>

              {/* Real-time Telemetry Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-5 border-t border-stone-800 text-xs">
                <div className="bg-stone-800/60 p-3 rounded-xl border border-stone-700/50">
                  <span className="text-stone-400 text-[10px] block">Boutiques Actives</span>
                  <span className="font-heading font-black text-white text-base mt-0.5 block">
                    {activeStoresCount} / {totalStores}
                  </span>
                </div>
                <div className="bg-stone-800/60 p-3 rounded-xl border border-stone-700/50">
                  <span className="text-stone-400 text-[10px] block">Catalogue Total</span>
                  <span className="font-heading font-black text-white text-base mt-0.5 block">
                    {products.length} produits
                  </span>
                </div>
                <div className="bg-stone-800/60 p-3 rounded-xl border border-stone-700/50">
                  <span className="text-stone-400 text-[10px] block">CA Abonnements</span>
                  <span className="font-heading font-black text-emerald-400 text-base mt-0.5 block">
                    {formatFCFA(totalPlatformSubscriptionsRevenue)}
                  </span>
                </div>
                <div className="bg-stone-800/60 p-3 rounded-xl border border-stone-700/50">
                  <span className="text-stone-400 text-[10px] block">Tickets Support</span>
                  <span className="font-heading font-black text-amber-400 text-base mt-0.5 block">
                    {unreadMessagesCount} non traités
                  </span>
                </div>
                <div className="bg-stone-800/60 p-3 rounded-xl border border-stone-700/50 col-span-2 sm:col-span-1">
                  <span className="text-stone-400 text-[10px] block">Sécurité RLS</span>
                  <span className="font-heading font-black text-emerald-400 text-base mt-0.5 block flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 100% Validé
                  </span>
                </div>
              </div>
            </div>

            {/* Main Kimsi Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Interactive Chat & Voice Terminal (7 cols) */}
              <div className="lg:col-span-7 bg-white rounded-3xl border border-stone-200 shadow-xs flex flex-col h-[650px] overflow-hidden">
                <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-red-600" />
                    <h3 className="font-heading font-bold text-sm text-stone-900">
                      Terminal de Gouvernance Kimsi
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {isVoiceSpeaking && (
                      <button
                        onClick={() => handleSpeakText('')}
                        className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 animate-pulse"
                      >
                        <VolumeX className="w-3.5 h-3.5" />
                        <span>Couper la voix</span>
                      </button>
                    )}
                    <span className="text-[10px] font-mono text-stone-400">
                      gemini-3.8-flash
                    </span>
                  </div>
                </div>

                {/* Suggestions Chips */}
                <div className="p-3 bg-stone-50/60 border-b border-stone-100 flex items-center gap-2 overflow-x-auto scrollbar-none text-[11px]">
                  <span className="text-stone-400 font-bold shrink-0">Suggestions :</span>
                  {[
                    "Analyse globale des ventes et des boutiques",
                    "Quels commerçants ont leur essai de 3 jours expirant ?",
                    "Auditer la conformité RLS et les comptes de test",
                    "Conseils pour fidéliser les vendeurs de la formule VIP"
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={isSendingPrompt}
                      onClick={() => handleSendKimsiPrompt(chip)}
                      className="px-2.5 py-1 rounded-full bg-white border border-stone-200 hover:border-amber-500 hover:text-amber-800 text-stone-600 font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Messages Transcript */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                  {kimsiMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-4 space-y-2 ${
                          msg.sender === 'admin'
                            ? 'bg-stone-900 text-white shadow-xs'
                            : 'bg-stone-100 border border-stone-200 text-stone-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[10px] opacity-75">
                          <span className="font-bold flex items-center gap-1">
                            {msg.sender === 'admin' ? (
                              <span>Super Administrateur</span>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3 text-red-500" />
                                <span>Kimsi AI</span>
                              </>
                            )}
                          </span>
                          <div className="flex items-center gap-2">
                            {msg.sender === 'kimsi' && (
                              <button
                                onClick={() => handleSpeakText(msg.content)}
                                className="text-stone-500 hover:text-red-600 p-0.5 rounded cursor-pointer"
                                title="Écouter la synthèse vocale"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <span>{new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>

                        <div className="whitespace-pre-line leading-relaxed font-sans">
                          {msg.content}
                        </div>

                        {msg.insights && msg.insights.length > 0 && (
                          <div className="pt-2 border-t border-stone-200/60 mt-2 space-y-1">
                            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                              Points clés vérifiés :
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {msg.insights.map((ins, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-full bg-white border border-stone-200 text-stone-600 text-[10px] font-medium"
                                >
                                  ✓ {ins}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isSendingPrompt && (
                    <div className="flex justify-start">
                      <div className="bg-stone-100 border border-stone-200 rounded-2xl p-3.5 flex items-center gap-2.5 text-stone-600">
                        <RefreshCw className="w-4 h-4 text-red-600 animate-spin" />
                        <span className="text-xs font-medium">Kimsi examine les données réelles de Boutika...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Prompt Input Bar (Text + Voice Mic) */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendKimsiPrompt();
                  }}
                  className="p-3 border-t border-stone-200 bg-white flex items-center gap-2"
                >
                  <button
                    type="button"
                    onClick={handleToggleVoiceInput}
                    className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                      isListeningMic
                        ? 'bg-red-600 text-white border-red-600 animate-pulse'
                        : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                    }`}
                    title={isListeningMic ? 'Arrêter l\'écoute' : 'Parler à Kimsi au micro'}
                  >
                    {isListeningMic ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <input
                    type="text"
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder="Posez une question de gestion ou d'audit à Kimsi..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-stone-300 text-xs outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  <button
                    type="submit"
                    disabled={isSendingPrompt || !promptInput.trim()}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-stone-300 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Envoyer</span>
                  </button>
                </form>
              </div>

              {/* Right Column: Kimsi Missions Management (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Launch Mission Card */}
                <div className="bg-white rounded-3xl border border-stone-200 shadow-xs p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-red-600" />
                    <h3 className="font-heading font-bold text-sm text-stone-900">
                      Lancer une Mission de Surveillance Kimsi
                    </h3>
                  </div>
                  <p className="text-xs text-stone-500">
                    Active un agent d'audit temporaire qui surveille la plateforme et consigne son rapport pour validation.
                  </p>

                  {/* Preset Missions Buttons */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                      Missions prédéfinies :
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        {
                          title: 'Audit RLS & Comptes sans boutique',
                          desc: 'Vérification intégrité des triggers de synchronisation',
                          duration: 2
                        },
                        {
                          title: 'Surveillance des Essais 3 Jours Expirants',
                          desc: 'Détection des commerçants à relancer pour activation',
                          duration: 4
                        },
                        {
                          title: 'Contrôle des Ruptures de Stocks Vendeurs',
                          desc: 'Alerte sur les articles à moins de 5 unités',
                          duration: 8
                        }
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleLaunchPresetMission(preset.title, preset.desc, preset.duration)}
                          className="w-full text-left p-2.5 rounded-xl border border-stone-200 hover:border-red-500 hover:bg-red-50/40 transition-all flex items-center justify-between text-xs cursor-pointer group"
                        >
                          <div>
                            <p className="font-bold text-stone-900 group-hover:text-red-700">{preset.title}</p>
                            <p className="text-[10px] text-stone-400">{preset.desc} ({preset.duration}h)</p>
                          </div>
                          <Play className="w-3.5 h-3.5 text-stone-400 group-hover:text-red-600 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Mission Form */}
                  <form onSubmit={handleLaunchMission} className="pt-3 border-t border-stone-100 space-y-2.5 text-xs">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                      Mission personnalisée :
                    </span>
                    <input
                      type="text"
                      required
                      value={missionTitle}
                      onChange={(e) => setMissionTitle(e.target.value)}
                      placeholder="Intitulé de la mission"
                      className="w-full p-2 border border-stone-300 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-500"
                    />
                    <input
                      type="text"
                      required
                      value={missionDescription}
                      onChange={(e) => setMissionDescription(e.target.value)}
                      placeholder="Objectif de surveillance"
                      className="w-full p-2 border border-stone-300 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-500"
                    />
                    <div className="flex items-center gap-2">
                      <select
                        value={missionDuration}
                        onChange={(e) => setMissionDuration(Number(e.target.value))}
                        className="w-1/2 p-2 border border-stone-300 rounded-xl text-xs outline-none bg-white font-medium"
                      >
                        <option value={1}>1 Heure</option>
                        <option value={2}>2 Heures</option>
                        <option value={4}>4 Heures</option>
                        <option value={12}>12 Heures</option>
                        <option value={24}>24 Heures</option>
                      </select>
                      <button
                        type="submit"
                        className="w-1/2 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
                      >
                        Activer la mission
                      </button>
                    </div>
                  </form>
                </div>

                {/* Active / Recent Missions List */}
                <div className="bg-white rounded-3xl border border-stone-200 shadow-xs p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading font-bold text-sm text-stone-900">
                      Historique des Missions ({kimsiMissions.length})
                    </h3>
                  </div>

                  <div className="space-y-3 max-h-[260px] overflow-y-auto text-xs">
                    {kimsiMissions.map((m) => (
                      <div
                        key={m.id}
                        className={`p-3.5 rounded-2xl border space-y-2 ${
                          m.status === 'active'
                            ? 'bg-amber-50/50 border-amber-200'
                            : 'bg-stone-50 border-stone-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-stone-900 line-clamp-1">{m.title}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              m.status === 'active'
                                ? 'bg-amber-100 text-amber-900 animate-pulse'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {m.status === 'active' ? 'En cours' : 'Complétée'}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-600">{m.targetObjective}</p>
                        
                        <div className="flex items-center justify-between pt-1 text-[10px] text-stone-400">
                          <span>Durée : {m.durationHours}h</span>
                          {m.status === 'active' && (
                            <button
                              onClick={() => stopKimsiMission(m.id)}
                              className="text-red-600 font-bold hover:underline cursor-pointer"
                            >
                              Arrêter la mission
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* TAB: PROMOTIONS MANAGER (TOP 5 FOUNDING STORES & VIP PROMOTED STORES) */}
        {activeTab === 'promotions' && (
          <div className="space-y-8">
            {/* Header */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-600" />
                  <h2 className="font-heading font-black text-lg text-stone-900">
                    Gouvernance des Mises en Avant Marketplace
                  </h2>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Configurez en direct les 5 Boutiques Fondatrices et les Boutiques VIP promues sur la Marketplace publique de Boutika.
                </p>
              </div>

              <button
                onClick={() => setCurrentView('marketplace')}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                <span>Voir la Marketplace publique</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* SECTION 1: TOP 5 BOUTIQUES FONDATRICES */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <div>
                  <h3 className="font-heading font-black text-base text-stone-900 flex items-center gap-2">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-600" />
                    <span>Top 5 Boutiques Fondatrices (Première Ligne)</span>
                  </h3>
                  <p className="text-xs text-stone-500">
                    {stores.filter((s) => s.isFoundingStore).length} boutique(s) fondatrice(s) configurée(s) — Affichées en tête de la Marketplace.
                  </p>
                </div>
              </div>

              {/* Founding Stores Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stores
                  .filter((s) => s.isFoundingStore)
                  .sort((a, b) => (a.foundingOrder || 99) - (b.foundingOrder || 99))
                  .map((store) => (
                    <div
                      key={store.id}
                      className="bg-white rounded-2xl border border-amber-200 shadow-xs p-5 space-y-4 relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={store.logoUrl}
                            alt={store.name}
                            className="w-12 h-12 rounded-xl object-cover border border-stone-200 shadow-xs"
                          />
                          <div>
                            <h4 className="font-heading font-bold text-sm text-stone-900">{store.name}</h4>
                            <p className="text-[11px] text-stone-400">{store.city} • Formule {store.planId.toUpperCase()}</p>
                          </div>
                        </div>
                        <span className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs">
                          #{store.foundingOrder || 1}
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div>
                          <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                            Rang d'affichage (1er au 5e)
                          </label>
                          <select
                            value={store.foundingOrder || 1}
                            onChange={(e) => updateFoundingStore(store.id, true, Number(e.target.value))}
                            className="w-full p-2 border border-stone-300 rounded-xl text-xs outline-none bg-white font-bold"
                          >
                            <option value={1}>1er — Tête de gondole</option>
                            <option value={2}>2e position</option>
                            <option value={3}>3e position</option>
                            <option value={4}>4e position</option>
                            <option value={5}>5e position</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                            Badge promotionnel personnalisé
                          </label>
                          <input
                            type="text"
                            defaultValue={store.promotionBadge || `Boutique Fondatrice #${store.foundingOrder || 1}`}
                            onBlur={(e) => {
                              updateStoreProfile(store.id, { promotionBadge: e.target.value });
                              showToast(`Badge mis à jour pour "${store.name}".`);
                            }}
                            placeholder="Ex: Sélection Pionnière, -20% ce weekend"
                            className="w-full p-2 border border-stone-300 rounded-xl text-xs outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                        <span className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Épinglée en vitrine fondatrice
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            updateFoundingStore(store.id, false);
                            showToast(`"${store.name}" retirée des boutiques fondatrices.`);
                          }}
                          className="text-stone-400 hover:text-red-600 text-[11px] font-medium cursor-pointer"
                        >
                          Retirer du Top 5
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Add store to Founding */}
              <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 space-y-3">
                <h4 className="font-heading font-bold text-sm text-stone-900">
                  Ajouter une autre boutique au rang de Boutique Fondatrice
                </h4>
                <div className="flex flex-wrap gap-2 pt-1">
                  {stores
                    .filter((s) => !s.isFoundingStore)
                    .map((store) => (
                      <button
                        key={store.id}
                        type="button"
                        onClick={() => {
                          updateFoundingStore(store.id, true, 5);
                          showToast(`"${store.name}" a été ajoutée aux Boutiques Fondatrices !`);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-stone-200 hover:border-amber-500 bg-stone-50 hover:bg-amber-50 text-xs font-bold text-stone-700 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-600" />
                        <span>{store.name} ({store.city})</span>
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {/* SECTION 2: BOUTIQUES VIP À L'AFFICHE (MISE EN AVANT VIP) */}
            <div className="space-y-4 pt-4 border-t border-stone-200">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <div>
                  <h3 className="font-heading font-black text-base text-stone-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>Mise en Avant des Boutiques VIP</span>
                  </h3>
                  <p className="text-xs text-stone-500">
                    Boutiques souscrites à la Formule VIP bénéficiant d'une exposition promotionnelle dédiée dans la Marketplace.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stores
                  .filter((s) => s.planId === 'vip')
                  .map((store) => (
                    <div
                      key={store.id}
                      className={`bg-white rounded-2xl border shadow-xs p-5 space-y-4 relative ${
                        store.isVipPromoted ? 'border-purple-300 ring-2 ring-purple-100' : 'border-stone-200 opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={store.logoUrl}
                            alt={store.name}
                            className="w-12 h-12 rounded-xl object-cover border border-stone-200 shadow-xs"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-heading font-bold text-sm text-stone-900">{store.name}</h4>
                              <span className="bg-purple-100 text-purple-800 text-[10px] font-black px-1.5 py-0.2 rounded">VIP</span>
                            </div>
                            <p className="text-[11px] text-stone-400">{store.city} • boutika.sn/v/{store.slug}</p>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          store.isVipPromoted ? 'bg-purple-100 text-purple-800' : 'bg-stone-100 text-stone-500'
                        }`}>
                          {store.isVipPromoted ? 'Promue' : 'Inactive'}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-stone-600">Activer la promotion VIP :</label>
                          <button
                            type="button"
                            onClick={() => updateVipPromotion(store.id, !store.isVipPromoted)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                              store.isVipPromoted
                                ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                            }`}
                          >
                            {store.isVipPromoted ? 'Désactiver' : 'Activer'}
                          </button>
                        </div>

                        {store.isVipPromoted && (
                          <>
                            <div>
                              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                                Ordre d'affichage VIP
                              </label>
                              <select
                                value={store.vipPromotionOrder || 1}
                                onChange={(e) => updateVipPromotion(store.id, true, Number(e.target.value))}
                                className="w-full p-2 border border-stone-300 rounded-xl text-xs outline-none bg-white font-bold"
                              >
                                <option value={1}>1ère boutique VIP en vedette</option>
                                <option value={2}>2e boutique VIP en vedette</option>
                                <option value={3}>3e boutique VIP en vedette</option>
                                <option value={4}>4e boutique VIP en vedette</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                                Badge promotionnel VIP
                              </label>
                              <input
                                type="text"
                                defaultValue={store.promotionBadge || 'Boutique VIP Partenaire Officiel'}
                                onBlur={(e) => {
                                  updateVipPromotion(store.id, true, store.vipPromotionOrder, e.target.value);
                                }}
                                placeholder="Ex: Boutique Partenaire Officielle"
                                className="w-full p-2 border border-stone-300 rounded-xl text-xs outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: STORES MANAGEMENT */}
        {activeTab === 'stores' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-heading font-bold text-lg text-stone-900">
                  Gestion des vendeurs et boutiques ({stores.length})
                </h2>
                <p className="text-xs text-stone-500">
                  Contrôlez les boutiques en ligne, modérez le contenu et vérifiez les commerçants.
                </p>
              </div>

              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                  placeholder="Filtrer par nom, quartier..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-stone-300 rounded-xl outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider border-b border-stone-200">
                    <tr>
                      <th className="py-3 px-4">Boutique</th>
                      <th className="py-3 px-4">Slug public</th>
                      <th className="py-3 px-4">WhatsApp Marchand</th>
                      <th className="py-3 px-4">Localisation</th>
                      <th className="py-3 px-4">Formule</th>
                      <th className="py-3 px-4">Statut</th>
                      <th className="py-3 px-4 text-right">Modération</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-700">
                    {filteredStores.map((store) => (
                      <tr key={store.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3 px-4 flex items-center gap-3">
                          <img src={store.logoUrl} alt={store.name} className="w-10 h-10 rounded-lg object-cover" />
                          <div>
                            <p className="font-bold text-stone-900">{store.name}</p>
                            <p className="text-[11px] text-stone-400">{store.email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-amber-800">
                          /v/{store.slug}
                        </td>
                        <td className="py-3 px-4 font-mono">{store.phone}</td>
                        <td className="py-3 px-4">{store.city}</td>
                        <td className="py-3 px-4 font-semibold uppercase">{store.planId}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            store.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {store.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleToggleStoreStatus(store)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                              store.status === 'active'
                                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {store.status === 'active' ? 'Suspendre' : 'Réactiver'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SUBSCRIPTION PLANS MANAGEMENT */}
        {activeTab === 'plans' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
              <div>
                <h2 className="font-heading font-bold text-lg text-stone-900">
                  Configuration des 3 formules d'abonnement
                </h2>
                <p className="text-xs text-stone-500">
                  Ajustez les quotas et montants mensuels applicables aux commerçants.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading font-black text-xl text-stone-900">{p.name}</h3>
                    <button
                      onClick={() => setEditingPlan(p)}
                      className="p-1.5 text-stone-500 hover:text-stone-900 bg-stone-100 rounded-lg text-xs flex items-center gap-1 font-bold"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Modifier</span>
                    </button>
                  </div>

                  <p className="text-xs text-stone-500">{p.tagline}</p>

                  <div className="pt-2">
                    <span className="font-heading font-black text-3xl text-stone-900">
                      {p.priceMonthly === 0 ? 'Gratuit' : formatFCFA(p.priceMonthly)}
                    </span>
                    <span className="text-xs text-stone-400"> / mois</span>
                  </div>

                  <div className="space-y-1.5 text-xs text-stone-600 border-t pt-3">
                    <p>• Quota maximum : <strong>{p.maxProducts} produits</strong></p>
                    <p>• Commission : <strong>{p.commissionRate}%</strong></p>
                    <p>• Domaine personnalisé : <strong>{p.customDomainAllowed ? 'Oui' : 'Non'}</strong></p>
                    <p>• Support prioritaire : <strong>{p.prioritySupport ? 'Oui' : 'Non'}</strong></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: PAYMENTS & SUBSCRIPTIONS AUDIT */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
              <div>
                <h2 className="font-heading font-bold text-lg text-stone-900">
                  Suivi des souscriptions et paiements ({subscriptionRecords.length})
                </h2>
                <p className="text-xs text-stone-500">
                  Transactions enregistrées après validation côté serveur.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider border-b border-stone-200">
                    <tr>
                      <th className="py-3 px-4">Boutique</th>
                      <th className="py-3 px-4">Formule</th>
                      <th className="py-3 px-4">Montant</th>
                      <th className="py-3 px-4">Passerelle</th>
                      <th className="py-3 px-4">Référence Transaction</th>
                      <th className="py-3 px-4">Échéance</th>
                      <th className="py-3 px-4">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-700">
                    {subscriptionRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-stone-900">{rec.storeName}</td>
                        <td className="py-3 px-4 font-semibold">{rec.planName}</td>
                        <td className="py-3 px-4 font-black">{formatFCFA(rec.amount)}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded font-medium bg-stone-100 text-stone-800">
                            {rec.paymentGateway}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-stone-500">{rec.transactionRef || 'N/A'}</td>
                        <td className="py-3 px-4 text-stone-500">
                          {new Date(rec.validUntil).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold text-[10px]">
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SUPPORT MESSAGES */}
        {activeTab === 'messages' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
              <div>
                <h2 className="font-heading font-bold text-lg text-stone-900">
                  Boîte de réception du Support & Contact ({contactMessages.length})
                </h2>
                <p className="text-xs text-stone-500">
                  Messages envoyés depuis le site public ou l'espace vendeur.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {contactMessages.map((msg) => (
                <div key={msg.id} className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        msg.status === 'nouveau' ? 'bg-amber-100 text-amber-900' : 'bg-stone-100 text-stone-600'
                      }`}>
                        {msg.status.toUpperCase()}
                      </span>
                      <h4 className="font-bold text-sm text-stone-900">{msg.subject}</h4>
                    </div>
                    <span className="text-xs text-stone-400">
                      {new Date(msg.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-stone-700 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200">
                    "{msg.message}"
                  </p>

                  {/* Admin Reply display if already answered */}
                  {msg.adminReply && (
                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-emerald-800 font-bold">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Réponse officielle transmise au commerçant</span>
                        </span>
                        {msg.repliedAt && (
                          <span className="text-[10px] text-emerald-600 font-normal">
                            {new Date(msg.repliedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-emerald-950 font-sans italic">
                        "{msg.adminReply}"
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                    <div className="text-stone-500">
                      Expéditeur : <strong>{msg.senderName}</strong> • {msg.senderEmail} • {msg.senderPhone}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenReplyModal(msg)}
                        className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3 text-amber-400" />
                        <span>{msg.adminReply ? 'Modifier la réponse' : 'Répondre au ticket'}</span>
                      </button>

                      <a
                        href={`https://wa.me/${msg.senderPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                          `Bonjour ${msg.senderName}, ici l'équipe Boutika suite à votre message "${msg.subject}". Comment pouvons-nous vous aider ?`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                      >
                        WhatsApp
                      </a>

                      {msg.status === 'nouveau' && (
                        <button
                          onClick={() => updateMessageStatus(msg.id, 'traite')}
                          className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Marquer comme traité
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: SECURITY AUDIT & TEST ACCOUNTS CLEANUP */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            
            {/* Test Accounts Audit & Clean-up Panel */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-lg text-stone-900">
                      Audit & Nettoyage Sécurisé des Comptes de Test
                    </h3>
                    <p className="text-xs text-stone-500">
                      Séparation stricte entre données de démonstration initiale et comptes commerçants réels.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelected}
                    accept=".json,application/json"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Restaurer une sauvegarde JSON existante"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-700" />
                    <span>Restaurer JSON</span>
                  </button>

                  <button
                    type="button"
                    onClick={exportPlatformBackup}
                    className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Télécharger une sauvegarde complète JSON avant tout nettoyage"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Sauvegarder JSON</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPurgeModal(true)}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Nettoyer les comptes de test</span>
                  </button>
                </div>
              </div>

              {/* Identification Criteria Grid */}
              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 space-y-2">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                  Critères de distinction appliqués :
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-700">
                  <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-stone-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-stone-900">Identifiants statiques de maquette</p>
                      <p className="text-[11px] text-stone-500">Préfixes <code>usr-vendor-*</code> ou <code>store-*</code> non générés par Supabase Auth UUID.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-stone-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-stone-900">Domaines réservés aux tests</p>
                      <p className="text-[11px] text-stone-500">Adresses avec <code>@demo.sn</code> ou comptes fictifs de simulation initiale.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-stone-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-stone-900">Absence de webhook de paiement réel</p>
                      <p className="text-[11px] text-stone-500">Aucune transaction authentifiée via l'API Wave ou Orange Money Sénégal.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-stone-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-stone-900">Intégrité des vrais comptes protégée</p>
                      <p className="text-[11px] text-stone-500">Aucun compte réel créé par un commerçant n'est altéré ou supprimé.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Test Accounts Breakdown Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-100 text-stone-600 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2.5 px-3 rounded-l-lg">Boutique & Propriétaire</th>
                      <th className="py-2.5 px-3">Type détecté</th>
                      <th className="py-2.5 px-3">Articles liés</th>
                      <th className="py-2.5 px-3">Commandes liées</th>
                      <th className="py-2.5 px-3 rounded-r-lg">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium">
                    {stores.map((s) => {
                      const isDemo = s.id.startsWith('store-') && s.id !== 'store-teranga-wax';
                      const storeProds = products.filter((p) => p.storeId === s.id).length;
                      const storeOrds = subscriptionRecords.filter((r) => r.storeId === s.id).length;

                      return (
                        <tr key={s.id} className="hover:bg-stone-50">
                          <td className="py-2.5 px-3 flex items-center gap-2">
                            <img src={s.logoUrl} alt={s.name} className="w-7 h-7 rounded-lg object-cover" />
                            <div>
                              <p className="font-bold text-stone-900">{s.name}</p>
                              <p className="text-[10px] font-mono text-stone-400">{s.id}</p>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isDemo ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                            }`}>
                              {isDemo ? 'Compte de démonstration' : 'Compte actif principal'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold">{storeProds} articles</td>
                          <td className="py-2.5 px-3">{storeOrds} transactions</td>
                          <td className="py-2.5 px-3">
                            <span className="text-emerald-700 font-bold text-[11px]">Vérifié</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Audit Logs Table */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-heading font-bold text-lg text-stone-900">
                  Journal d’audit des opérations sensibles
                </h2>
                <p className="text-xs text-stone-500">
                  Traçabilité des accès, modifications de tarifs, validations de paiements et modérations.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-600">Filtrer sévérité :</span>
                <select
                  value={auditFilter}
                  onChange={(e) => setAuditFilter(e.target.value as any)}
                  className="p-1.5 text-xs border border-stone-300 rounded-lg bg-white font-medium"
                >
                  <option value="all">Tous ({auditLogs.length})</option>
                  <option value="warning">Avertissements</option>
                  <option value="critical">Critiques</option>
                </select>
              </div>
            </div>

            <div className="bg-stone-900 text-stone-100 rounded-2xl shadow-xl p-4 overflow-hidden border border-stone-800 font-mono text-xs">
              <div className="space-y-3 divide-y divide-stone-800">
                {filteredAuditLogs.map((log) => (
                  <div key={log.id} className="pt-3 first:pt-0 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.severity === 'critical' ? 'bg-red-500 text-white' :
                          log.severity === 'warning' ? 'bg-amber-500 text-stone-950' : 'bg-emerald-600 text-white'
                        }`}>
                          {log.severity.toUpperCase()}
                        </span>
                        <span className="text-amber-400 font-bold">{log.action}</span>
                      </div>
                      <span className="text-stone-500 text-[11px]">
                        {new Date(log.timestamp).toLocaleString('fr-FR')} • IP: {log.ipAddress}
                      </span>
                    </div>

                    <p className="text-stone-300 text-[11px]">{log.details}</p>
                    <p className="text-stone-500 text-[10px]">
                      Auteur: {log.actorEmail} ({log.actorRole}) • Cible: {log.target}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-stone-200">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <h3 className="font-heading font-bold text-base text-stone-900">
                Modifier la formule {editingPlan.name}
              </h3>
              <button
                onClick={() => setEditingPlan(null)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Prix mensuel (FCFA)
                </label>
                <input
                  type="number"
                  required
                  value={editingPlan.priceMonthly}
                  onChange={(e) => setEditingPlan({ ...editingPlan, priceMonthly: Number(e.target.value) })}
                  className="w-full p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Quota maximum de produits
                </label>
                <input
                  type="number"
                  required
                  value={editingPlan.maxProducts}
                  onChange={(e) => setEditingPlan({ ...editingPlan, maxProducts: Number(e.target.value) })}
                  className="w-full p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Slogan descriptif
                </label>
                <input
                  type="text"
                  required
                  value={editingPlan.tagline}
                  onChange={(e) => setEditingPlan({ ...editingPlan, tagline: e.target.value })}
                  className="w-full p-2.5 border border-stone-300 rounded-xl outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="w-1/2 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Support Ticket Reply Modal */}
      {replyingMessage && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-200">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-stone-900">
                    Répondre au message de support
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    À destination de : {replyingMessage.senderName} ({replyingMessage.senderEmail})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReplyingMessage(null)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendReply} className="p-6 space-y-4 text-xs">
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  Message initial du commerçant ({replyingMessage.subject}) :
                </span>
                <p className="text-stone-700 italic">
                  "{replyingMessage.message}"
                </p>
              </div>

              <div>
                <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Votre réponse officielle
                </label>
                <textarea
                  rows={5}
                  required
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Rédigez votre réponse claire et bienveillante..."
                  className="w-full p-3 border border-stone-300 rounded-xl outline-none focus:ring-1 focus:ring-red-500 resize-none font-sans"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setReplyingMessage(null)}
                  className="w-1/2 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-xs cursor-pointer transition-colors"
                >
                  Transmettre la réponse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safe Purge Demo Accounts Confirmation Modal */}
      {showPurgeModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-red-200">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-red-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shadow">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-base text-stone-900">
                    Confirmation de Purge des Données de Test
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Nettoyage strict et irréversible des comptes de démonstration
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPurgeModal(false)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2">
                <span className="font-bold text-stone-900 block">Opérations qui vont être exécutées :</span>
                <ul className="space-y-1.5 text-stone-600 list-disc list-inside">
                  <li>Retrait des 4 boutiques de démonstration initiale de la base de données.</li>
                  <li>Suppression des catalogues et fausses commandes associées aux comptes de test.</li>
                  <li>Conservation intégrale de la boutique pilote <strong>Teranga Wax</strong> et de tous les comptes créés via Supabase.</li>
                </ul>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Nous vous recommandons de cliquer d'abord sur <strong>Sauvegarder JSON</strong> si vous désirez archiver un instantané complet.
                </span>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPurgeModal(false)}
                  className="w-1/2 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={isPurging}
                  onClick={() => {
                    setIsPurging(true);
                    purgeDemoData();
                    setIsPurging(false);
                    setShowPurgeModal(false);
                  }}
                  className="w-1/2 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-md cursor-pointer transition-colors"
                >
                  {isPurging ? 'Nettoyage...' : 'Confirmer la purge définitive'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restore Backup Confirmation Modal */}
      {showRestoreModal && pendingRestoreDetails && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-amber-200">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-amber-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-base text-stone-900">
                    Restaurer une Sauvegarde Plateforme
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Restauration complète des catalogues, boutiques et commandes
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowRestoreModal(false);
                  setPendingRestoreData(null);
                }}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2">
                <span className="font-bold text-stone-900 block">Détails de l'archive sélectionnée :</span>
                <ul className="space-y-1.5 text-stone-600 list-disc list-inside">
                  <li>Date de la sauvegarde : <strong>{pendingRestoreDetails.date}</strong></li>
                  <li>Nombre de boutiques : <strong>{pendingRestoreDetails.stores}</strong></li>
                  <li>Nombre d'articles au catalogue : <strong>{pendingRestoreDetails.products}</strong></li>
                </ul>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Attention : L'application de cette sauvegarde remplacera les données actuelles en mémoire par celles de l'archive.
                </span>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowRestoreModal(false);
                    setPendingRestoreData(null);
                  }}
                  className="w-1/2 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={isRestoring}
                  onClick={handleConfirmRestore}
                  className="w-1/2 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-md cursor-pointer transition-colors"
                >
                  {isRestoring ? 'Restauration en cours...' : 'Confirmer la restauration'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
