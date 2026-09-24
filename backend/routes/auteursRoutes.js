// routes/auteursRoutes.js
// Ce fichier définit uniquement les URLs et quelle fonction du controller appeler.
// Il ne contient AUCUNE logique métier.

const express = require('express');
const router = express.Router();
const auteursController = require('../controllers/auteursController');

router.get('/', auteursController.getAllAuteurs);
router.get('/:id', auteursController.getAuteurById);
router.post('/', auteursController.createAuteur);
router.put('/:id', auteursController.updateAuteur);
router.delete('/:id', auteursController.deleteAuteur);

module.exports = router;