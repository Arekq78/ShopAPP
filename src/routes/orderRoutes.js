const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../utils/authMiddleware');

router.get('/', auth('PRACOWNIK'), orderController.getOrders);
router.get('/statuses', auth('PRACOWNIK'), orderController.getAllStatuses);
router.patch('/:id', auth('PRACOWNIK'), orderController.updateOrderStatus);

router.post('/', auth('KLIENT'), orderController.createOrder);
router.post('/:id/opinions', auth('KLIENT'), orderController.addOrderOpinion);

module.exports = router;