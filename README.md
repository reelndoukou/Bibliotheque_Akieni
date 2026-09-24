# 📚 Bibliothèque de quartier — Application de gestion

Application web complète de gestion d'une bibliothèque de quartier : livres, auteurs, adhérents, emprunts et statistiques.

**Akieni Academy — Cohorte 2 — Semaines 14 & 15 — Module 3**

---

## 🛠️ Stack technique

| Couche | Technologies |
|---|---|
| Base de données | PostgreSQL 16 |
| Backend | Node.js, Express, `pg`, `dotenv`, `cors` |
| Frontend | HTML5, CSS3, JavaScript vanilla (`fetch`) |

---

## 📁 Structure du projet
bibliotheque-projet/
├── database/
│ └── schema.sql # Création des tables + données de test
├── docs/
│ └── diagramme-er.png # Diagramme entité-relation
├── backend/
│ ├── config/db.js # Pool de connexions PostgreSQL
│ ├── controllers/ # Logique métier
│ │ ├── auteursController.js
│ │ ├── adherentsController.js
│ │ ├── livresController.js
│ │ ├── empruntsController.js
│ │ └── statsController.js
│ ├── routes/ # Définition des endpoints
│ ├── middlewares/
│ │ ├── logger.js # Journalisation des requêtes
│ │ ├── validate.js # Validation des données entrantes
│ │ └── errorHandler.js # Gestion d'erreurs centralisée
│ ├── .env.example
│ ├── package.json
│ └── server.js
└── frontend/
├── index.html
├── css/style.css
└── js/
├── api.js # Couche d'appel à l'API
└── app.js # Logique d'interface

---

## 🚀 Installation

### 1. Prérequis
- Node.js ≥ 18
- PostgreSQL ≥ 14

### 2. Créer la base de données

```bash
psql -U postgres
CREATE DATABASE bibliotheque;
\q

psql -U postgres -d bibliotheque -f database/schema.sql
```

> ⚠️ Sous Windows, si les caractères accentués s'affichent mal, forcez l'encodage UTF-8 avant de charger le script :
> ```powershell
> chcp 65001
> $env:PGCLIENTENCODING="UTF8"
> ```

### 3. Configurer le backend

```bash
cd backend
npm install
cp .env.example .env     # puis éditer .env avec vos identifiants PostgreSQL
```

Contenu de `.env` :
```env
PORT=3000
DB_USER=postgres
DB_HOST=localhost
DB_NAME=bibliotheque
DB_PASSWORD=votre_mot_de_passe
DB_PORT=5432
PGCLIENTENCODING=UTF8
```

### 4. Lancer l'application

```bash
npm run dev        # mode développement (redémarrage automatique avec nodemon)
# ou
npm start          # mode production
```

Puis ouvrir **http://localhost:3000** — le frontend est servi directement par Express, tout sur un seul port.

---

## 🧩 Choix de modélisation

### Les quatre tables

| Table | Rôle |
|---|---|
| `auteurs` | Auteurs référencés (nom, nationalité) |
| `adherents` | Membres inscrits (nom, contact) |
| `livres` | Ouvrages du catalogue, liés à un auteur, avec un statut de disponibilité |
| `emprunts` | Historique complet des emprunts, liant un livre et un adhérent |

### Décisions structurantes

**1. Statut de disponibilité stocké dans `livres`**

La colonne `statut` (`'disponible'` / `'emprunte'`) est stockée directement sur le livre plutôt que recalculée par jointure à chaque lecture. C'est une **dénormalisation contrôlée** : elle accélère l'affichage du catalogue au prix d'une redondance. La cohérence est garantie côté backend par des **transactions SQL** (`BEGIN` / `COMMIT` / `ROLLBACK`) : la création d'un emprunt et le passage du livre à `'emprunte'` réussissent ou échouent ensemble. Une contrainte `CHECK` empêche par ailleurs toute valeur invalide en base.

**2. `date_retour_effective` à `NULL` = emprunt en cours**

Plutôt qu'un booléen `est_rendu` redondant, l'état d'un emprunt se déduit d'une seule colonne :

| Condition | État |
|---|---|
| `date_retour_effective IS NOT NULL` | Rendu |
| `IS NULL` et `date_retour_prevue < CURRENT_DATE` | **En retard** |
| `IS NULL` et date non dépassée | En cours |

Cet état est calculé en SQL via un `CASE WHEN`, ce qui garantit une détection des retards toujours exacte, sans tâche planifiée ni champ à maintenir manuellement.

**3. `ON DELETE RESTRICT` sur toutes les clés étrangères**

Une bibliothèque ne doit jamais perdre son historique. `RESTRICT` empêche de supprimer un auteur qui a des livres, ou un livre/adhérent qui a des emprunts. Les alternatives ont été écartées : `CASCADE` détruirait l'historique, `SET NULL` produirait des emprunts orphelins ininterprétables. L'erreur PostgreSQL `23503` est interceptée et traduite en message clair (HTTP 409).

**4. Relation auteur → livres en 1-à-plusieurs**

Le cahier des charges décrit un auteur unique par livre. Une table de liaison many-to-many aurait été nécessaire pour gérer les coauteurs, mais alourdirait le modèle sans besoin exprimé.

