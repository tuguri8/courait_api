const express = require('express');

const router = express.Router();
const controller = require('../controllers');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);
router.get('/user/info', controller.admin.getUserInfo); // TODO
router.get('/feedback', controller.admin.getFeedback); // TODO
router.get('/history', controller.admin.getUserHistory); // TODO
router.post('/login', controller.admin.login);
router.post('/logout', controller.admin.logout); // TODO
router.post('/new', controller.admin.newAdmin); // TODO
router.post('/mail', controller.admin.sendMail); // TODO
router.delete('/user/info', controller.admin.deleteUserInfo); // TODO

module.exports = router;
