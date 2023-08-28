const logger = require('../middlewares/logger');
const pool = require('../config/db');
const path = require('path');
const cfg = require('../config/config');

let authVars = {
	slide_1: cfg.SLIDE_1 || 'https://placeholder.zachey.space/p/1920x720',
	slide_2: cfg.SLIDE_2 || 'https://placeholder.zachey.space/p/1920x720',
	slide_3: cfg.SLIDE_3 || 'https://placeholder.zachey.space/p/1920x720',
	cfg: cfg,
	steamid: null,
	avatar: null,
	balance: null,
	userName: null,
	steamLink: null,
	products: null,
	// Server information
	serverPing: null,
	serverPlayerCountOnline: null,
	serverPlayerCountMax: null,
	serverPlayers: null,
	serverMap: null,
	serverName: null,
	serverDescription: null,
	cmsVersion: '1.0',
	// Admin File manager
	path: null,
	folders: null,
	filesList: null,
	highlightedCode: null,
	filePath: null,
	tickets: null,
	constructorPageInfo: null,
	constructorPageName: null
};

function renderPage(req, res, userSteamID, fileName) {
	if (userSteamID) {
		logger.info(`User with steamid ${userSteamID} is authenticated`);
		pool.query(
			`SELECT * FROM users WHERE steamid = '${userSteamID}'`,
			(error, results, fields) => {
				if (error) {
					logger.error('Error getting user info', { error });
					throw error;
				}
				const avatar = results[0].avatar;
				const balance = results[0].balance;
				const userName = results[0].name;
				authVars.avatar = avatar;
				authVars.balance = balance;
				authVars.steamid = userSteamID;
				authVars.userName = userName;
				authVars.steamLink = `https://steamcommunity.com/profiles/${userSteamID}`;
				pool.query('SELECT * FROM products', (error, results) => {
					if (error) {
						logger.error('Error getting products', { error });
						throw error;
					}
					authVars.products = results;
					res.render(
						path.join(__dirname, '../views', `./${fileName}.ejs`),
						authVars
					);
					logger.info(
						`Rendered ${fileName} page for user with steamid ${userSteamID}`
					);
				});
			}
		);
	} else {
		pool.query('SELECT * FROM products', (error, results) => {
			if (error) {
				logger.error('Error getting products', { error });
				throw error;
			}
			authVars.products = results;
			res.render(
				path.join(__dirname, '../views', `./${fileName}.ejs`),
				authVars
			);
			logger.info(`Rendered ${fileName} page for non-authenticated user`);
		});
	}
}

module.exports = { renderPage, authVars };
