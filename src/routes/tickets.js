let // Modules
	express = require('express'),
	router = express.Router();
require('dotenv').config();
const { renderPage, authVars } = require('../middlewares/renderPage');
const { stringify } = require('querystring');
const pool = require('../config/db');
const logger = require('../middlewares/logger');

router.get('/', function (req, res) {
	userSteamID = req.session.steamid;
	renderPage(req, res, userSteamID, 'tickets', 'nonAuthErr');
});

router.post('/send', (req, res) => {
	userSteamID = req.session.steamid;
	const ticketText = decodeURIComponent(
		stringify(req.body)
			.replace(/[\s{}':]/g, '')
			.slice(0, -1)
	);

	pool.query(
		'INSERT INTO tickets (steamid, message) VALUES (?, ?)',
		[userSteamID, ticketText],
		function (err, result) {
			if (err) {
				logger.error('Error save ticket:', err);
				return;
			}
		}
	);
});

module.exports = router;
