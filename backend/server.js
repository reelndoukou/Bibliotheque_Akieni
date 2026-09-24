require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const logger = require('./middlewares/logger');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// ============ MIDDLEWARES GLOBAUX ============
app.use(cors());
app.use(express.json());
app.use(logger);

// Sert le frontend statique (dossier ../frontend) - pratique pour la semaine 2
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ============ ROUTES API ============
app.use('/api/auteurs', require('./routes/auteursRoutes'));
app.use('/api/adherents', require('./routes/adherentsRoutes'));
app.use('/api/livres', require('./routes/livresRoutes'));
app.use('/api/emprunts', require('./routes/empruntsRoutes'));
app.use('/api/statistiques', require('./routes/statsRoutes'));

// ============ GESTION D'ERREURS (toujours en dernier) ============
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});