var express = require('express');
var router = express.Router();
const userController = require('../controllers/index');

router.get('/', userController.login);
router.post('/month', userController.getByMonth);
router.post('/day', userController.getByDay);
router.post('/diff', userController.comparePrevMonth);
router.post('/percent', userController.percentByCategory);

module.exports = router;
