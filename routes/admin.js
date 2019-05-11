const express = require('express');

const router = express.Router();
const controller = require('../controllers');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);
router.get('/user/info', controller.admin.getUserInfo);
router.get('/feedback', controller.admin.getFeedback);
router.get('/history', controller.admin.getUserHistory);
router.post('/login', controller.admin.login);
router.post('/logout', controller.admin.logout);
router.post('/new', controller.admin.newAdmin);
router.post('/mail', controller.admin.sendMail);
router.delete('/user/info', controller.admin.deleteUserInfo);

module.exports = router;
