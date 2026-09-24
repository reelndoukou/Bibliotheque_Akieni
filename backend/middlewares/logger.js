// middlewares/logger.js
// Journalise chaque requête reçue : méthode, URL, code de statut, durée.

module.exports = (req, res, next) => {
  const debut = Date.now();

  // 'finish' se déclenche quand la réponse a fini d'être envoyée
  res.on('finish', () => {
    const duree = Date.now() - debut;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duree}ms)`
    );
  });

  next(); // on passe au middleware/route suivant
};