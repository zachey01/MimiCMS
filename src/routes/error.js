const express = require('express');
const router = express.Router();
const { renderPage, authVars } = require('../middlewares/renderPage');

router.get('/', function (req, res) {
	userSteamID = req.session.steamid;
	renderPage(req, res, userSteamID, '404');
});

module.exports = router;
