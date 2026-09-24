const pool = require('../config/db');

// GET /api/statistiques
exports.getStatistiques = async (req, res, next) => {
  try {
    // Promise.all lance toutes les requêtes EN PARALLÈLE plutôt qu'une par une
    // (elles sont indépendantes, pas besoin d'attendre l'une pour lancer l'autre)
    const [livres, adherents, auteurs, enCours, enRetard, livrePlusEmprunte, adherentPlusActif] =
      await Promise.all([
        pool.query('SELECT COUNT(*) FROM livres'),
        pool.query('SELECT COUNT(*) FROM adherents'),
        pool.query('SELECT COUNT(*) FROM auteurs'),
        pool.query('SELECT COUNT(*) FROM emprunts WHERE date_retour_effective IS NULL'),
        pool.query(
          `SELECT COUNT(*) FROM emprunts
           WHERE date_retour_effective IS NULL AND date_retour_prevue < CURRENT_DATE`
        ),
        pool.query(
          `SELECT l.id, l.titre, a.nom AS auteur_nom, COUNT(e.id)::int AS nb_emprunts
           FROM emprunts e
           JOIN livres l ON l.id = e.livre_id
           JOIN auteurs a ON a.id = l.auteur_id
           GROUP BY l.id, l.titre, a.nom
           ORDER BY nb_emprunts DESC, l.titre
           LIMIT 1`
        ),
        pool.query(
          `SELECT ad.id, ad.nom, ad.contact, COUNT(e.id)::int AS nb_emprunts
           FROM emprunts e
           JOIN adherents ad ON ad.id = e.adherent_id
           GROUP BY ad.id, ad.nom, ad.contact
           ORDER BY nb_emprunts DESC, ad.nom
           LIMIT 1`
        ),
      ]);

    res.json({
      total_livres: parseInt(livres.rows[0].count),
      total_adherents: parseInt(adherents.rows[0].count),
      total_auteurs: parseInt(auteurs.rows[0].count),
      emprunts_en_cours: parseInt(enCours.rows[0].count),
      emprunts_en_retard: parseInt(enRetard.rows[0].count),
      livre_plus_emprunte: livrePlusEmprunte.rows[0] || null,
      adherent_plus_actif: adherentPlusActif.rows[0] || null,
    });
  } catch (err) { next(err); }
};