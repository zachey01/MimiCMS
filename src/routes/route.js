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
const CryptoJS = require('crypto-js');
const { renderPage, authVars } = require('../middlewares/renderPage');
const multer = require('multer');
const jwt = require('jsonwebtoken');
// Update the upload middleware configuration
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		const folderPath = rootFolder; // Set destination to the root folder
		cb(null, folderPath);
	},
	filename: (req, file, cb) => {
		cb(null, file.originalname);
	}
});

const upload = multer({ dest: './', storage: storage }); // Remove this line
router.get('/', async function (req, res) {
	try {
		userSteamID = req.session.steamid;

		const server = await Server({
			ip: process.env.SERVER_IP,
			port: parseInt(process.env.SERVER_PORT, 10),
			timeout: 5000
		});
		const infoServer = await server.getInfo();
		authVars.serverPing = infoServer.ping;
		authVars.serverPlayerCountOnline = await infoServer.players.online;
		authVars.serverPlayerCountMax = await infoServer.players.max;
		authVars.serverMap = infoServer.map;
		authVars.serverName = infoServer.name;
		authVars.serverDescription = process.env.SERVER_DESCRIPTION;

		renderPage(req, res, userSteamID, 'index', 'index');
	} catch (error) {
		// Обработка ошибки и присвоение переменным значение null
		authVars.serverPing = null;
		authVars.serverPlayerCountOnline = null;
		authVars.serverPlayerCountMax = null;
		authVars.serverMap = null;
		authVars.serverName = 'server is offline';
		authVars.serverDescription = null;

		renderPage(req, res, userSteamID, 'index');
	}
});

router.get('/profile', function (req, res) {
	userSteamID = req.session.steamid;
	renderPage(req, res, userSteamID, 'user-profile');
});

router.get('/purchases', function (req, res) {
	userSteamID = req.session.steamid;
	renderPage(req, res, userSteamID, '404');
});

router.get('/balance', function (req, res) {
	userSteamID = req.session.steamid;
	renderPage(req, res, userSteamID, 'balance');
});

router.get('/rules', function (req, res) {
	userSteamID = req.session.steamid;
	renderPage(req, res, userSteamID, 'rules');
});

function generatePassword() {
	const passwordLength = 128;
	const characters =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let password = '';

	for (let i = 0; i < passwordLength; i++) {
		const randomIndex = Math.floor(Math.random() * characters.length);
		password += characters[randomIndex];
	}

	return password;
}
const pass = generatePassword();

router.get('/api/token', (req, res) => {
	const token = jwt.sign({ userId: 'admin' }, pass);
	res.json({ token });
});

router.get('/api/protected', (req, res) => {
	const referer = req.headers.referer;
	if (referer !== 'http://localhost:3000/admin') {
		return res.status(403).json({ message: false });
	}
	const token = req.headers.authorization;
	jwt.verify(token, pass, (err, decoded) => {
		if (err) {
			// Обработка ошибки аутентификации
			return res.status(401).json({ error: false });
		}
		const userId = decoded.userId;
		res.json({ message: true });
	});
});

router.post('/submit', (req, res) => {
	const { encryptedValue } = req.body;
	const decryptedValue = CryptoJS.AES.decrypt(
		encryptedValue,
		'admin'
	).toString(CryptoJS.enc.Utf8);
	const value = JSON.parse(decryptedValue);
	console.log('Value:', value);
	async function write() {
		await fs.promises.writeFile(
			'./src/config/config.js',
			`module.exports = ${JSON.stringify(value, null, 2)}`
		);
	}
	write()
		.then(() => {
			res.sendStatus(200);
		})
		.catch(error => {
			console.error('Error:', error);
			res.sendStatus(500);
		});
});

module.exports = router;
