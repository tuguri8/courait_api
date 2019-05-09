var express = require('express');
var router = express.Router();
const userController = require('../controllers/index');

router.post('/login', userController.login);
router.post('/month', userController.getByMonth);
router.post('/day', userController.getByDay);
router.post('/diff', userController.comparePrevMonth);
router.post('/percent', userController.percentByCategory);
router.post('/category', userController.getByCategory);
router.put('/budget', userController.updateBudget);
router.post('/getbudget', userController.getBudget);
router.post('/comparebudget', userController.compareByBudget);
router.post('/inputPurchase', userController.inputPurchase);

module.exports = router;
