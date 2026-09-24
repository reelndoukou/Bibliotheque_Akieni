const pool = require('../config/db');

exports.getAllAdherents = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM adherents ORDER BY nom');
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.getAdherentById = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM adherents WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ erreur: 'Adhérent introuvable' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.createAdherent = async (req, res, next) => {
  try {
    const { nom, contact } = req.body;
    const result = await pool.query(
      'INSERT INTO adherents (nom, contact) VALUES ($1, $2) RETURNING *',
      [nom, contact]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.updateAdherent = async (req, res, next) => {
  try {
    const { nom, contact } = req.body;
    const result = await pool.query(
      'UPDATE adherents SET nom = $1, contact = $2 WHERE id = $3 RETURNING *',
      [nom, contact, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ erreur: 'Adhérent introuvable' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.deleteAdherent = async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM adherents WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ erreur: 'Adhérent introuvable' });
    res.json({ message: 'Adhérent supprimé avec succès' });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ erreur: "Impossible de supprimer cet adhérent : il possède un historique d'emprunts" });
    }
    next(err);
  }
};

// GET /api/adherents/:id/emprunts
// Historique complet (en cours et passés) d'un adhérent donné
exports.getHistoriqueAdherent = async (req, res, next) => {
  try {
    const adherent = await pool.query('SELECT * FROM adherents WHERE id = $1', [req.params.id]);
    if (adherent.rows.length === 0) return res.status(404).json({ erreur: 'Adhérent introuvable' });

    const result = await pool.query(
      `SELECT e.id, e.date_emprunt, e.date_retour_prevue, e.date_retour_effective,
              l.id AS livre_id, l.titre, a.nom AS auteur_nom,
              CASE
                WHEN e.date_retour_effective IS NOT NULL THEN 'rendu'
                WHEN e.date_retour_prevue < CURRENT_DATE THEN 'en_retard'
                ELSE 'en_cours'
              END AS etat
       FROM emprunts e
       JOIN livres l ON l.id = e.livre_id
       JOIN auteurs a ON a.id = l.auteur_id
       WHERE e.adherent_id = $1
       ORDER BY e.date_emprunt DESC`,
      [req.params.id]
    );

    res.json({ adherent: adherent.rows[0], emprunts: result.rows });
  } catch (err) { next(err); }
};