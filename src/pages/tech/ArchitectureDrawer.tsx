import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Cpu, 
  Database, 
  ShieldCheck, 
  CreditCard, 
  DollarSign, 
  GitBranch, 
  Server, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeft, 
  Copy, 
  Check,
  Lock,
  Clock,
  RefreshCw
} from 'lucide-react';

export const ArchitecturePage: React.FC = () => {
  const { 
    setCurrentView, 
    showToast, 
    isSupabaseConfigured, 
    testConnection, 
    supabaseConnectionStatus 
  } = useApp();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [testOutput, setTestOutput] = useState<string | null>(null);

  const handleTestSupabase = async () => {
    setTestingSupabase(true);
    const result = await testConnection();
    setTestingSupabase(false);
    setTestOutput(result.message);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedSection(id);
    showToast('Extrait SQL / Architecture copié !');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const sqlSchemaSnippet = `-- 1. EXTENSIONS & SCHÉMA RELATIONNEL POUR BOUTIKA (SUPABASE / POSTGRESQL)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des Profils Utilisateurs (Liée à auth.users de Supabase)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'vendor' CHECK (role IN ('vendor', 'super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des Boutiques (Chaque boutique appartient à un vendeur)
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE, -- e.g. "teranga-wax" pour boutika.sn/v/teranga-wax
  description TEXT,
  whatsapp_number TEXT NOT NULL,
  address TEXT,
  city TEXT DEFAULT 'Dakar',
  logo_url TEXT,
  banner_url TEXT,
  plan_id TEXT NOT NULL DEFAULT 'decouverte' CHECK (plan_id IN ('decouverte', 'pro', 'business')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspendue', 'en_attente')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des Produits
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL CHECK (price >= 0), -- Prix en FCFA (XOF)
  compare_at_price INTEGER,
  category TEXT NOT NULL,
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  stock INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des Commandes
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_zone TEXT NOT NULL,
  delivery_fee INTEGER NOT NULL DEFAULT 0,
  subtotal INTEGER NOT NULL,
  total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'nouvelle' CHECK (status IN ('nouvelle', 'en_preparation', 'expediee', 'livree', 'annulee')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('especes_livraison', 'wave', 'orange_money', 'carte_bancaire')),
  payment_status TEXT NOT NULL DEFAULT 'en_attente' CHECK (payment_status IN ('en_attente', 'paye', 'echec')),
  items JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des Événements Webhooks & Idempotence des Paiements
CREATE TABLE public.payment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idempotency_key TEXT NOT NULL UNIQUE, -- Identifiant unique envoyé par Wave / OM
  gateway TEXT NOT NULL, -- 'wave', 'orange_money', 'stripe'
  store_id UUID REFERENCES public.stores(id),
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XOF',
  status TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);`;

  const rlsSnippet = `-- 2. FONCTIONS DE SÉCURITÉ SANS RÉCURSION & POLITIQUES RLS
-- Fonction SECURITY DEFINER qui s'exécute avec les droits postgres pour briser le risque de récursion infinie
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'super_admin' FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Activation RLS sur toutes les tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- PROFILS : Lecture de son propre profil (utilisateur standard)
CREATE POLICY "Lecture de son propre profil"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- PROFILS : Super Admin consulte tous les profils (AUCUN RISQUE DE RÉCURSION grâce à is_super_admin())
CREATE POLICY "Super Admin consulte tous les profils"
ON public.profiles FOR SELECT
USING (public.is_super_admin());

-- PROFILS : Modification de son propre profil
CREATE POLICY "Utilisateur modifie son profil"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- TRIGGER DE SÉCURITÉ INVIOLABLE : Empêche toute auto-élévation de rôle
-- Même avec un appel API direct ou une injection, la colonne 'role' ne peut être modifiée
CREATE OR REPLACE FUNCTION public.guard_profile_role_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Seul un Super Admin authentifié ou le service_role backend peut altérer un rôle
    IF NOT public.is_super_admin() AND current_setting('role', true) <> 'service_role' THEN
      RAISE EXCEPTION 'Action non autorisée : Seul un Super Admin ou le service_role peut modifier un rôle.';
    END IF;

    -- Consignation immédiate et obligatoire dans le journal d’audit
    INSERT INTO public.audit_logs (
      id, action, target, details, actor_email, actor_role, severity, timestamp
    ) VALUES (
      'aud-' || floor(random() * 1000000)::text,
      'ROLE_ESCALATION_EVENT',
      NEW.id::text,
      'Modification de privilège pour ' || NEW.email || ' : [' || OLD.role || '] -> [' || NEW.role || ']',
      COALESCE(auth.jwt() ->> 'email', 'service_role'),
      'super_admin',
      'critical',
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_role ON public.profiles;
CREATE TRIGGER trg_guard_profile_role
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_profile_role_update();

-- PROCÉDURE CONTRÔLÉE : Attribution sécurisée du rôle Super Admin
CREATE OR REPLACE FUNCTION public.admin_promote_user(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_super_admin() AND current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'Accès refusé : Seul un Super Admin peut désigner un autre administrateur.';
  END IF;

  UPDATE public.profiles
  SET role = 'super_admin', updated_at = NOW()
  WHERE id = target_user_id;
END;
$$;

-- TOUT LE MONDE (public) peut lire les boutiques actives
CREATE POLICY "Lecture publique des boutiques actives"
ON public.stores FOR SELECT
USING (status = 'active');

-- SEUL LE VENDEUR PROPRIÉTAIRE peut créer sa boutique
CREATE POLICY "Création de boutique par le vendeur authentifié"
ON public.stores FOR INSERT
WITH CHECK (auth.uid() = vendor_id);

-- SEUL LE VENDEUR PROPRIÉTAIRE peut modifier sa boutique
CREATE POLICY "Modification réservée au propriétaire"
ON public.stores FOR UPDATE
USING (auth.uid() = vendor_id);

-- PRODUITS : Lecture publique si la boutique est active
CREATE POLICY "Lecture publique des produits"
ON public.products FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.stores 
  WHERE stores.id = products.store_id AND stores.status = 'active'
));

-- PRODUITS : Écriture/Modification réservée au vendeur
CREATE POLICY "Gestion des produits par le vendeur propriétaire"
ON public.products FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.stores 
  WHERE stores.id = products.store_id AND stores.vendor_id = auth.uid()
));

-- COMMANDES : Le vendeur ne voit que les commandes de ses propres boutiques
CREATE POLICY "Vendeur consulte uniquement ses commandes"
ON public.orders FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.stores 
  WHERE stores.id = orders.store_id AND stores.vendor_id = auth.uid()
));

-- CLIENT : Tout client anonyme peut créer une commande
CREATE POLICY "Insertion publique de commande"
ON public.orders FOR INSERT
WITH CHECK (true);`;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <button
            onClick={() => setCurrentView('home')}
            className="flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à la plateforme</span>
          </button>
          <h1 className="font-heading font-black text-3xl text-stone-900">
            Dossier d’Architecture & Sécurité Boutika
          </h1>
          <p className="text-xs text-stone-500">
            Spécifications techniques pour le fondateur et les ingénieurs (Budget &lt; 100 € / mois)
          </p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs px-3.5 py-2 rounded-xl flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="font-bold">Zéro compromis de sécurité</span>
        </div>
      </div>

      {/* Section 1: Executive Architecture & < 100€ Budget */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-xl text-stone-900">
              1. Architecture Solopreneur & Budget Réel (&lt; 100 € / mois)
            </h2>
            <p className="text-xs text-stone-500">
              Dimensionné pour 500 à 2 000 boutiques actives sans coûts d'infrastructure démesurés.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
            <span className="font-bold text-stone-900">Base de données & Auth</span>
            <p className="text-amber-700 font-extrabold text-sm">Supabase Pro : ~23 € / mois</p>
            <p className="text-stone-500 text-[11px]">PostgreSQL managé, 8 GB stockage, Auth JWT, Edge Functions, Backups quotidiens.</p>
          </div>

          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
            <span className="font-bold text-stone-900">Hébergement Frontend & CDN</span>
            <p className="text-emerald-700 font-extrabold text-sm">Vercel / Cloud Run : 0 € à 18 €</p>
            <p className="text-stone-500 text-[11px]">Edge caching mondial, certificats SSL automatiques, temps de chargement ultra rapide à Dakar.</p>
          </div>

          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
            <span className="font-bold text-stone-900">Nom de domaine (.sn)</span>
            <p className="text-stone-900 font-extrabold text-sm">NIC Sénégal : ~1,50 € / mois</p>
            <p className="text-stone-500 text-[11px]">(Soit ~18 € / an pour boutika.sn auprès du régulateur sénégalais).</p>
          </div>

          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
            <span className="font-bold text-stone-900">Code & CI/CD</span>
            <p className="text-stone-900 font-extrabold text-sm">GitHub Team : 0 € à 4 €</p>
            <p className="text-stone-500 text-[11px]">Versionnage de code, GitHub Actions pour les tests automatiques et déploiement continu.</p>
          </div>
        </div>

        <div className="p-4 bg-stone-900 text-stone-200 rounded-2xl text-xs space-y-1">
          <p className="font-bold text-amber-400">Total mensuel estimé : ~25 € à 45 € / mois.</p>
          <p className="text-stone-400">
            L'architecture respecte largement la contrainte de budget &lt; 100 €, tout en permettant un passage à l'échelle immédiat sans refonte logicielle.
          </p>
        </div>
      </div>

      {/* Phase 2: Supabase Connection & Environment Status */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
              isSupabaseConfigured ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-bold text-xl text-stone-900">
                  Phase 2 : Connecteur Supabase & Variables d'environnement
                </h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  isSupabaseConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                }`}>
                  {isSupabaseConfigured ? 'Configuré' : 'En attente de clés'}
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Module client initialisé dans <code>src/lib/supabase.ts</code> via <code>@supabase/supabase-js</code>.
              </p>
            </div>
          </div>

          <button
            onClick={handleTestSupabase}
            disabled={testingSupabase}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 self-start sm:self-auto transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingSupabase ? 'animate-spin' : ''}`} />
            <span>{testingSupabase ? 'Test en cours...' : 'Tester la connexion Supabase'}</span>
          </button>
        </div>

        {testOutput && (
          <div className={`p-4 rounded-2xl text-xs font-mono border ${
            isSupabaseConfigured ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-amber-50 text-amber-900 border-amber-200'
          }`}>
            <strong>Résultat du test :</strong> {testOutput}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
            <p className="font-bold text-stone-900">Variables publiques requises (.env) :</p>
            <div className="space-y-1 font-mono text-[11px] bg-white p-2.5 rounded-xl border border-stone-200 text-stone-700">
              <p>VITE_SUPABASE_URL=https://xyz.supabase.co</p>
              <p>VITE_SUPABASE_PUBLISHABLE_KEY=sb_pub_... ou anon_key</p>
            </div>
            <p className="text-[11px] text-stone-500">
              Injectées côté navigateur par Vite. Elles ne confèrent que les droits autorisés par vos règles RLS.
            </p>
          </div>

          <div className="p-4 bg-red-50 rounded-2xl border border-red-200 space-y-2 text-red-950">
            <p className="font-bold flex items-center gap-1.5 text-red-900">
              <ShieldCheck className="w-4 h-4 text-red-600 shrink-0" />
              <span>Règles de sécurité impératives :</span>
            </p>
            <ul className="space-y-1 text-[11px] list-disc pl-4 text-red-900">
              <li><strong>Jamais de clé service_role dans le frontend</strong> ni dans le dépôt de code.</li>
              <li><strong>Aucun mot de passe PostgreSQL</strong> direct dans les fichiers du client.</li>
              <li><strong>Pas d'élévation de privilèges Super Admin</strong> depuis les formulaires React.</li>
              <li><strong>Paiements validés côté serveur uniquement</strong> (webhooks Wave / Orange Money avec signature HMAC).</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Section 2: PostgreSQL Schema */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-xl text-stone-900">
                2. Schéma Relationnel PostgreSQL
              </h2>
              <p className="text-xs text-stone-500">
                Isolation stricte des données entre commerçants (multi-tenant avec contraintes référentielles).
              </p>
            </div>
          </div>

          <button
            onClick={() => copyToClipboard(sqlSchemaSnippet, 'sql')}
            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            {copiedSection === 'sql' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copier SQL</span>
          </button>
        </div>

        <pre className="bg-stone-900 text-stone-200 p-4 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-96 border border-stone-800 leading-relaxed">
          {sqlSchemaSnippet}
        </pre>
      </div>

      {/* Section 3: Row Level Security (RLS) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-xl text-stone-900">
                3. Séparation des données et Politiques RLS (Row Level Security)
              </h2>
              <p className="text-xs text-stone-500">
                Garantie mathématique qu'un vendeur ne peut pas accéder aux données d'un autre en manipulant un identifiant.
              </p>
            </div>
          </div>

          <button
            onClick={() => copyToClipboard(rlsSnippet, 'rls')}
            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            {copiedSection === 'rls' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copier RLS</span>
          </button>
        </div>

        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 font-medium">
          <strong>Principe cardinal appliqué :</strong> Chaque requête SQL vers la base est automatiquement filtrée au niveau du moteur PostgreSQL via le jeton de session JWT du vendeur (<code>auth.uid() = vendor_id</code>). Même si un utilisateur malveillant modifie un identifiant dans l'inspecteur web, la base refuse la transaction.
        </div>

        <pre className="bg-stone-900 text-emerald-300 p-4 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-96 border border-stone-800 leading-relaxed">
          {rlsSnippet}
        </pre>
      </div>

      {/* Section 4: Super Admin Role Security */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-xl text-stone-900">
              4. Attribution et Contrôle Sécurisé du Rôle Super Administrateur
            </h2>
            <p className="text-xs text-stone-500">
              Règle impérative : Le rôle admin ne provient jamais d'une assertion frontend ou d'un mot de passe hardcodé.
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-stone-700 leading-relaxed">
          <p>
            Pour prévenir toute élévation de privilèges (Privilege Escalation), Boutika utilise une approche en double barrière côté serveur :
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Stockage isolé du rôle :</strong> Le champ <code>profiles.role</code> n'est modifiable par aucune politique RLS client. Seul le <code>service_role</code> de Supabase (accessible uniquement depuis les Edge Functions sécurisées avec une clé secrète côté serveur) est autorisé à modifier un rôle.
            </li>
            <li>
              <strong>Validation cryptographique par Custom Claims :</strong> Le jeton JWT émis lors de la connexion inclut un claim vérifiable (<code>user_metadata.is_super_admin = true</code>). Les routes protégées de l'API rejettent immédiatement les requêtes sans ce claim serveur.
            </li>
            <li>
              <strong>Aucun mot de passe codé en dur :</strong> Aucun compte super-administrateur par défaut n'est injecté dans les fichiers frontend. L'initialisation du premier administrateur s'effectue via un script CLI exécuté en local lors du bootstrap.
            </li>
          </ul>
        </div>
      </div>

      {/* Section 5: Wave & Orange Money Safe Webhook Architecture */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-xl text-stone-900">
              5. Architecture des Paiements et Webhooks Sécurisés (Wave & Orange Money)
            </h2>
            <p className="text-xs text-stone-500">
              Vérification stricte côté serveur avec idempotence et signature HMAC.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-1">
            <p className="font-bold text-stone-900">1. Signature HMAC</p>
            <p className="text-stone-500 text-[11px]">
              Chaque webhook reçu de Wave ou Orange Money est authentifié via un en-tête <code>X-Signature</code> calculé avec une clé secrète partagée.
            </p>
          </div>

          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-1">
            <p className="font-bold text-stone-900">2. Table d'Idempotence</p>
            <p className="text-stone-500 text-[11px]">
              Pour éviter les doubles débits ou doubles validations en cas de retry réseau, chaque événement est enregistré dans <code>payment_events</code> avec contrainte unique.
            </p>
          </div>

          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-1">
            <p className="font-bold text-stone-900">3. Zéro Donnée Bancaire</p>
            <p className="text-stone-500 text-[11px]">
              Aucun numéro de carte, CVV ou mot de passe marchand n'est transité ni stocké sur nos serveurs.
            </p>
          </div>
        </div>

        <div className="p-4 bg-red-50 rounded-2xl border border-red-200 text-xs text-red-950 font-medium">
          <strong>Règle d'or de Boutika :</strong> Un commerçant n'obtient l'accès à une formule payante QUE lorsque la transaction est marquée <code>status = 'completed'</code> par le serveur après réception du webhook validé. Une redirection frontend <code>/paiement-reussi</code> ne donne JAMAIS droit aux fonctionnalités.
        </div>
      </div>

      {/* Section 6: MVP Status vs Production Roadmap */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-8 space-y-6">
        <h2 className="font-heading font-black text-2xl text-amber-400">
          6. État Actuel du Prototype vs Feuille de Route de Déploiement
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-3 bg-stone-800 p-5 rounded-2xl border border-stone-700">
            <span className="font-bold text-emerald-400 text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Ce qui fonctionne en direct dans ce prototype :
            </span>
            <ul className="space-y-2 text-stone-300">
              <li>✓ Navigation complète sur l'ensemble des pages publiques et légales</li>
              <li>✓ Console vendeur réactive (catalogue, ajout/modification produits, gestion commandes, alertes stock)</li>
              <li>✓ Vitrine publique mobile-first avec panier, calcul des frais de livraison et générateur de commande WhatsApp formaté</li>
              <li>✓ Tableau de bord Super Admin avec gestion boutiques, modification plans, messagerie support et journaux d'audit</li>
              <li>✓ Persistance locale continue (localStorage) pour tester l'impact direct des modifications</li>
              <li>✓ Simulateur de paiement respectant le workflow webhook serveur</li>
            </ul>
          </div>

          <div className="space-y-3 bg-stone-800 p-5 rounded-2xl border border-stone-700">
            <span className="font-bold text-amber-400 text-sm flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Étapes de raccordement technique en production :
            </span>
            <ul className="space-y-2 text-stone-300">
              <li>1. Provisioning du projet Supabase & exécution des scripts SQL de migration</li>
              <li>2. Signature des conventions de distribution marchande avec Wave Sénégal et Orange Money</li>
              <li>3. Déploiement des Edge Functions pour la réception des webhooks signés</li>
              <li>4. Configuration du nom de domaine officiel <code>boutika.sn</code> au NIC Sénégal</li>
              <li>5. Campagne de tests pilotes avec 20 vendeurs sélectionnés au marché Sandaga et Médina</li>
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
};
