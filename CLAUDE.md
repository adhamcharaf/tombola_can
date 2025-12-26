# CLAUDE.md - Instructions pour Claude Code

## 🎯 Contexte du projet

Tu développes une **PWA de gestion de tombola** pour Smart Technology Côte d'Ivoire, à l'occasion de la CAN 2025. L'application sera utilisée par des opératrices dans les **31 showrooms** Smart Technology.

**CRITIQUE** : C'est un projet d'entreprise à haute visibilité. Aucune perte de données n'est acceptable. La fiabilité prime sur tout.

---

## 📁 Documentation de référence

- **Spécifications complètes** : `SPECS.md` (LIS CE FICHIER EN PREMIER)
- Ce fichier contient : schéma DB, user flows, règles métier, structure projet

---

## 🛠️ Stack technique

```
Frontend     : React 18 + Vite
Styling      : Tailwind CSS
PWA          : vite-plugin-pwa
Offline DB   : Dexie.js (wrapper IndexedDB)
Backend      : Supabase (PostgreSQL + Storage)
```

---

## 🔌 Accès Supabase

Tu as accès au **MCP Supabase**. Utilise-le pour :
1. Créer les tables selon le schéma dans SPECS.md
2. Configurer le Storage bucket "factures"
3. Activer RLS et créer les policies
4. Insérer les données initiales (emplacements)

---

## 📋 Ordre de développement

### Phase 1 : Infrastructure (faire en premier)

```
1. Setup Supabase
   - Créer table `emplacements`
   - Créer table `participations`
   - Créer table `tirages`
   - Configurer Storage bucket
   - Activer RLS + policies
   - Insérer emplacements de test

2. Setup projet frontend
   - Initialiser Vite + React
   - Configurer Tailwind
   - Configurer PWA (manifest + service worker)
   - Setup Dexie.js pour IndexedDB
   - Configurer client Supabase
```

### Phase 2 : Fonctionnalités core

```
3. Écran identification opératrice
   - Dropdown emplacements (depuis Supabase, cache local)
   - Champ nom opératrice
   - Persistance localStorage
   - Redirection vers formulaire

4. Formulaire participation
   - Tous les champs avec validation
   - Calcul automatique catégorie
   - Vérification doublon facture (local)
   - Bouton capture photo

5. Composant caméra
   - Accès caméra arrière
   - Preview + retake
   - Compression avant stockage
   - Fallback si caméra indisponible

6. Logique offline/sync
   - Stockage IndexedDB via Dexie
   - Détection online/offline
   - Sync automatique vers Supabase
   - Upload différé des photos
   - Gestion des conflits (doublon facture)

7. Indicateur de statut
   - Badge dans header
   - Nombre de participations pending
   - État de connexion
```

### Phase 3 : Polish

```
8. Écran confirmation
9. Gestion erreurs utilisateur
10. Tests manuels
11. Optimisation PWA (icons, splash)
```

---

## ⚠️ Points d'attention critiques

### 1. Offline-first OBLIGATOIRE
```javascript
// Pattern à suivre : toujours sauvegarder en local d'abord
async function saveParticipation(data) {
  // 1. Générer ID local
  const localId = generateLocalId();
  
  // 2. Sauvegarder en IndexedDB IMMÉDIATEMENT
  await db.participations.add({
    ...data,
    localId,
    syncStatus: 'pending',
    createdAt: new Date().toISOString()
  });
  
  // 3. Déclencher sync en arrière-plan (ne pas attendre)
  triggerSync(); // fire and forget
  
  // 4. Retourner succès immédiatement
  return { success: true, localId };
}
```

### 2. Unicité facture (double vérification)
```javascript
// Vérifier en local avant de sauvegarder
async function checkFactureExists(numFacture) {
  const existing = await db.participations
    .where('numFacture')
    .equals(numFacture)
    .first();
  return !!existing;
}
```

### 3. Compression photo obligatoire
```javascript
// Utiliser browser-image-compression
import imageCompression from 'browser-image-compression';

const options = {
  maxSizeMB: 0.5,           // 500 KB max
  maxWidthOrHeight: 1200,
  useWebWorker: true
};

const compressedFile = await imageCompression(file, options);
```

### 4. Ne jamais bloquer l'UI
- Toutes les opérations réseau en arrière-plan
- Feedback visuel immédiat (optimistic UI)
- L'opératrice doit pouvoir enchaîner les enregistrements

---

## 🎨 Guidelines UI/UX

