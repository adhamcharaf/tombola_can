# 📋 SPÉCIFICATIONS TECHNIQUES - TOMBOLA CAN 2025

## Smart Technology Côte d'Ivoire

---

## 1. CONTEXTE DU PROJET

### 1.1 Objectif
Développer une application PWA permettant d'enregistrer les participations à une tombola organisée à l'occasion de la CAN 2025 au Maroc. L'application sera utilisée dans les **31 showrooms Smart Technology** à travers la Côte d'Ivoire.

### 1.2 Contraintes clés
- **Fiabilité absolue** : Projet d'entreprise, aucune perte de données acceptable
- **Simplicité d'utilisation** : Opératrices non-techniques sur le terrain
- **Fonctionnement offline** : Zones à connectivité variable
- **Anti-fraude** : Traçabilité complète de chaque participation

---

## 2. RÈGLES MÉTIER DE LA TOMBOLA

### 2.1 Lots à gagner
| Catégorie | Lot | Montant d'achat requis |
|-----------|-----|------------------------|
| `salon` | Équipement salon complet | 50 000 - 149 900 FCFA |
| `cuisine` | Cuisine complète | 150 000 - 299 900 FCFA |
| `maison` | Électroménager maison complète | 300 000+ FCFA |

### 2.2 Règles de participation
- **1 achat = 1 participation** dans la catégorie correspondante
- **1 facture = 1 seule inscription** (unicité stricte)
- Montant minimum éligible : **50 000 FCFA**
- La catégorie est **calculée automatiquement** selon le montant

---

## 3. ARCHITECTURE TECHNIQUE

### 3.1 Stack technologique
```
Frontend : React 18+ avec Vite
Styling  : Tailwind CSS
PWA      : Vite PWA Plugin + Service Worker
Stockage : IndexedDB (Dexie.js) pour offline
Backend  : Supabase (Auth désactivé, DB + Storage + Edge Functions)
SMS      : À définir (Orange CI API / Infobip)
```

### 3.2 Schéma d'architecture
```
┌─────────────────────────────────────────────────────────────┐
│                      PWA TOMBOLA CAN                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Interface React (Mobile-first)                      │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  IndexedDB (Dexie.js) - Stockage local persistant   │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Service Worker - Sync en arrière-plan              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Sync auto quand réseau disponible
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        SUPABASE                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │   Storage    │  │    Edge      │      │
│  │  (données)   │  │   (photos)   │  │  Functions   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SMS PROVIDER                             │
│              (Confirmation participation)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. SCHÉMA DE BASE DE DONNÉES

### 4.1 Table `emplacements`
```sql
CREATE TABLE emplacements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(100) NOT NULL,
  ville VARCHAR(50) NOT NULL,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_emplacements_actif ON emplacements(actif);
```

**Données initiales à insérer :**
- 31 showrooms (voir section 13 pour le SQL complet)

### 4.2 Table `participations`
```sql
CREATE TABLE participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identifiant local (généré côté client pour sync)
  local_id VARCHAR(50) UNIQUE,
  
  -- Infos participant
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  telephone VARCHAR(20) NOT NULL,
  
  -- Infos achat
  num_facture VARCHAR(50) NOT NULL UNIQUE,
  montant_achat INTEGER NOT NULL CHECK (montant_achat >= 0),
  categorie VARCHAR(20) GENERATED ALWAYS AS (
    CASE 
      WHEN montant_achat >= 300000 THEN 'maison'
      WHEN montant_achat >= 150000 THEN 'cuisine'
      WHEN montant_achat >= 50000 THEN 'salon'
      ELSE 'non_eligible'
    END
  ) STORED,
  
  -- Photo facture
  photo_facture_path TEXT,
  photo_uploaded BOOLEAN DEFAULT false,
  
  -- Traçabilité
  emplacement_id UUID NOT NULL REFERENCES emplacements(id),
  nom_operatrice VARCHAR(100) NOT NULL,
  
  -- Validation et participation
  statut VARCHAR(20) DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'valide', 'invalide')),
  numero_participation VARCHAR(20) UNIQUE,
  sms_envoye BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contrainte : montant minimum pour participation
  CONSTRAINT check_montant_eligible CHECK (montant_achat >= 50000)
);

