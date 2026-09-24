// config/db.js
// Ce fichier centralise la connexion à PostgreSQL.
// On utilise un "Pool" de connexions : plutôt que d'ouvrir/fermer une connexion
// à chaque requête (coûteux), on garde un petit groupe de connexions réutilisables.

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Petit test au démarrage pour vérifier que la connexion fonctionne
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Erreur de connexion à PostgreSQL :', err.message);
  } else {
    console.log('✅ Connecté à PostgreSQL avec succès');
    release(); // on libère cette connexion de test dans le pool
  }
});

module.exports = pool;