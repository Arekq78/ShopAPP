const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const auth = require('../utils/authMiddleware');


router.get('/', auth(), productController.getAllProducts);
router.get('/:id', auth(), productController.getProductById);
router.get('/:id/seo-description', productController.getSeoDescription);

router.post('/', auth('PRACOWNIK'), productController.createProduct);
router.put('/:id', auth('PRACOWNIK'), productController.updateProduct);
router.delete('/:id', auth('PRACOWNIK'), productController.deleteProduct);

module.exports = router;