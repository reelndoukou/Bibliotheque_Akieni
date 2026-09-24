// app.js - Logique de l'interface : navigation, affichage, formulaires

// ============ UTILITAIRES ============

function toast(message, type = 'succes') {
  const zone = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  zone.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function formaterDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR');
}

// Protection contre l'injection HTML (échappe les caractères <, >, & etc.)
function echapper(texte) {
  if (texte === null || texte === undefined) return '';
  const div = document.createElement('div');
  div.textContent = texte;
  return div.innerHTML;
}

function badgeEtat(etat, joursRetard = 0) {
  if (etat === 'rendu') return '<span class="badge badge-rendu">Rendu</span>';
  if (etat === 'en_retard') return `<span class="badge badge-retard">En retard (${joursRetard} j)</span>`;
  return '<span class="badge badge-disponible">En cours</span>';
}

// ============ NAVIGATION ============

const etatPage = { livres: { page: 1, search: '', statut: '', auteur_id: '' } };

document.querySelectorAll('nav a').forEach((lien) => {
  lien.addEventListener('click', (e) => {
    e.preventDefault();
    const page = lien.dataset.page;

    document.querySelectorAll('nav a').forEach((l) => l.classList.remove('actif'));
    lien.classList.add('actif');
    document.querySelectorAll('.page').forEach((p) => p.classList.remove('visible'));
    document.getElementById(`page-${page}`).classList.add('visible');

    chargerPage(page);
  });
});

function chargerPage(page) {
  if (page === 'dashboard') chargerStatistiques();
  if (page === 'livres') { chargerAuteursDansSelects(); chargerLivres(); }
  if (page === 'auteurs') chargerAuteurs();
  if (page === 'adherents') chargerAdherents();
  if (page === 'emprunts') { chargerSelectsEmprunt(); chargerEmprunts(); }
}

// ============ TABLEAU DE BORD ============

async function chargerStatistiques() {
  try {
    const s = await api.getStatistiques();

    document.getElementById('stats-cartes').innerHTML = `
      <div class="stat"><div class="stat-valeur">${s.total_livres}</div><div class="stat-label">Livres au catalogue</div></div>
      <div class="stat"><div class="stat-valeur">${s.total_adherents}</div><div class="stat-label">Adhérents inscrits</div></div>
      <div class="stat"><div class="stat-valeur">${s.total_auteurs}</div><div class="stat-label">Auteurs référencés</div></div>
      <div class="stat attention"><div class="stat-valeur">${s.emprunts_en_cours}</div><div class="stat-label">Emprunts en cours</div></div>
      <div class="stat alerte"><div class="stat-valeur">${s.emprunts_en_retard}</div><div class="stat-label">Emprunts en retard</div></div>
    `;

    const l = s.livre_plus_emprunte;
    const a = s.adherent_plus_actif;
    document.getElementById('stats-tops').innerHTML = `
      <div class="top-item">
        <small>Livre le plus emprunté</small>
        <strong>${l ? echapper(l.titre) + ' — ' + echapper(l.auteur_nom) : 'Aucun emprunt enregistré'}</strong>
        ${l ? `<small>${l.nb_emprunts} emprunt(s)</small>` : ''}
      </div>
      <div class="top-item">
        <small>Adhérent le plus actif</small>
        <strong>${a ? echapper(a.nom) : 'Aucun emprunt enregistré'}</strong>
        ${a ? `<small>${a.nb_emprunts} emprunt(s) — ${echapper(a.contact)}</small>` : ''}
      </div>
    `;
  } catch (err) {
    toast(err.message, 'erreur');
  }
}

// ============ AUTEURS ============

