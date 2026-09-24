-- =========================================================
-- Schéma de base de données - Bibliothèque de quartier
-- Akieni Academy - Projet Semaines 14-15
-- =========================================================

-- On supprime les tables si elles existent déjà (pratique en développement
-- pour pouvoir relancer le script plusieurs fois sans erreur).
-- L'ordre est important à cause des clés étrangères : on supprime d'abord
-- les tables "enfants" (emprunts) avant les tables "parents" (livres, adherents, auteurs).
DROP TABLE IF EXISTS emprunts;
DROP TABLE IF EXISTS livres;
DROP TABLE IF EXISTS adherents;
DROP TABLE IF EXISTS auteurs;

-- =========================================================
-- Table : auteurs
-- =========================================================
CREATE TABLE auteurs (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(150) NOT NULL,
    nationalite VARCHAR(100)
);

-- =========================================================
-- Table : adherents
-- =========================================================
CREATE TABLE adherents (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(150) NOT NULL,
    contact VARCHAR(150) NOT NULL  -- email ou téléphone
);

-- =========================================================
-- Table : livres
-- =========================================================
CREATE TABLE livres (
    id SERIAL PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    annee_publication INTEGER,
    auteur_id INTEGER NOT NULL REFERENCES auteurs(id) ON DELETE RESTRICT,
    -- On limite les valeurs possibles du statut avec une contrainte CHECK :
    -- impossible d'insérer autre chose que 'disponible' ou 'emprunte'.
    statut VARCHAR(20) NOT NULL DEFAULT 'disponible'
        CHECK (statut IN ('disponible', 'emprunte'))
);

-- =========================================================
-- Table : emprunts
-- =========================================================
CREATE TABLE emprunts (
    id SERIAL PRIMARY KEY,
    livre_id INTEGER NOT NULL REFERENCES livres(id) ON DELETE RESTRICT,
    adherent_id INTEGER NOT NULL REFERENCES adherents(id) ON DELETE RESTRICT,
    date_emprunt DATE NOT NULL DEFAULT CURRENT_DATE,
    date_retour_prevue DATE NOT NULL,
    -- NULL tant que le livre n'a pas été rendu (voir logique métier)
    date_retour_effective DATE
);

-- =========================================================
-- Index pour accélérer les recherches fréquentes
-- =========================================================
CREATE INDEX idx_livres_titre ON livres(titre);
CREATE INDEX idx_livres_auteur ON livres(auteur_id);
CREATE INDEX idx_emprunts_livre ON emprunts(livre_id);
CREATE INDEX idx_emprunts_adherent ON emprunts(adherent_id);

-- =========================================================
-- Données de test (facultatif mais pratique pour développer)
-- =========================================================
INSERT INTO auteurs (nom, nationalite) VALUES
('Victor Hugo', 'Française'),
('Chinua Achebe', 'Nigériane'),
('Léopold Sédar Senghor', 'Sénégalaise');

INSERT INTO adherents (nom, contact) VALUES
('Jean Mbeki', 'jean.mbeki@email.com'),
('Aïcha Nzamba', '06 12 34 56 78');

INSERT INTO livres (titre, annee_publication, auteur_id, statut) VALUES
('Les Misérables', 1862, 1, 'disponible'),
('Le Monde s''effondre', 1958, 2, 'disponible'),
('Chants d''ombre', 1945, 3, 'disponible');

-- Exemple d'emprunt en cours (non en retard)
INSERT INTO emprunts (livre_id, adherent_id, date_emprunt, date_retour_prevue, date_retour_effective)
VALUES (1, 1, CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '12 days', NULL);

-- On met à jour le statut du livre emprunté ci-dessus (cohérence manuelle,
-- car ce sera normalement le backend qui s'en charge automatiquement)
UPDATE livres SET statut = 'emprunte' WHERE id = 1;