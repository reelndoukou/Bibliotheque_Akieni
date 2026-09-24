// middlewares/validate.js
// Valide les données AVANT qu'elles atteignent le controller.

// Petit helper : crée une erreur avec un code HTTP
const erreur = (message, status = 400) => {
  const e = new Error(message);
  e.status = status;
  return e;
};

const validerAuteur = (req, res, next) => {
  const { nom } = req.body;
  if (!nom || nom.trim() === '') return next(erreur("Le nom de l'auteur est obligatoire"));
  next();
};

const validerAdherent = (req, res, next) => {
  const { nom, contact } = req.body;
  if (!nom || nom.trim() === '') return next(erreur("Le nom de l'adhérent est obligatoire"));
  if (!contact || contact.trim() === '') return next(erreur('Le contact est obligatoire'));
  next();
};

const validerLivre = (req, res, next) => {
  const { titre, auteur_id, annee_publication } = req.body;
  if (!titre || titre.trim() === '') return next(erreur('Le titre est obligatoire'));
  if (!auteur_id) return next(erreur("L'auteur est obligatoire"));
  if (isNaN(parseInt(auteur_id))) return next(erreur("L'identifiant de l'auteur doit être un nombre"));

  if (annee_publication !== undefined && annee_publication !== null && annee_publication !== '') {
    const annee = parseInt(annee_publication);
    if (isNaN(annee) || annee < 0 || annee > new Date().getFullYear()) {
      return next(erreur('Année de publication invalide'));
    }
  }
  next();
};

const validerEmprunt = (req, res, next) => {
  const { livre_id, adherent_id, date_retour_prevue } = req.body;
  if (!livre_id) return next(erreur('Le livre est obligatoire'));
  if (!adherent_id) return next(erreur("L'adhérent est obligatoire"));
  if (!date_retour_prevue) return next(erreur('La date de retour prévue est obligatoire'));

  const date = new Date(date_retour_prevue);
  if (isNaN(date.getTime())) return next(erreur('Date de retour prévue invalide'));

  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  if (date < aujourdhui) return next(erreur('La date de retour prévue ne peut pas être dans le passé'));

  next();
};

const validerId = (req, res, next) => {
  if (isNaN(parseInt(req.params.id))) return next(erreur('Identifiant invalide'));
  next();
};

module.exports = {
  validerAuteur,
  validerAdherent,
  validerLivre,
  validerEmprunt,
  validerId,
};