async function chargerAuteurs() {
  try {
    const auteurs = await api.getAuteurs();
    const tbody = document.getElementById('liste-auteurs');

    if (!auteurs.length) {
      tbody.innerHTML = '<tr><td colspan="3" class="vide">Aucun auteur enregistré</td></tr>';
      return;
    }

    tbody.innerHTML = auteurs.map((a) => `
      <tr>
        <td><strong>${echapper(a.nom)}</strong></td>
        <td>${echapper(a.nationalite) || '—'}</td>
        <td class="actions">
          <button class="petit secondaire" onclick="ouvrirEditionAuteur(${a.id}, '${echapper(a.nom).replace(/'/g, "\\'")}', '${echapper(a.nationalite || '').replace(/'/g, "\\'")}')">Modifier</button>
          <button class="petit danger" onclick="supprimerAuteur(${a.id})">Supprimer</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    toast(err.message, 'erreur');
  }
}

document.getElementById('form-auteur').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api.createAuteur({
      nom: document.getElementById('auteur-nom').value,
      nationalite: document.getElementById('auteur-nationalite').value,
    });
    toast('Auteur ajouté avec succès');
    e.target.reset();
    chargerAuteurs();
  } catch (err) {
    toast(err.message, 'erreur');
  }
});

async function supprimerAuteur(id) {
  if (!confirm('Supprimer cet auteur ?')) return;
  try {
    await api.deleteAuteur(id);
    toast('Auteur supprimé');
    chargerAuteurs();
  } catch (err) {
    toast(err.message, 'erreur');
  }
}

function ouvrirEditionAuteur(id, nom, nationalite) {
  ouvrirModal("Modifier l'auteur", [
    { id: 'm-nom', label: 'Nom *', valeur: nom, requis: true },
    { id: 'm-nat', label: 'Nationalité', valeur: nationalite },
  ], async () => {
    await api.updateAuteur(id, {
      nom: document.getElementById('m-nom').value,
      nationalite: document.getElementById('m-nat').value,
    });
    toast('Auteur modifié');
    chargerAuteurs();
  });
}

// ============ ADHERENTS ============

async function chargerAdherents() {
  try {
    const adherents = await api.getAdherents();
    const tbody = document.getElementById('liste-adherents');

    if (!adherents.length) {
      tbody.innerHTML = '<tr><td colspan="3" class="vide">Aucun adhérent inscrit</td></tr>';
      return;
    }

    tbody.innerHTML = adherents.map((a) => `
      <tr>
        <td><strong>${echapper(a.nom)}</strong></td>
        <td>${echapper(a.contact)}</td>
        <td class="actions">
          <button class="petit" onclick="voirHistorique(${a.id})">Historique</button>
          <button class="petit secondaire" onclick="ouvrirEditionAdherent(${a.id}, '${echapper(a.nom).replace(/'/g, "\\'")}', '${echapper(a.contact).replace(/'/g, "\\'")}')">Modifier</button>
          <button class="petit danger" onclick="supprimerAdherent(${a.id})">Supprimer</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    toast(err.message, 'erreur');
  }
}

document.getElementById('form-adherent').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api.createAdherent({
      nom: document.getElementById('adherent-nom').value,
      contact: document.getElementById('adherent-contact').value,
    });
    toast('Adhérent ajouté avec succès');
    e.target.reset();
    chargerAdherents();
  } catch (err) {
    toast(err.message, 'erreur');
  }
});

async function supprimerAdherent(id) {
  if (!confirm('Supprimer cet adhérent ?')) return;
  try {
    await api.deleteAdherent(id);
    toast('Adhérent supprimé');
    chargerAdherents();
  } catch (err) {
    toast(err.message, 'erreur');
  }
}

function ouvrirEditionAdherent(id, nom, contact) {
  ouvrirModal("Modifier l'adhérent", [
    { id: 'm-nom', label: 'Nom *', valeur: nom, requis: true },
    { id: 'm-contact', label: 'Contact *', valeur: contact, requis: true },
  ], async () => {
    await api.updateAdherent(id, {
      nom: document.getElementById('m-nom').value,
      contact: document.getElementById('m-contact').value,
    });
    toast('Adhérent modifié');
    chargerAdherents();
  });
}

