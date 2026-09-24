const pool = require('../config/db');

// GET /api/livres?search=...&statut=...&auteur_id=...&page=1&limit=10
exports.getAllLivres = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const offset = (page - 1) * limit;

    const { search, statut, auteur_id } = req.query;

    // Construction DYNAMIQUE mais SÉCURISÉE des filtres.
    // On accumule les conditions et leurs valeurs en parallèle,
    // en incrémentant le numéro de paramètre ($1, $2, ...).
    const conditions = [];
    const valeurs = [];
    let i = 1;

    if (search && search.trim() !== '') {
      // ILIKE = LIKE insensible à la casse (spécifique PostgreSQL)
      conditions.push(`(l.titre ILIKE $${i} OR a.nom ILIKE $${i})`);
      valeurs.push(`%${search.trim()}%`);
      i++;
    }
    if (statut && ['disponible', 'emprunte'].includes(statut)) {
      conditions.push(`l.statut = $${i}`);
      valeurs.push(statut);
      i++;
    }
    if (auteur_id && !isNaN(parseInt(auteur_id))) {
      conditions.push(`l.auteur_id = $${i}`);
      valeurs.push(parseInt(auteur_id));
      i++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // 1ère requête : compter le total (pour calculer le nombre de pages)
    const totalResult = await pool.query(
      `SELECT COUNT(*) FROM livres l JOIN auteurs a ON a.id = l.auteur_id ${where}`,
      valeurs
    );
    const total = parseInt(totalResult.rows[0].count);

    // 2ème requête : récupérer la page demandée
    const result = await pool.query(
      `SELECT l.id, l.titre, l.annee_publication, l.statut,
              l.auteur_id, a.nom AS auteur_nom, a.nationalite AS auteur_nationalite
       FROM livres l
       JOIN auteurs a ON a.id = l.auteur_id
       ${where}
       ORDER BY l.titre
       LIMIT $${i} OFFSET $${i + 1}`,
      [...valeurs, limit, offset]
    );

    res.json({
      donnees: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (err) { next(err); }
};

exports.getLivreById = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT l.*, a.nom AS auteur_nom
       FROM livres l JOIN auteurs a ON a.id = l.auteur_id
       WHERE l.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ erreur: 'Livre introuvable' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.createLivre = async (req, res, next) => {
  try {
    const { titre, annee_publication, auteur_id } = req.body;

    // On vérifie que l'auteur existe -> message clair plutôt qu'erreur FK brute
    const auteur = await pool.query('SELECT id FROM auteurs WHERE id = $1', [auteur_id]);
    if (auteur.rows.length === 0) return res.status(400).json({ erreur: 'Auteur inexistant' });

    const result = await pool.query(
      `INSERT INTO livres (titre, annee_publication, auteur_id, statut)
       VALUES ($1, $2, $3, 'disponible') RETURNING *`,
      [titre, annee_publication || null, auteur_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.updateLivre = async (req, res, next) => {
  try {
    const { titre, annee_publication, auteur_id } = req.body;

    const auteur = await pool.query('SELECT id FROM auteurs WHERE id = $1', [auteur_id]);
    if (auteur.rows.length === 0) return res.status(400).json({ erreur: 'Auteur inexistant' });

    const result = await pool.query(
      `UPDATE livres SET titre = $1, annee_publication = $2, auteur_id = $3
       WHERE id = $4 RETURNING *`,
      [titre, annee_publication || null, auteur_id, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ erreur: 'Livre introuvable' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.deleteLivre = async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM livres WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ erreur: 'Livre introuvable' });
    res.json({ message: 'Livre supprimé avec succès' });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ erreur: "Impossible de supprimer ce livre : il possède un historique d'emprunts" });
    }
    next(err);
  }
};