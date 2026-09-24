const express = require('express');
const router = express.Router();
const c = require('../controllers/livresController');
const { validerLivre, validerId } = require('../middlewares/validate');

router.get('/', c.getAllLivres);
router.get('/:id', validerId, c.getLivreById);
router.post('/', validerLivre, c.createLivre);
router.put('/:id', validerId, validerLivre, c.updateLivre);
router.delete('/:id', validerId, c.deleteLivre);

module.exports = router;