async function voirHistorique(id) {
  try {
    const data = await api.getHistoriqueAdherent(id);
    document.getElementById('bloc-historique').style.display = 'block';
    document.getElementById('titre-historique').textContent = `Historique des emprunts — ${data.adherent.nom}`;

    const tbody = document.getElementById('liste-historique');
    if (!data.emprunts.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="vide">Aucun emprunt pour cet adhérent</td></tr>';
    } else {
      tbody.innerHTML = data.emprunts.map((e) => `
        <tr class="${e.etat === 'en_retard' ? 'ligne-retard' : ''}">
          <td><strong>${echapper(e.titre)}</strong><br><small>${echapper(e.auteur_nom)}</small></td>
          <td>${formaterDate(e.date_emprunt)}</td>
          <td>${formaterDate(e.date_retour_prevue)}</td>
          <td>${formaterDate(e.date_retour_effective)}</td>
          <td>${badgeEtat(e.etat)}</td>
        </tr>
      `).join('');
    }
    document.getElementById('bloc-historique').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    toast(err.message, 'erreur');
  }
}
// ============ LIVRES ============

async function chargerAuteursDansSelects() {
  try {
    const auteurs = await api.getAuteurs();
    const options = auteurs.map((a) => `<option value="${a.id}">${echapper(a.nom)}</option>`).join('');

    document.getElementById('livre-auteur').innerHTML =
      '<option value="">— Choisir un auteur —</option>' + options;
    document.getElementById('filtre-auteur').innerHTML =
      '<option value="">Tous les auteurs</option>' + options;
  } catch (err) {
    toast(err.message, 'erreur');
  }
}

async function chargerLivres() {
  try {
    const e = etatPage.livres;
    const res = await api.getLivres({
      page: e.page, limit: 10, search: e.search, statut: e.statut, auteur_id: e.auteur_id,
    });

    const tbody = document.getElementById('liste-livres');
    if (!res.donnees.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="vide">Aucun livre trouvé</td></tr>';
    } else {
      tbody.innerHTML = res.donnees.map((l) => `
        <tr>
          <td><strong>${echapper(l.titre)}</strong></td>
          <td>${echapper(l.auteur_nom)}</td>
          <td>${l.annee_publication || '—'}</td>
          <td><span class="badge badge-${l.statut}">${l.statut === 'disponible' ? 'Disponible' : 'Emprunté'}</span></td>
          <td class="actions">
            <button class="petit secondaire" onclick="ouvrirEditionLivre(${l.id}, '${echapper(l.titre).replace(/'/g, "\\'")}', ${l.annee_publication || 'null'}, ${l.auteur_id})">Modifier</button>
            <button class="petit danger" onclick="supprimerLivre(${l.id})">Supprimer</button>
          </td>
        </tr>
      `).join('');
    }

    const p = res.pagination;
    document.getElementById('pagination-livres').innerHTML = `
      <button class="secondaire petit" ${p.page <= 1 ? 'disabled' : ''} onclick="changerPageLivres(${p.page - 1})">Précédent</button>
      <span>Page ${p.page} / ${p.totalPages} — ${p.total} livre(s)</span>
      <button class="secondaire petit" ${p.page >= p.totalPages ? 'disabled' : ''} onclick="changerPageLivres(${p.page + 1})">Suivant</button>
    `;
  } catch (err) {
    toast(err.message, 'erreur');
  }
}

function changerPageLivres(n) {
  etatPage.livres.page = n;
  chargerLivres();
}

document.getElementById('form-livre').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api.createLivre({
      titre: document.getElementById('livre-titre').value,
      auteur_id: document.getElementById('livre-auteur').value,
      annee_publication: document.getElementById('livre-annee').value || null,
    });
    toast('Livre ajouté avec succès');
    e.target.reset();
    chargerLivres();
  } catch (err) {
    toast(err.message, 'erreur');
  }
});

async function supprimerLivre(id) {
  if (!confirm('Supprimer ce livre ?')) return;
  try {
    await api.deleteLivre(id);
    toast('Livre supprimé');
    chargerLivres();
  } catch (err) {
    toast(err.message, 'erreur');
  }
}

