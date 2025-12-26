# CHECKLIST DE TESTS - TOMBOLA CAN 2025
## Application critique - Aucune tolérance aux erreurs

---

## 🔴 PRIORITÉ CRITIQUE - Intégrité des données

### 1. Tests Offline-First (VITAL)
- [ ] **T1.1** Enregistrer une participation en mode avion → Doit être sauvegardée localement
- [ ] **T1.2** Fermer l'app en mode avion → Rouvrir → Les données doivent persister
- [ ] **T1.3** Enregistrer 10 participations offline → Toutes doivent être dans IndexedDB
- [ ] **T1.4** Repasser online → Toutes les participations doivent se synchroniser
- [ ] **T1.5** Couper le réseau EN PLEIN enregistrement → Aucune perte de données
- [ ] **T1.6** Vider le cache navigateur → Les données IndexedDB doivent persister
- [ ] **T1.7** Tuer l'app (force close) pendant une saisie → Données précédentes intactes

### 2. Tests Unicité Facture (ANTI-FRAUDE)
- [ ] **T2.1** Enregistrer facture "FAC-001" → OK
- [ ] **T2.2** Ré-enregistrer "FAC-001" dans même session → REFUSÉ avec message clair
- [ ] **T2.3** Ré-enregistrer "FAC-001" après redémarrage app → REFUSÉ (vérif locale)
- [ ] **T2.4** Ré-enregistrer "FAC-001" sur autre appareil → REFUSÉ par Supabase
- [ ] **T2.5** Tester variations: "FAC-001", "fac-001", " FAC-001 " → Gérer la casse/espaces
- [ ] **T2.6** Vérifier contrainte UNIQUE en base → `SELECT num_facture FROM participations`

### 3. Tests Synchronisation
- [ ] **T3.1** Sync auto au retour online → Vérifier dans Supabase
- [ ] **T3.2** Sync partielle (2/5 réussies, coupure réseau) → Les 2 marquées synced, 3 pending
- [ ] **T3.3** Conflit de facture pendant sync → Marquée "conflict", pas "error"
- [ ] **T3.4** Retry automatique après erreur réseau → Max 3 tentatives avec backoff
- [ ] **T3.5** Indicateur sync affiche le bon statut → pending/syncing/synced/error
- [ ] **T3.6** Forcer sync manuel via bouton → Fonctionne

---

## 🟠 PRIORITÉ HAUTE - Sécurité

### 4. Tests Injection / XSS
- [ ] **T4.1** Nom: `<script>alert('XSS')</script>` → Doit être échappé/affiché comme texte
- [ ] **T4.2** Nom: `'; DROP TABLE participations; --` → Rejeté ou échappé
- [ ] **T4.3** Téléphone: `0712345678<img src=x onerror=alert(1)>` → Rejeté
- [ ] **T4.4** Facture: `" onclick="alert(1)"` → Échappé proprement
- [ ] **T4.5** Vérifier que tous les inputs sont sanitisés côté client ET serveur

### 5. Tests Validation Métier
- [ ] **T5.1** Montant 49999 → REFUSÉ "Montant minimum 50 000 FCFA"
- [ ] **T5.2** Montant 50000 → Accepté, catégorie SALON
- [ ] **T5.3** Montant 149999 → Catégorie SALON
- [ ] **T5.4** Montant 150000 → Catégorie CUISINE
- [ ] **T5.5** Montant 299999 → Catégorie CUISINE
- [ ] **T5.6** Montant 300000 → Catégorie MAISON
- [ ] **T5.7** Montant 1000000 → Catégorie MAISON
- [ ] **T5.8** Montant négatif -50000 → REFUSÉ
- [ ] **T5.9** Montant avec lettres "abc" → REFUSÉ ou ignoré
- [ ] **T5.10** Montant avec espaces "150 000" → Doit fonctionner