-- Index pour performance
CREATE INDEX idx_participations_categorie ON participations(categorie);
CREATE INDEX idx_participations_statut ON participations(statut);
CREATE INDEX idx_participations_emplacement ON participations(emplacement_id);
CREATE INDEX idx_participations_num_facture ON participations(num_facture);
CREATE INDEX idx_participations_telephone ON participations(telephone);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_participations_updated_at
  BEFORE UPDATE ON participations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

### 4.3 Table `tirages` (pour audit du tirage final)
```sql
CREATE TABLE tirages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie VARCHAR(20) NOT NULL CHECK (categorie IN ('salon', 'cuisine', 'maison')),
  participation_gagnante_id UUID REFERENCES participations(id),
  total_participants INTEGER NOT NULL,
  seed_aleatoire VARCHAR(100),
  methode VARCHAR(50) DEFAULT 'crypto.getRandomValues',
  realise_par VARCHAR(100) NOT NULL,
  temoin VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.4 Supabase Storage
```
Bucket : factures
├── Structure : /{emplacement_id}/{date}/{local_id}.jpg
├── Taille max : 2 MB par fichier
├── Format : JPEG uniquement (compression côté client)
└── Accès : Privé (via service role uniquement)
```

### 4.5 Row Level Security (RLS)
```sql
-- Désactiver RLS pour ce projet (pas d'auth utilisateur)
-- L'accès sera contrôlé via les clés API (anon pour lecture limitée, service pour écriture)

ALTER TABLE emplacements ENABLE ROW LEVEL SECURITY;
ALTER TABLE participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tirages ENABLE ROW LEVEL SECURITY;

-- Policies pour emplacements (lecture publique)
CREATE POLICY "Lecture publique emplacements" ON emplacements
  FOR SELECT USING (true);

-- Policies pour participations (insertion publique, lecture restreinte)
CREATE POLICY "Insertion participations" ON participations
  FOR INSERT WITH CHECK (true);
  
CREATE POLICY "Lecture participations" ON participations
  FOR SELECT USING (true);

-- Policies pour tirages (lecture seule publique)
CREATE POLICY "Lecture tirages" ON tirages
  FOR SELECT USING (true);
```

---

## 5. STRUCTURE DU PROJET FRONTEND

```
tombola-can-pwa/
├── public/
│   ├── manifest.json
│   ├── icons/
│   │   ├── icon-192x192.png
│   │   └── icon-512x512.png
│   └── offline.html
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   │
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Header.jsx
│   │   │   └── SyncStatus.jsx
│   │   ├── Setup/
│   │   │   └── SetupForm.jsx          # Écran identification opératrice
│   │   ├── Participation/
│   │   │   ├── ParticipationForm.jsx  # Formulaire principal
│   │   │   ├── CameraCapture.jsx      # Capture photo facture
│   │   │   ├── CategoryBadge.jsx      # Affichage catégorie
│   │   │   └── ConfirmationScreen.jsx # Écran de confirmation
│   │   └── Admin/
│   │       ├── Dashboard.jsx          # Stats (optionnel)
│   │       └── ParticipantsList.jsx   # Liste (optionnel)
│   │
│   ├── hooks/
│   │   ├── useOfflineSync.js          # Logique sync offline
│   │   ├── useCamera.js               # Gestion caméra
│   │   └── useLocalStorage.js         # Persistance config opératrice
│   │
│   ├── lib/
│   │   ├── supabase.js                # Client Supabase
│   │   ├── db.js                      # Config Dexie (IndexedDB)
│   │   ├── sync.js                    # Logique de synchronisation
│   │   ├── imageCompression.js        # Compression photos
│   │   └── validation.js              # Règles de validation
│   │
│   ├── utils/
│   │   ├── formatters.js              # Formatage tel, montants
│   │   ├── categoryCalculator.js      # Calcul catégorie
│   │   └── idGenerator.js             # Génération ID locaux
│   │
│   └── constants/
│       └── index.js                   # Constantes (seuils, etc.)
│
├── vite.config.js
├── tailwind.config.js
├── package.json
└── README.md
```

---

## 6. FONCTIONNALITÉS DÉTAILLÉES

### 6.1 Écran 1 : Identification opératrice (SetupForm)

**Affiché :** Au premier lancement OU si config effacée

**Champs :**
| Champ | Type | Validation | Stockage |
|-------|------|------------|----------|
| Emplacement | Select | Requis, depuis liste Supabase | localStorage |
| Nom opératrice | Text | Requis, min 2 caractères | localStorage |

**Comportement :**
- Charger la liste des emplacements depuis Supabase (cache en IndexedDB)
- Stocker la sélection en localStorage (persiste entre sessions)
- Bouton "Modifier" discret en header pour changer plus tard

---

### 6.2 Écran 2 : Formulaire participation (ParticipationForm)

**Champs :**
| Champ | Type | Validation | Obligatoire |
|-------|------|------------|-------------|
| Nom | Text | Min 2 chars, lettres/espaces/tirets | ✅ |
| Prénom | Text | Min 2 chars, lettres/espaces/tirets | ✅ |
| Téléphone | Tel | Format CI : 10 chiffres, commence par 01/05/07 | ✅ |
| N° Facture | Text | Non vide, format libre | ✅ |
| Montant | Number | Min 50 000, entier | ✅ |
| Photo facture | Camera | Capture directe uniquement | ✅ |

**Affichage dynamique :**
- Badge catégorie mis à jour en temps réel selon le montant
- Message si montant < 50 000 : "Montant insuffisant pour participer"

**Validation N° Facture :**
1. Vérifier en local (IndexedDB) si déjà utilisé
2. Afficher erreur immédiate si doublon local
3. Lors du sync, Supabase rejettera aussi les doublons (contrainte UNIQUE)

---

### 6.3 Capture photo (CameraCapture)

**Spécifications :**
- Ouverture caméra arrière par défaut
- Ratio 4:3 (format document)
- Preview avant validation
- Boutons : "Reprendre" / "Valider"

**Compression (avant stockage) :**
```javascript
// Paramètres de compression
{
  maxWidth: 1200,
  maxHeight: 1600,
  quality: 0.7,        // JPEG quality
  mimeType: 'image/jpeg'
}
// Taille cible : < 500 KB
```

**Stockage local :**
- Convertir en Base64
- Stocker dans IndexedDB avec la participation
- Upload différé vers Supabase Storage lors du sync

---

### 6.4 Écran 3 : Confirmation (ConfirmationScreen)

**Affiché après enregistrement réussi :**
```
✅ PARTICIPATION ENREGISTRÉE

Nom      : KOUASSI Jean-Marc
Tél      : 07 XX XX XX XX
Catégorie: 🍳 CUISINE
Facture  : FAC-2025-001234

📱 Un SMS de confirmation sera envoyé 
   après vérification de la facture.

[NOUVELLE PARTICIPATION]
```

**Comportement :**
- Auto-reset du formulaire après 5 secondes OU clic bouton
- Retour au formulaire vide

---

### 6.5 Synchronisation offline (useOfflineSync)

**États possibles par participation :**
| État | Description | Icône |
|------|-------------|-------|
| `pending` | En attente de sync | 🔄 |
| `syncing` | Sync en cours | ⏳ |
| `synced` | Synchronisé avec succès | ✅ |
| `error` | Erreur de sync (retry auto) | ⚠️ |
| `conflict` | Doublon facture détecté | ❌ |

**Logique de sync :**
```javascript
// Pseudo-code
async function syncParticipation(localParticipation) {
  try {
    // 1. Insérer les données dans Supabase
    const { data, error } = await supabase
      .from('participations')
      .insert({...})
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') { // Unique violation
        return { status: 'conflict', message: 'Facture déjà enregistrée' };
      }
      throw error;
    }
    
    // 2. Upload photo si présente
    if (localParticipation.photoBase64) {
      await uploadPhoto(data.id, localParticipation.photoBase64);
    }
    
    // 3. Marquer comme synchronisé
    return { status: 'synced', serverId: data.id };
    
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}
```

**Trigger de sync :**
- Au retour de connexion (online event)
- Toutes les 30 secondes si participations pending
- Au clic sur "Forcer sync" (bouton discret)

---

### 6.6 Indicateur de statut (SyncStatus)

**Position :** Footer fixe ou dans header

**Affichage :**
```
[Quand tout est sync]
✅ Tout est synchronisé

