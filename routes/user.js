const express = require('express');

const router = express.Router();
const controller = require('../controllers');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);
router.get('/budget', controller.user.getBudget);
router.post('/feedback', controller.user.feedback); // TODO
router.post('/logout', controller.user.logout); // TODO
router.put('/budget', controller.user.updateBudget);
router.delete('/withdrawl', controller.user.withdrawl); // TODO

module.exports = router;
