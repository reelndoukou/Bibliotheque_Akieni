const express = require('express');
const router = express.Router();
const c = require('../controllers/adherentsController');
const { validerAdherent, validerId } = require('../middlewares/validate');

router.get('/', c.getAllAdherents);
router.get('/:id/emprunts', validerId, c.getHistoriqueAdherent);
router.get('/:id', validerId, c.getAdherentById);
router.post('/', validerAdherent, c.createAdherent);
router.put('/:id', validerId, validerAdherent, c.updateAdherent);
router.delete('/:id', validerId, c.deleteAdherent);

module.exports = router;