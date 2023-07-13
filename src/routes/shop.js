let // Modules
	express = require('express'),
	passport = require('passport'),
	SteamStrategy = require('passport-steam').Strategy,
	SteamWebAPI = require('steam-web'),
	mysql = require('mysql'),
	session = require('express-session'),
	app = express(),
	router = express.Router(),
	moment = require('moment'),
	path = require('path'),
	ejs = require('ejs'),
	{
		Server,
		RCON,
		MasterServer
	} = require('@fabricio-191/valve-server-query'),
	winston = require('winston'),
	fs = require('fs'),
	expressWinston = require('express-winston');
require('dotenv').config();
const logger = require('../middlewares/logger');
const pool = require('../config/db');
const { renderPage, authVars } = require('../middlewares/renderPage');

router.get('/', function (req, res) {
	userSteamID = req.session.steamid;
	renderPage(req, res, userSteamID, 'products', 'nonAuthproducts');
});

router.get('/models', function (req, res) {
	userSteamID = req.session.steamid;
	renderPage(req, res, userSteamID, 'productsModels', 'nonAuthErr');
});

router.get('/privilege', function (req, res) {
	userSteamID = req.session.steamid;
	renderPage(req, res, userSteamID, 'productsPrivilege', 'nonAuthErr');
});

router.post('/debit/:amount/:productId', (req, res) => {
	userSteamID = req.session.steamid;
	const amount = parseInt(req.params.amount);
	const productId = parseInt(req.params.productId);
	if (isNaN(amount)) {
		res.status(400).send('Invalid amount');
		return;
	}
	pool.query(
		`SELECT balance FROM users WHERE steamid = ${userSteamID}`,
		(err, result) => {
			if (err) {
				logger.error('Error getting user balance', { error: err });
				throw err;
			}
			const balance = result[0].balance;
			if (balance < amount) {
				logger.warn(
					`User with steamid ${userSteamID} tried to debit ${amount} but has only ${balance} in balance`
				);
				res.status(400).send('Not enough balance');
				return;
			}
			pool.query(
				`UPDATE users SET balance = balance - ${amount}, purchases = CONCAT(purchases, ${productId}, ',') WHERE steamid = ${userSteamID}`,
				(error, results) => {
					if (error) {
						logger.error('Error updating user balance', { error });
						throw error;
					}
					pool.query(
						`SELECT givecmd FROM products WHERE id = ${productId}`,
						async (err, result) => {
							if (err) {
								logger.error(
									'Error getting givecmd for product',
									{
										error: err
									}
								);
								throw err;
							}
							const givecmd = result[0].givecmd.replace(
								'steam_id',
								userSteamID
							);
							/* const rcon = await RCON({
                  ip: process.env.SERVER_IP,
                  port: parseInt(process.env.SERVER_PORT, 10), //RCON port
                  password: "your RCON password",
                });
                rcon.on("disconnect", async (reason) => {
                  logger.info("disconnected", reason);
                  try {
                    await rcon.reconnect();
                  } catch (e) {
                    logger.info("reconnect failed", e.message);
                  }
                });
  
                rcon.on("passwordChanged", async () => {
                  const password = await getNewPasswordSomehow();
                  try {
                    await rcon.authenticate(password);
                  } catch (e) {
                    logger.error(
                      "Failed to authenticate with new password",
                      e.message
                    );
                  }
                });
                const response = await rcon.exec(givecmd);
                */
						}
					);

					res.send('Success');
					logger.info(
						`User with steamid ${userSteamID} debited ${amount} and purchased product ${productId}`
					);
				}
			);
		}
	);
});
module.exports = router;
