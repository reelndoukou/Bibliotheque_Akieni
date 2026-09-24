const express = require('express');
const router = express.Router();
const c = require('../controllers/empruntsController');
const { validerEmprunt, validerId } = require('../middlewares/validate');

// ATTENTION : les routes FIXES (en-cours, en-retard) doivent être déclarées
// AVANT la route dynamique GET '/'. Sinon Express pourrait mal les interpréter.
router.get('/en-cours', c.getEmpruntsEnCours);
router.get('/en-retard', c.getEmpruntsEnRetard);
router.get('/en-retard/export', c.exportRetardsCSV);
router.get('/', c.getAllEmprunts);

router.post('/', validerEmprunt, c.createEmprunt);
router.put('/:id/retour', validerId, c.retournerLivre);

module.exports = router;