function ouvrirEditionLivre(id, titre, annee, auteurId) {
  api.getAuteurs().then((auteurs) => {
    ouvrirModal('Modifier le livre', [
      { id: 'm-titre', label: 'Titre *', valeur: titre, requis: true },
      { id: 'm-annee', label: 'Année de publication', valeur: annee || '', type: 'number' },
      {
        id: 'm-auteur', label: 'Auteur *', type: 'select',
        options: auteurs.map((a) => ({ valeur: a.id, texte: a.nom })),
        valeur: auteurId,
      },
    ], async () => {
      await api.updateLivre(id, {
        titre: document.getElementById('m-titre').value,
        annee_publication: document.getElementById('m-annee').value || null,
        auteur_id: document.getElementById('m-auteur').value,
      });
      toast('Livre modifié');
      chargerLivres();
    });
  });
}

// Recherche avec "debounce" : on attend 350ms après la dernière frappe
// avant d'appeler l'API, pour éviter un appel réseau à chaque lettre tapée.
let timerRecherche;
document.getElementById('recherche-livre').addEventListener('input', (e) => {
  clearTimeout(timerRecherche);
  timerRecherche = setTimeout(() => {
    etatPage.livres.search = e.target.value;
    etatPage.livres.page = 1;
    chargerLivres();
  }, 350);
});

document.getElementById('filtre-statut').addEventListener('change', (e) => {
  etatPage.livres.statut = e.target.value;
  etatPage.livres.page = 1;
  chargerLivres();
});

document.getElementById('filtre-auteur').addEventListener('change', (e) => {
  etatPage.livres.auteur_id = e.target.value;
  etatPage.livres.page = 1;
  chargerLivres();
});

document.getElementById('btn-reset-livres').addEventListener('click', () => {
  document.getElementById('recherche-livre').value = '';
  document.getElementById('filtre-statut').value = '';
  document.getElementById('filtre-auteur').value = '';
  etatPage.livres = { page: 1, search: '', statut: '', auteur_id: '' };
  chargerLivres();
});

// ============ EMPRUNTS ============

async function chargerSelectsEmprunt() {
  try {
    const [livres, adherents] = await Promise.all([
      api.getLivres({ statut: 'disponible', limit: 100 }),
      api.getAdherents(),
    ]);

    document.getElementById('emprunt-livre').innerHTML =
      '<option value="">— Choisir un livre —</option>' +
      livres.donnees.map((l) => `<option value="${l.id}">${echapper(l.titre)} (${echapper(l.auteur_nom)})</option>`).join('');

    document.getElementById('emprunt-adherent').innerHTML =
      '<option value="">— Choisir un adhérent —</option>' +
      adherents.map((a) => `<option value="${a.id}">${echapper(a.nom)}</option>`).join('');

    // Date de retour par défaut : dans 14 jours
    const dans14j = new Date();
    dans14j.setDate(dans14j.getDate() + 14);
    document.getElementById('emprunt-date').value = dans14j.toISOString().split('T')[0];
    document.getElementById('emprunt-date').min = new Date().toISOString().split('T')[0];
  } catch (err) {
    toast(err.message, 'erreur');
  }
}