### Mobile-first
- Taille minimum boutons : 48x48px
- Taille texte minimum : 16px
- Padding généreux (16px minimum)

### Charte graphique Smart Technology
```css
/* Couleur principale Smart Technology */
--smart-red: #E31E24;
--smart-red-dark: #C41A1F;
--smart-white: #FFFFFF;
--smart-black: #1A1A1A;

/* Tailwind config à ajouter */
colors: {
  'smart-red': '#E31E24',
  'smart-red-dark': '#C41A1F',
}

/* Classes Tailwind à utiliser */
primary: bg-smart-red hover:bg-smart-red-dark text-white
success: bg-green-500
warning: bg-amber-500
error: bg-red-700 (plus foncé pour différencier du primary)
```

### Devise
"LE MEILLEUR SINON RIEN" - peut être affiché en footer ou écran d'accueil

### Pattern de formulaire
```jsx
// Chaque champ doit avoir :
<div className="mb-4">
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Nom *
  </label>
  <input 
    className="w-full px-4 py-3 text-lg border rounded-lg focus:ring-2 focus:ring-blue-500"
    // ...
  />
  {error && (
    <p className="mt-1 text-sm text-red-600">{error}</p>
  )}
</div>
```

---

## 📦 Dépendances à installer

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@supabase/supabase-js": "^2.x",
    "dexie": "^3.2.x",
    "dexie-react-hooks": "^1.1.x",
    "browser-image-compression": "^2.x",
    "react-webcam": "^7.x"
  },
  "devDependencies": {
    "vite": "^5.x",
    "@vitejs/plugin-react": "^4.x",
    "vite-plugin-pwa": "^0.17.x",
    "tailwindcss": "^3.x",
    "autoprefixer": "^10.x",
    "postcss": "^8.x"
  }
}
```

---

## 🗄️ Schéma Dexie (IndexedDB)

```javascript
// src/lib/db.js
import Dexie from 'dexie';

export const db = new Dexie('TombolaCAN');

db.version(1).stores({
  // Cache des showrooms
  emplacements: 'id, nom, ville',
  
  // Participations (avec index pour recherche)
  participations: '++id, localId, numFacture, syncStatus, createdAt, emplacementId',
  
  // Config opératrice
  config: 'key'
});
```

---

## 🔄 Format des données

### Participation (local)
```typescript
interface LocalParticipation {
  id?: number;                    // Auto-increment Dexie
  localId: string;                // UUID généré côté client
  nom: string;
  prenom: string;
  telephone: string;
  numFacture: string;
  montantAchat: number;
  categorie: 'salon' | 'cuisine' | 'maison';
  photoBase64?: string;           // Photo compressée en base64
  emplacementId: string;          // UUID de l'emplacement
  nomOperatrice: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error' | 'conflict';
  syncError?: string;
  serverId?: string;              // UUID Supabase après sync
  createdAt: string;              // ISO timestamp
  syncedAt?: string;
}
```

### Config opératrice
```typescript
interface OperatorConfig {
  key: 'operator';
  emplacementId: string;
  emplacementNom: string;
  nomOperatrice: string;
  configuredAt: string;
}
```

---

## ✅ Checklist avant de coder

Avant chaque fonctionnalité, vérifie :
- [ ] J'ai lu la section correspondante dans SPECS.md
- [ ] Je gère le cas offline
- [ ] Je donne un feedback visuel immédiat
- [ ] Les messages sont en français
- [ ] Les erreurs sont gérées proprement

---

## 🚫 À ne PAS faire

1. **Ne jamais attendre la réponse Supabase** pour confirmer à l'utilisateur
2. **Ne jamais stocker de données sensibles** (pas de mots de passe)
3. **Ne jamais utiliser la galerie photos** (capture directe uniquement)
4. **Ne jamais bloquer l'enregistrement** si la photo échoue
5. **Ne jamais utiliser `alert()`** - utiliser des toasts/notifications inline

---

## 💬 Format de commit suggéré

```
feat: add participation form with validation
fix: handle offline photo upload
chore: configure PWA manifest
docs: update README with setup instructions
```

---

## 🆘 En cas de doute

1. Relis SPECS.md pour les détails métier
2. Privilégie toujours la fiabilité sur les features
3. Si un cas edge n'est pas couvert, demande clarification
4. Teste le mode offline régulièrement

---

*Bonne chance ! Ce projet est important - prends le temps de bien faire les choses.*