### 6. Tests Téléphone CI
- [ ] **T6.1** 0712345678 → Valide (07)
- [ ] **T6.2** 0512345678 → Valide (05)
- [ ] **T6.3** 0112345678 → Valide (01)
- [ ] **T6.4** 0812345678 → INVALIDE (08 n'existe pas en CI)
- [ ] **T6.5** 071234567 → INVALIDE (9 chiffres)
- [ ] **T6.6** 07123456789 → INVALIDE (11 chiffres)
- [ ] **T6.7** +22507123456 → Gérer ou refuser format international
- [ ] **T6.8** Espaces "07 12 34 56 78" → Doit fonctionner

### 7. Tests Authentification/Accès
- [ ] **T7.1** Accès direct à /participation sans config → Redirigé vers setup
- [ ] **T7.2** LocalStorage vidé → Retour à l'écran de configuration
- [ ] **T7.3** Modifier localStorage manuellement → App doit gérer gracieusement
- [ ] **T7.4** Vérifier que la clé Supabase anon ne permet pas de DELETE/UPDATE

---

## 🟡 PRIORITÉ MOYENNE - UX et Performance

### 8. Tests UI/UX Mobile
- [ ] **T8.1** Tester sur iPhone SE (petit écran 320px)
- [ ] **T8.2** Tester sur Samsung Galaxy (Android)
- [ ] **T8.3** Tester sur tablette iPad
- [ ] **T8.4** Boutons minimum 48x48px → Vérifier au doigt
- [ ] **T8.5** Texte lisible sans zoom (min 16px)
- [ ] **T8.6** Formulaire utilisable d'une main
- [ ] **T8.7** Pas de zoom auto sur focus input iOS
- [ ] **T8.8** Clavier numérique pour téléphone/montant

### 9. Tests Caméra/Photo
- [ ] **T9.1** Caméra arrière par défaut
- [ ] **T9.2** Switch vers caméra frontale
- [ ] **T9.3** Bouton "Reprendre" fonctionne
- [ ] **T9.4** Photo compressée < 500KB
- [ ] **T9.5** Preview visible avant validation
- [ ] **T9.6** Refus permission caméra → Message d'erreur clair
- [ ] **T9.7** Appareil sans caméra → Fallback ou message

### 10. Tests Performance
- [ ] **T10.1** First Contentful Paint < 1.5s (Lighthouse)
- [ ] **T10.2** Time to Interactive < 3s
- [ ] **T10.3** Bundle size < 200KB gzipped
- [ ] **T10.4** Enregistrement offline < 500ms
- [ ] **T10.5** Chargement showrooms < 2s (avec cache)
- [ ] **T10.6** 100 participations en IndexedDB → App reste fluide

### 11. Tests PWA
- [ ] **T11.1** Installable sur Android (banner "Ajouter à l'écran")
- [ ] **T11.2** Installable sur iOS (Safari → Partager → Sur l'écran d'accueil)
- [ ] **T11.3** Icône correcte après installation
- [ ] **T11.4** Splash screen au lancement
- [ ] **T11.5** Mode standalone (pas de barre URL)
- [ ] **T11.6** Fonctionne 100% offline après installation
- [ ] **T11.7** Manifest valide (Lighthouse PWA)

---

## 🟢 PRIORITÉ NORMALE - Edge Cases

### 12. Tests Réseau
- [ ] **T12.1** WiFi lent (throttle 2G) → App reste utilisable
- [ ] **T12.2** Connexion intermittente → Pas de crash
- [ ] **T12.3** Timeout Supabase → Retry automatique
- [ ] **T12.4** DNS failure → Message d'erreur, données locales ok
- [ ] **T12.5** CORS error → Ne devrait pas arriver, sinon debug

### 13. Tests Stockage
- [ ] **T13.1** IndexedDB plein → Message d'erreur clair
- [ ] **T13.2** LocalStorage désactivé → App doit fonctionner (fallback)
- [ ] **T13.3** Mode navigation privée → Avertissement ou fonctionnement limité
- [ ] **T13.4** Vider IndexedDB manuellement → App se réinitialise proprement

### 14. Tests Multi-sessions
- [ ] **T14.1** 2 onglets ouverts → Pas de conflit
- [ ] **T14.2** Même opératrice sur 2 appareils → Sync correcte
- [ ] **T14.3** Changement d'emplacement mid-session → Nouvelles participations avec bon ID

### 15. Tests Données Limites
- [ ] **T15.1** Nom très long (100+ caractères) → Tronqué ou refusé
- [ ] **T15.2** Caractères spéciaux: é, è, ê, ô, ç, ñ → Supportés
- [ ] **T15.3** Emojis dans le nom → Refusés proprement
- [ ] **T15.4** Facture très longue → Limite raisonnable
- [ ] **T15.5** Montant max (999 999 999) → Géré correctement

---

## 🔵 TESTS AUTOMATISÉS À CRÉER

### 16. Tests Unitaires (Vitest)
```javascript
// À créer dans src/__tests__/
- validation.test.js  → Toutes les règles de validation
- category.test.js    → Calcul des catégories
- db.test.js          → Opérations IndexedDB
- sync.test.js        → Logique de synchronisation
```

### 17. Tests E2E (Playwright/Cypress)
```javascript
// À créer dans e2e/
- setup.spec.js       → Flow d'identification
- participation.spec.js → Enregistrement complet
- offline.spec.js     → Scénarios hors ligne
- validation.spec.js  → Tous les cas d'erreur
```

---

## 📋 CHECKLIST PRÉ-DÉPLOIEMENT

### Environnement
- [ ] Variables d'environnement production configurées
- [ ] Clé Supabase anon (pas service key !)
- [ ] HTTPS obligatoire (pour caméra et PWA)
- [ ] Domaine configuré correctement

### Base de données
- [ ] RLS activé sur toutes les tables
- [ ] Contraintes CHECK en place
- [ ] Index créés pour performance
- [ ] Backup automatique configuré

### Monitoring
- [ ] Logs d'erreurs côté client (Sentry ou similaire)
- [ ] Alertes si trop d'erreurs sync
- [ ] Dashboard Supabase pour suivre les participations

### Documentation
- [ ] Guide utilisateur pour opératrices
- [ ] Procédure de dépannage
- [ ] Contact support en cas de problème

---

## 🎯 SCÉNARIO DE TEST COMPLET (À FAIRE EN RÉEL)

### Simulation journée opératrice
1. Installer l'app sur téléphone réel
2. Configurer emplacement + nom
3. Enregistrer 5 participations en WiFi
4. Passer en mode avion
5. Enregistrer 3 participations offline
6. Fermer complètement l'app
7. Rouvrir l'app (toujours offline)
8. Vérifier que les 3 sont visibles
9. Enregistrer 2 de plus
10. Réactiver le réseau
11. Vérifier sync automatique (8 total sur Supabase)
12. Tenter doublon facture → Doit échouer
13. Vérifier toutes les photos uploadées

### Validation finale
- [ ] TOUS les tests ci-dessus passés
- [ ] Aucune erreur console en production
- [ ] Testé sur 3 appareils différents minimum
- [ ] Testé par une personne externe (non-développeur)

---

*Document créé le 26/12/2024 - Tombola CAN 2025 - Smart Technology*
