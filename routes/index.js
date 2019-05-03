var express = require('express');
var router = express.Router();
const userController = require('../controllers/index');

router.get('/', userController.login);
router.post('/month', userController.getByMonth);

module.exports = router;
