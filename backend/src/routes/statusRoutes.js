const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../utils/authMiddleware');

router.get('/', auth('PRACOWNIK'), orderController.getAllStatuses);

module.exports = router;