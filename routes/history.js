const express = require('express');

const router = express.Router();
const controller = require('../controllers');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);
router.get('/month', controller.history.getByMonth);
router.get('/day', controller.history.getByDay);
router.get('/prev', controller.history.comparePrevMonth);
router.get('/category', controller.history.getByCategory);
router.get('/percent', controller.history.percentByCategory);
router.get('/excel', controller.history.getExcel); // TODO
router.get('/budget', controller.history.compareByBudget);
router.post('/new', controller.history.inputPurchase);

module.exports = router;
