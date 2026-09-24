// middlewares/errorHandler.js
// Gestion d'erreurs CENTRALISÉE. À déclarer EN DERNIER dans server.js.

// Route inexistante -> 404
const notFound = (req, res, next) => {
  res.status(404).json({ erreur: `Route introuvable : ${req.method} ${req.originalUrl}` });
};

// Toute erreur passée à next(err) arrive ici.
// Signature à 4 paramètres = Express sait que c'est un gestionnaire d'erreurs.
const errorHandler = (err, req, res, next) => {
  console.error('ERREUR :', err.message);

  // Traduction des codes d'erreur PostgreSQL en messages clairs
  if (err.code === '23503') {
    return res.status(409).json({
      erreur: "Opération impossible : cet élément est référencé par d'autres données.",
    });
  }
  if (err.code === '23505') {
    return res.status(409).json({ erreur: 'Cette valeur existe déjà.' });
  }
  if (err.code === '23514') {
    return res.status(400).json({ erreur: 'Valeur invalide (contrainte non respectée).' });
  }
  if (err.code === '22P02') {
    return res.status(400).json({ erreur: 'Format de donnée invalide.' });
  }

  const status = err.status || 500;
  res.status(status).json({ erreur: err.message || 'Erreur serveur interne' });
};

module.exports = { notFound, errorHandler };