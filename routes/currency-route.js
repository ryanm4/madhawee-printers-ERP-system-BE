const express = require('express');
const router = express.Router();
const currencyController = require('../controllers/currency-controller');

router.get('/rate', currencyController.getCurrencyRate);
router.put('/rate', currencyController.updateCurrencyRate);

module.exports = router;
