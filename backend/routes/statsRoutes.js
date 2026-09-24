const express = require('express');
const router = express.Router();
const c = require('../controllers/statsController');

router.get('/', c.getStatistiques);

module.exports = router;