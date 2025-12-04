// --- SEKCJA IMPORTÓW ---
const knex = require('knex');
const knexFile = require('../knexfile');

// --- SEKCJA INICJALIZACJI POŁĄCZENIA ---
const db = knex(knexFile.development);

// --- SEKCJA EKSPORTU ---
module.exports = db;