async function chargerEmprunts() {
  try {
    const [enCours, tous] = await Promise.all([api.getEmpruntsEnCours(), api.getEmprunts()]);

    // Emprunts en cours (avec mise en évidence des retards)
    const tbody1 = document.getElementById('liste-emprunts-cours');
    if (!enCours.length) {
      tbody1.innerHTML = '<tr><td colspan="6" class="vide">Aucun emprunt en cours</td></tr>';
    } else {
      tbody1.innerHTML = enCours.map((e) => `
        <tr class="${e.etat === 'en_retard' ? 'ligne-retard' : ''}">
          <td><strong>${echapper(e.livre_titre)}</strong><br><small>${echapper(e.auteur_nom)}</small></td>
          <td>${echapper(e.adherent_nom)}<br><small>${echapper(e.adherent_contact)}</small></td>
          <td>${formaterDate(e.date_emprunt)}</td>
          <td>${formaterDate(e.date_retour_prevue)}</td>
          <td>${badgeEtat(e.etat, e.jours_retard)}</td>
          <td><button class="petit succes" onclick="retourner(${e.id})">Enregistrer le retour</button></td>
        </tr>
      `).join('');
    }

    // Historique complet
    const tbody2 = document.getElementById('liste-emprunts-tous');
    if (!tous.length) {
      tbody2.innerHTML = '<tr><td colspan="6" class="vide">Aucun emprunt enregistré</td></tr>';
    } else {
      tbody2.innerHTML = tous.map((e) => `
        <tr class="${e.etat === 'en_retard' ? 'ligne-retard' : ''}">
          <td>${echapper(e.livre_titre)}</td>
          <td>${echapper(e.adherent_nom)}</td>
          <td>${formaterDate(e.date_emprunt)}</td>
          <td>${formaterDate(e.date_retour_prevue)}</td>
          <td>${formaterDate(e.date_retour_effective)}</td>
          <td>${badgeEtat(e.etat, e.jours_retard)}</td>
        </tr>
      `).join('');
    }
  } catch (err) {
    toast(err.message, 'erreur');
  }
}

document.getElementById('form-emprunt').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api.createEmprunt({
      livre_id: document.getElementById('emprunt-livre').value,
      adherent_id: document.getElementById('emprunt-adherent').value,
      date_retour_prevue: document.getElementById('emprunt-date').value,
    });
    toast('Emprunt enregistré avec succès');
    chargerSelectsEmprunt();
    chargerEmprunts();
  } catch (err) {
    toast(err.message, 'erreur');
  }
});

async function retourner(id) {
  if (!confirm('Confirmer le retour de ce livre ?')) return;
  try {
    await api.retournerLivre(id);
    toast('Retour enregistré — le livre est de nouveau disponible');
    chargerSelectsEmprunt();
    chargerEmprunts();
  } catch (err) {
    toast(err.message, 'erreur');
  }
}

document.getElementById('btn-export-retards').addEventListener('click', () => {
  window.open(api.urlExportRetards(), '_blank');
  toast('Export CSV généré', 'info');
});

// ============ MODALE GÉNÉRIQUE (réutilisée pour toutes les éditions) ============

let callbackModal = null;

function ouvrirModal(titre, champs, callback) {
  document.getElementById('modal-titre').textContent = titre;
  document.getElementById('modal-champs').innerHTML = champs.map((c) => {
    if (c.type === 'select') {
      return `<div><label for="${c.id}">${c.label}</label><select id="${c.id}">${
        c.options.map((o) => `<option value="${o.valeur}" ${o.valeur == c.valeur ? 'selected' : ''}>${echapper(o.texte)}</option>`).join('')
      }</select></div>`;
    }
    return `<div><label for="${c.id}">${c.label}</label><input type="${c.type || 'text'}" id="${c.id}" value="${c.valeur ?? ''}" ${c.requis ? 'required' : ''}></div>`;
  }).join('');

  callbackModal = callback;
  document.getElementById('modal-fond').classList.add('ouvert');
}

function fermerModal() {
  document.getElementById('modal-fond').classList.remove('ouvert');
  callbackModal = null;
}

document.getElementById('modal-fermer').addEventListener('click', fermerModal);
document.getElementById('modal-annuler').addEventListener('click', fermerModal);
document.getElementById('modal-fond').addEventListener('click', (e) => {
  if (e.target.id === 'modal-fond') fermerModal();
});

document.getElementById('modal-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!callbackModal) return;
  try {
    await callbackModal();
    fermerModal();
  } catch (err) {
    toast(err.message, 'erreur');
  }
});

// ============ DÉMARRAGE ============
chargerStatistiques();

