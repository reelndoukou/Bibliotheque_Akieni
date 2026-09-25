// api.js - Centralise tous les appels fetch() vers l'API backend

const API_BASE = 'https://bibliotheque-api-ogsl.onrender.com/api';

/**
 * Fonction générique d'appel à l'API.
 * Gère le JSON, les erreurs HTTP, et remonte le message d'erreur du backend.
 */
async function appelAPI(chemin, options = {}) {
  const reponse = await fetch(`${API_BASE}${chemin}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (reponse.status === 204) return null; // pas de contenu

  let donnees;
  try {
    donnees = await reponse.json();
  } catch {
    donnees = null;
  }

  // Si le backend a renvoyé un code d'erreur (400, 404, 409, 500...),
  // on transforme ça en exception JS pour pouvoir faire un try/catch côté appelant.
  if (!reponse.ok) {
    const message = (donnees && donnees.erreur) || `Erreur ${reponse.status}`;
    throw new Error(message);
  }
  return donnees;
}

const api = {
  // ---- AUTEURS ----
  getAuteurs: () => appelAPI('/auteurs'),
  createAuteur: (data) => appelAPI('/auteurs', { method: 'POST', body: JSON.stringify(data) }),
  updateAuteur: (id, data) => appelAPI(`/auteurs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAuteur: (id) => appelAPI(`/auteurs/${id}`, { method: 'DELETE' }),

  // ---- ADHERENTS ----
  getAdherents: () => appelAPI('/adherents'),
  createAdherent: (data) => appelAPI('/adherents', { method: 'POST', body: JSON.stringify(data) }),
  updateAdherent: (id, data) => appelAPI(`/adherents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAdherent: (id) => appelAPI(`/adherents/${id}`, { method: 'DELETE' }),
  getHistoriqueAdherent: (id) => appelAPI(`/adherents/${id}/emprunts`),

  // ---- LIVRES ----
  getLivres: (params = {}) => {
    // On construit une query string (?search=...&page=...) en ignorant les valeurs vides
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
    ).toString();
    return appelAPI(`/livres${q ? '?' + q : ''}`);
  },
  createLivre: (data) => appelAPI('/livres', { method: 'POST', body: JSON.stringify(data) }),
  updateLivre: (id, data) => appelAPI(`/livres/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLivre: (id) => appelAPI(`/livres/${id}`, { method: 'DELETE' }),

  // ---- EMPRUNTS ----
  getEmprunts: () => appelAPI('/emprunts'),
  getEmpruntsEnCours: () => appelAPI('/emprunts/en-cours'),
  getEmpruntsEnRetard: () => appelAPI('/emprunts/en-retard'),
  createEmprunt: (data) => appelAPI('/emprunts', { method: 'POST', body: JSON.stringify(data) }),
  retournerLivre: (id) => appelAPI(`/emprunts/${id}/retour`, { method: 'PUT' }),
  urlExportRetards: () => `${API_BASE}/emprunts/en-retard/export`,

  // ---- STATISTIQUES ----
  getStatistiques: () => appelAPI('/statistiques'),
};