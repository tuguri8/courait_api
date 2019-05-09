const express = require('express');

const router = express.Router();
const controller = require('../controllers');

router.post('/login', controller.auth.login);
router.post('/reg', controller.auth.register); // TODO
router.post('/search/id', controller.auth.searchID); // TODO
router.post('/search/pw', controller.auth.searchPW); // TODO

module.exports = router;