**5. Index sur les colonnes de recherche et de jointure**

`titre`, `auteur_id`, `emprunts.livre_id` et `emprunts.adherent_id` sont indexés pour accélérer la recherche et les jointures fréquentes du tableau de bord.

---

## 📡 Endpoints de l'API

Base : `http://localhost:3000/api`

### Auteurs
| Méthode | Route | Description |
|---|---|---|
| GET | `/auteurs` | Liste tous les auteurs |
| GET | `/auteurs/:id` | Détail d'un auteur |
| POST | `/auteurs` | Crée un auteur |
| PUT | `/auteurs/:id` | Modifie un auteur |
| DELETE | `/auteurs/:id` | Supprime un auteur (409 s'il a des livres) |

### Adhérents
| Méthode | Route | Description |
|---|---|---|
| GET | `/adherents` | Liste tous les adhérents |
| GET | `/adherents/:id` | Détail d'un adhérent |
| GET | `/adherents/:id/emprunts` | **Historique** des emprunts (en cours et passés) |
| POST | `/adherents` | Crée un adhérent |
| PUT | `/adherents/:id` | Modifie un adhérent |
| DELETE | `/adherents/:id` | Supprime un adhérent (409 s'il a un historique) |

### Livres
| Méthode | Route | Description |
|---|---|---|
| GET | `/livres` | Liste paginée avec nom d'auteur et statut |
| GET | `/livres/:id` | Détail d'un livre |
| POST | `/livres` | Crée un livre (statut `disponible` par défaut) |
| PUT | `/livres/:id` | Modifie un livre |
| DELETE | `/livres/:id` | Supprime un livre |

**Paramètres de requête sur `GET /livres` :**

| Paramètre | Effet | Exemple |
|---|---|---|
| `search` | Recherche par titre **ou** nom d'auteur | `?search=hugo` |
| `statut` | Filtre par disponibilité | `?statut=disponible` |
| `auteur_id` | Filtre par auteur | `?auteur_id=2` |
| `page` | Numéro de page (défaut 1) | `?page=2` |
| `limit` | Résultats par page (défaut 10, max 100) | `?limit=20` |

### Emprunts
| Méthode | Route | Description |
|---|---|---|
| GET | `/emprunts` | Historique complet |
| GET | `/emprunts/en-cours` | Emprunts non rendus |
| GET | `/emprunts/en-retard` | Emprunts non rendus et date dépassée |
| GET | `/emprunts/en-retard/export` | **Export CSV** des retards *(bonus)* |
| POST | `/emprunts` | Crée un emprunt (409 si livre indisponible) |
| PUT | `/emprunts/:id/retour` | Enregistre le retour |

### Statistiques
| Méthode | Route | Description |
|---|---|---|
| GET | `/statistiques` | Compteurs + livre le plus emprunté + adhérent le plus actif |

---

## 🔒 Middlewares

| Middleware | Rôle |
|---|---|
| `logger.js` | Journalise chaque requête : méthode, URL, code de statut, durée |
| `validate.js` | Valide les champs obligatoires, types et cohérence des dates avant d'atteindre le controller |
| `errorHandler.js` | Capture centralisée : traduit les codes PostgreSQL (`23503`, `23505`, `23514`, `22P02`) en messages HTTP clairs, et gère le 404 |

**Sécurité SQL :** toutes les requêtes utilisent des **requêtes paramétrées** (`$1`, `$2`…). Aucune concaténation de chaîne dans le SQL — protection contre les injections.

---

## ✅ Couverture du cahier des charges

- [x] CRUD Auteurs
- [x] CRUD Adhérents + historique des emprunts par adhérent
- [x] CRUD Livres avec nom d'auteur et statut affiché
- [x] Recherche par titre ou auteur + pagination
- [x] Création d'emprunt avec blocage si livre indisponible
- [x] Passage automatique du livre à `emprunte` / `disponible`
- [x] Listes des emprunts en cours et en retard
- [x] Statistiques complètes (compteurs, livre le plus emprunté, adhérent le plus actif)
- [x] Frontend : navigation, formulaires, messages d'erreur, distinction visuelle des retards, dashboard
- [x] Middlewares : logger, validation, gestion d'erreurs centralisée

### Bonus implémentés
- [x] Export CSV des emprunts en retard
- [x] Notifications toast après chaque action
- [x] Filtrage des livres par disponibilité et par auteur

---

## 🧪 Démonstration (jalon intermédiaire)

Séquence testée via `Invoke-RestMethod` :

1. `GET /api/livres` → catalogue avec statuts
2. `POST /api/emprunts` sur un livre disponible → succès, livre passe à `emprunte`
3. `POST /api/emprunts` **sur le même livre** → erreur 409 (règle métier respectée)
4. `GET /api/emprunts/en-cours` → l'emprunt apparaît
5. `PUT /api/emprunts/:id/retour` → le livre redevient `disponible`
6. `GET /api/statistiques` → compteurs à jour

---

## 👤 Auteur

Réel NDOUKOU — Akieni Academy, Cohorte 2, 