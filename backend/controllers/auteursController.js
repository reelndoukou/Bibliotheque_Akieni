// controllers/auteursController.js
// Un "controller" contient la logique métier : que faire quand une route est appelée.
// La route elle-même (routes/auteursRoutes.js) ne fera qu'appeler ces fonctions.

const pool = require('../config/db');

// GET /api/auteurs - Liste tous les auteurs
exports.getAllAuteurs = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM auteurs ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
};

// GET /api/auteurs/:id - Récupère un auteur précis
exports.getAuteurById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM auteurs WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ erreur: 'Auteur introuvable' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
};

// POST /api/auteurs - Crée un nouvel auteur
exports.createAuteur = async (req, res) => {
  try {
    const { nom, nationalite } = req.body;

    if (!nom) {
      return res.status(400).json({ erreur: 'Le nom est obligatoire' });
    }

    const result = await pool.query(
      'INSERT INTO auteurs (nom, nationalite) VALUES ($1, $2) RETURNING *',
      [nom, nationalite]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
};

// PUT /api/auteurs/:id - Modifie un auteur existant
exports.updateAuteur = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, nationalite } = req.body;

    const result = await pool.query(
      'UPDATE auteurs SET nom = $1, nationalite = $2 WHERE id = $3 RETURNING *',
      [nom, nationalite, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ erreur: 'Auteur introuvable' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
};

// DELETE /api/auteurs/:id - Supprime un auteur
exports.deleteAuteur = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM auteurs WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ erreur: 'Auteur introuvable' });
    }
    res.json({ message: 'Auteur supprimé avec succès' });
  } catch (err) {
    // Rappel : on a mis ON DELETE RESTRICT -> si l'auteur a des livres,
    // PostgreSQL renverra une erreur de contrainte de clé étrangère (code 23503)
    if (err.code === '23503') {
      return res.status(409).json({
        erreur: 'Impossible de supprimer cet auteur : il a des livres associés',
      });
    }
    res.status(500).json({ erreur: err.message });
  }
};