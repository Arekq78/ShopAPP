const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../utils/authMiddleware');

router.post('/init', auth('PRACOWNIK'), adminController.initProducts);

module.exports = router;