[Quand pending]
🔄 3 participations en attente de sync

[Quand erreur]
⚠️ 1 erreur de sync - Appuyer pour réessayer

[Quand offline]
📴 Hors ligne - Les données sont sauvegardées
```

---

## 7. GESTION DES ERREURS

### 7.1 Erreurs utilisateur
| Erreur | Message affiché | Action |
|--------|-----------------|--------|
| Champ vide | "Ce champ est obligatoire" | Focus sur le champ |
| Téléphone invalide | "Numéro de téléphone invalide (format: 07XXXXXXXX)" | - |
| Montant < 50000 | "Le montant minimum est de 50 000 FCFA" | - |
| Facture doublon (local) | "Cette facture a déjà été enregistrée" | - |
| Facture doublon (serveur) | "⚠️ Cette facture existe déjà dans le système" | Marquage conflict |

### 7.2 Erreurs techniques
| Erreur | Comportement |
|--------|--------------|
| Caméra non disponible | Message + option saisie manuelle (skip photo) |
| IndexedDB plein | Alerte + suggestion de sync |
| Supabase timeout | Retry automatique (3 tentatives, backoff exponentiel) |
| Upload photo échoué | Retry séparé, ne bloque pas la participation |

---

## 8. SÉCURITÉ

### 8.1 Côté client
- Pas de stockage de credentials sensibles
- Clé API Supabase `anon` uniquement (permissions limitées via RLS)
- Validation côté client ET côté serveur

### 8.2 Côté serveur (Supabase)
- RLS activé sur toutes les tables
- Contraintes SQL (unicité facture, check montant)
- Service role key pour admin/dashboard uniquement (jamais côté client)

### 8.3 Anti-fraude
- Chaque participation liée à : emplacement + opératrice + timestamp
- Photo obligatoire = preuve
- Audit trail complet pour vérification post-enregistrement

---

## 9. PERFORMANCE

### 9.1 Objectifs
| Métrique | Cible |
|----------|-------|
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 3s |
| Taille bundle | < 200 KB (gzipped) |
| Temps enregistrement (offline) | < 500ms |

### 9.2 Optimisations
- Code splitting par route
- Lazy loading des composants admin
- Compression images côté client
- Cache des emplacements en IndexedDB

---

## 10. PWA MANIFEST

```json
{
  "name": "Tombola CAN 2025 - Smart Technology",
  "short_name": "Tombola CAN",
  "description": "Application d'enregistrement des participations à la tombola",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#E31E24",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Branding Smart Technology
- **Couleur principale** : #E31E24 (rouge Smart)
- **Devise** : "LE MEILLEUR SINON RIEN"
- **Logo** : À placer dans `/public/logo.png`

---

## 11. VARIABLES D'ENVIRONNEMENT

```env
# .env.local
VITE_SUPABASE_URL=https://ugwyzqskuiswjfvadbkb.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_mlLOns6jfxxXaRB9oKtdJg_KpNwY10J

# Constantes métier
VITE_MIN_AMOUNT=50000
VITE_SALON_MAX=149900
VITE_CUISINE_MAX=299900
```

> **Note** : On utilise le préfixe `VITE_` car c'est un projet Vite (pas Next.js)

---

## 12. LIVRABLES ATTENDUS

### Phase 1 : MVP (Prioritaire)
- [ ] Setup projet (Vite + React + Tailwind + PWA)
- [ ] Configuration Supabase (tables + RLS + storage)
- [ ] Écran identification opératrice
- [ ] Formulaire participation complet
- [ ] Capture et compression photo
- [ ] Stockage local IndexedDB (Dexie)
- [ ] Sync automatique vers Supabase
- [ ] Indicateur de statut sync
- [ ] Écran de confirmation

### Phase 2 : Compléments
- [ ] Dashboard admin (stats par emplacement)
- [ ] Export CSV des participants
- [ ] Intégration SMS (Edge Function)
- [ ] Module de tirage au sort

### Phase 3 : Polish
- [ ] Tests end-to-end
- [ ] Documentation utilisateur
- [ ] Optimisation performance

---

## 13. DONNÉES DE TEST

### Emplacements (à insérer)
```sql
-- Liste complète des 31 showrooms Smart Technology
INSERT INTO emplacements (nom, ville) VALUES
-- PLATEAUX
('Plateaux CNPS', 'Plateaux'),
('Plateau 2', 'Plateaux'),
-- ABOBO
('Abobo Belle Ville 2', 'Abobo'),
('Ndotre Corridor', 'Abobo'),
('Ndotre Corridor 2', 'Abobo'),
('Ndotre Corridor 3', 'Abobo'),
('Samake', 'Abobo'),
-- ANGRÉ
('Angré', 'Angré'),
('Angré Cococvico', 'Angré'),
('Angré CHU', 'Angré'),
-- ADJAMÉ
('Adjamé STM Loubna', 'Adjamé'),
('Adjamé STM 2', 'Adjamé'),
('Adjamé STM 3', 'Adjamé'),
('Adjamé Saint Michel', 'Adjamé'),
('Adjamé Gare Black', 'Adjamé'),
('Adjamé Firas', 'Adjamé'),
-- RIVERA
('Abidjan Mall', 'Rivera'),
-- ZONE 4
('Bietry', 'Zone 4'),
-- KOUMASSI
('Koumassi Remblais', 'Koumassi'),
('Koumassi Grand Marché', 'Koumassi'),
('Koumassi Dje Konan', 'Koumassi'),
('Koumassi Grand Carrefour', 'Koumassi'),
-- GRAND BASSAM
('Grand Bassam', 'Grand Bassam'),
('Bassam Azaki', 'Grand Bassam'),
-- BONOUA
('Bonoua', 'Bonoua'),
-- YOPOUGON
('Yopougon Kouté', 'Yopougon'),
('Songon', 'Yopougon'),
('Cosmos', 'Yopougon'),
-- BINGERVILLE
('Bingerville 1', 'Bingerville'),
('Bingerville 2', 'Bingerville'),
('Bingerville 3', 'Bingerville');
```

---

## 14. CRITÈRES D'ACCEPTATION

### Fonctionnel
- ✅ L'opératrice peut s'identifier (emplacement + nom)
- ✅ L'opératrice peut enregistrer une participation complète
- ✅ La photo est prise directement via l'app
- ✅ La catégorie s'affiche automatiquement selon le montant
- ✅ Une même facture ne peut être enregistrée 2 fois
- ✅ Les données sont conservées même hors ligne
- ✅ La sync se fait automatiquement au retour du réseau
- ✅ L'opératrice voit clairement le statut de sync

### Technique
- ✅ L'app fonctionne en PWA installable
- ✅ L'app fonctionne sans connexion
- ✅ Les photos sont compressées avant stockage
- ✅ Aucune perte de données possible

### UX
- ✅ Interface utilisable avec une main
- ✅ Gros boutons et textes lisibles
- ✅ Feedback immédiat à chaque action
- ✅ Messages d'erreur clairs en français

---

*Document de spécifications v1.0 - Projet Tombola CAN 2025*
*Smart Technology Côte d'Ivoire*
