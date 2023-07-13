const express = require('express');
const passport = require('passport');
require('dotenv').config();
const logger = require('../middlewares/logger');
const pool = require('../config/db');
const path = require('path');

let authVars = {
	logo:
		process.env.LOGO ||
		'https://cdn.jsdelivr.net/gh/zachey01/MimiCMS/images/logo.png',
	currency: process.env.CURRENCY || '$',
	slide_1: process.env.SLIDE_1 || 'https://dummyimage.com/1920x720/000/fff',
	slide_2: process.env.SLIDE_2 || 'https://dummyimage.com/1920x720/000/fff',
	slide_3: process.env.SLIDE_3 || 'https://dummyimage.com/1920x720/000/fff',
	tgChannelLink: process.env.TG_LINK || '#',
	discordServerLink: process.env.DISCORD_LINK || '#',
	name: process.env.NAME || 'MimiCMS',
	tg_token: process.env.TG_BOT_TOKEN,
	tg_group: process.env.TG_GROUP_ID,
	serverIP: process.env.SERVER_IP,
	serverPort: process.env.SERVER_PORT,
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
	env: process.env
};

function renderPage(req, res, userSteamID, fileName, nonAuthFileName) {
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
				path.join(__dirname, '../views', `./${nonAuthFileName}.ejs`),
				authVars
			);
			logger.info(
				`Rendered ${nonAuthFileName} page for non-authenticated user`
			);
		});
	}
}

module.exports = { renderPage, authVars };
