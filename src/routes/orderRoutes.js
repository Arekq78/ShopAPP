const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../utils/authMiddleware');

router.get('/', auth('PRACOWNIK'), orderController.getOrders);
router.patch('/:id', auth('PRACOWNIK'), orderController.updateOrderStatus);

router.post('/', auth('KLIENT'), orderController.createOrder);

module.exports = router;