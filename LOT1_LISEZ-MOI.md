# Boutika – Lot 1 : données dans Supabase

> Ces fichiers n'ont PAS été exécutés ni testés. Appliquez-les sur cette branche, testez, puis fusionnez.

## Fichiers de cette branche

| Fichier | Rôle |
|---|---|
| `supabase/migrations/20261101000001_lot1_data_layer.sql` | tables, droits d'accès (RLS), triggers de sécurité |
| `supabase/scripts/cleanup_test_data.sql` | script MANUEL de suppression des comptes et données de test |
| `src/lib/db.ts` | couche d'accès aux données Supabase |
| `src/context/AppContext.tsx` | remplace l'ancien : lit/écrit dans Supabase, plus de localStorage ni de données de démonstration |

## Ordre d'application

1. **Sauvegarde** : Supabase > Database > Backups.
2. **Migration** : Supabase > SQL Editor > coller `20261101000001_lot1_data_layer.sql` > Run (rejouable sans risque).
   Elle suppose que `20261029000001_security_roles_audit.sql` est déjà passée. En cas d'erreur de type (ex. `uuid = text`), garder le message exact.
3. **Code** : récupérer cette branche, `npm install`, `npm run dev`.
4. **Nettoyage des comptes de test** : ouvrir `cleanup_test_data.sql`, lancer l'étape 1 (aperçu), renseigner les e-mails à garder,
   lancer le reste (il finit par `ROLLBACK`), puis remplacer par `COMMIT` quand les chiffres sont bons.

## Ce qui change

- Le tableau de bord admin n'affiche que les données réelles de la base.
- Boutiques, produits et commandes ne sont plus propres au navigateur : un acheteur voit les vraies boutiques, l'admin voit tous les vendeurs.
- Un vendeur ne peut plus se donner lui-même une formule : « Passer à Premium/VIP » crée une **demande** (`en_attente_validation`)
  que l'admin active via `activateSubscriptionRecord(id)` ou `setStorePlan(storeId, planId)`.
- Le stock est décrémenté par la base à chaque commande.

## Vérifications après application

1. Visiteur déconnecté : la marketplace n'affiche que de vraies boutiques actives.
2. Inscription d'un vendeur : sa boutique apparaît dans la table `stores`.
3. Ajout d'un produit : il apparaît dans `products` et survit à un rechargement / autre navigateur.
4. Commande passée par un visiteur : elle apparaît dans `orders`, le stock baisse, le vendeur la voit.
5. Un vendeur qui tente de changer son `plan_id` en console reçoit une erreur (trigger de sécurité).
6. Connexion admin : boutiques, paiements, messages et audit montrent la base réelle.

## Boutons admin à brancher (optionnels, `AdminDashboard.tsx`)

Le contexte expose `activateSubscriptionRecord(recordId)` et `setStorePlan(storeId, planId)`, mais l'interface admin ne les appelle pas encore.
Sans ces boutons, l'admin peut changer une formule directement dans la table `stores`.
Le KPI « revenus abonnements » du tableau admin doit aussi filtrer `status === 'active'`.

## Limites connues du lot 1

- Le choix de taille/couleur du client est toujours perdu à l'ajout au panier (lot 3).
- Les routes serveur `/api/platform/*`, `/api/payments/events`, `/api/kimsi/missions` ne sont pas encore protégées (lot 2).
- La page « Architecture » et les panneaux techniques de l'admin sont toujours là (lot 2).
- Les prix des formules modifiés par l'admin restent dans le navigateur de l'admin.
- Si l'enregistrement d'une commande échoue en base, le client a déjà vu sa confirmation : un message l'invite à contacter la boutique sur WhatsApp.
- Règle « Standard payant + 3 jours d'essai puis blocage » : décidée, **pas encore codée** (lot 2).
