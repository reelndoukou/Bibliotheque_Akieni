const pool = require('../config/db');

// Requête de base réutilisée, avec calcul de l'état de chaque emprunt
const SELECT_EMPRUNT = `
  SELECT e.id, e.date_emprunt, e.date_retour_prevue, e.date_retour_effective,
         l.id AS livre_id, l.titre AS livre_titre,
         au.nom AS auteur_nom,
         ad.id AS adherent_id, ad.nom AS adherent_nom, ad.contact AS adherent_contact,
         CASE
           WHEN e.date_retour_effective IS NOT NULL THEN 'rendu'
           WHEN e.date_retour_prevue < CURRENT_DATE THEN 'en_retard'
           ELSE 'en_cours'
         END AS etat,
         CASE
           WHEN e.date_retour_effective IS NULL AND e.date_retour_prevue < CURRENT_DATE
           THEN CURRENT_DATE - e.date_retour_prevue
           ELSE 0
         END AS jours_retard
  FROM emprunts e
  JOIN livres l ON l.id = e.livre_id
  JOIN auteurs au ON au.id = l.auteur_id
  JOIN adherents ad ON ad.id = e.adherent_id
`;

exports.getAllEmprunts = async (req, res, next) => {
  try {
    const result = await pool.query(`${SELECT_EMPRUNT} ORDER BY e.date_emprunt DESC`);
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.getEmpruntsEnCours = async (req, res, next) => {
  try {
    const result = await pool.query(
      `${SELECT_EMPRUNT} WHERE e.date_retour_effective IS NULL ORDER BY e.date_retour_prevue ASC`
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.getEmpruntsEnRetard = async (req, res, next) => {
  try {
    const result = await pool.query(
      `${SELECT_EMPRUNT}
       WHERE e.date_retour_effective IS NULL AND e.date_retour_prevue < CURRENT_DATE
       ORDER BY e.date_retour_prevue ASC`
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

// POST /api/emprunts - Créer un emprunt (avec TRANSACTION)
exports.createEmprunt = async (req, res, next) => {
  const client = await pool.connect(); // on sort une connexion DÉDIÉE du pool pour la transaction
  try {
    const { livre_id, adherent_id, date_retour_prevue, date_emprunt } = req.body;

    await client.query('BEGIN'); // démarre la transaction

    // FOR UPDATE verrouille la ligne le temps de la transaction :
    // si 2 requêtes arrivent en même temps pour le même livre, la 2e attend
    // que la 1re soit terminée avant de lire le statut. Empêche le double-emprunt.
    const livre = await client.query('SELECT * FROM livres WHERE id = $1 FOR UPDATE', [livre_id]);
    if (livre.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erreur: 'Livre introuvable' });
    }

    // RÈGLE MÉTIER : un livre déjà emprunté ne peut pas être re-emprunté
    if (livre.rows[0].statut === 'emprunte') {
      await client.query('ROLLBACK');
      return res.status(409).json({ erreur: "Ce livre est déjà emprunté, il n'est pas disponible" });
    }

    const adherent = await client.query('SELECT id FROM adherents WHERE id = $1', [adherent_id]);
    if (adherent.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erreur: 'Adhérent introuvable' });
    }

    const emprunt = await client.query(
      `INSERT INTO emprunts (livre_id, adherent_id, date_emprunt, date_retour_prevue)
       VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE), $4) RETURNING *`,
      [livre_id, adherent_id, date_emprunt || null, date_retour_prevue]
    );

    // Le livre passe automatiquement au statut "emprunte"
    await client.query("UPDATE livres SET statut = 'emprunte' WHERE id = $1", [livre_id]);

    await client.query('COMMIT'); // valide les 2 opérations définitivement
    res.status(201).json({ message: 'Emprunt enregistré', emprunt: emprunt.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK'); // annule tout en cas d'erreur imprévue
    next(err);
  } finally {
    client.release(); // on rend la connexion au pool, TOUJOURS (même en cas d'erreur)
  }
};

// PUT /api/emprunts/:id/retour - Enregistrer le retour
exports.retournerLivre = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const emprunt = await client.query('SELECT * FROM emprunts WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (emprunt.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erreur: 'Emprunt introuvable' });
    }
    if (emprunt.rows[0].date_retour_effective !== null) {
      await client.query('ROLLBACK');
      return res.status(409).json({ erreur: 'Ce livre a déjà été rendu' });
    }

    const maj = await client.query(
      'UPDATE emprunts SET date_retour_effective = CURRENT_DATE WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    // Le livre redevient disponible
    await client.query("UPDATE livres SET statut = 'disponible' WHERE id = $1", [emprunt.rows[0].livre_id]);

    await client.query('COMMIT');
    res.json({ message: 'Retour enregistré, le livre est de nouveau disponible', emprunt: maj.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// BONUS : export CSV des emprunts en retard
exports.exportRetardsCSV = async (req, res, next) => {
  try {
    const result = await pool.query(
      `${SELECT_EMPRUNT}
       WHERE e.date_retour_effective IS NULL AND e.date_retour_prevue < CURRENT_DATE
       ORDER BY e.date_retour_prevue ASC`
    );

    const entetes = ['id', 'livre_titre', 'auteur_nom', 'adherent_nom', 'adherent_contact', 'date_emprunt', 'date_retour_prevue', 'jours_retard'];
    const lignes = result.rows.map((r) =>
      entetes.map((c) => {
        const v = r[c] === null || r[c] === undefined ? '' : String(r[c]);
        return `"${v.replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csv = [entetes.join(','), ...lignes].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="emprunts_en_retard.csv"');
    res.send('\uFEFF' + csv); // \uFEFF = BOM, pour qu'Excel affiche bien les accents
  } catch (err) { next(err); }
};