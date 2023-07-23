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
const rootFolder = './';
const hljs = require('highlight.js');
const multer = require('multer');
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		const folderPath = rootFolder;
		cb(null, folderPath);
	},
	filename: (req, file, cb) => {
		cb(null, file.originalname);
	}
});
const upload = multer({ dest: './', storage: storage });
router.get('/', function (req, res) {
	userSteamID = req.session.steamid;

	if (userSteamID === '76561199219730677') {
		renderPage(req, res, userSteamID, 'admin-main');
	} else {
		renderPage(req, res, userSteamID, 'nonAuth404');
	}
});

router.get('/files', function (req, res) {
	(authVars.filePath = rootFolder), req.params.path;
	authVars.path = req.params.path;

	if (req.params.path === undefined) {
		authVars.path = '/';
	}
	fs.readdir(rootFolder, { withFileTypes: true }, (err, files) => {
		if (err) {
			console.error(err);
			return res.status(500).send('Ошибка сервера');
		}
		authVars.folders = files
			.filter(file => file.isDirectory())
			.map(folder => folder.name);
		authVars.filesList = files
			.filter(file => file.isFile())
			.map(file => file.name);

		const currentPath = req.path === '/' ? 'home' : req.path;
		const breadcrumbItems = currentPath
			.split('/')
			.filter(item => item !== '');
		const breadcrumbLinks = breadcrumbItems.map((item, index) => {
			const path = `/${breadcrumbItems.slice(0, index + 1).join('/')}`;
			return `<a href="${path}">${item}</a>`;
		});

		userSteamID = req.session.steamid;
		if (userSteamID === '76561199219730677') {
			renderPage(req, res, userSteamID, 'admin-files-main');
		} else {
			renderPage(req, res, userSteamID, 'nonAuth404');
		}
	});
});

router.get('/tickets', function (req, res) {
	userSteamID = req.session.steamid;
	pool.query('SELECT * FROM tickets', function (err, rows) {
		if (err) {
			logger.error('Error fetching tickets:', err);

			return;
		}
		authVars.tickets = rows;
	});
	if (userSteamID === '76561199219730677') {
		renderPage(req, res, userSteamID, 'admin-tickets');
	} else {
		renderPage(req, res, userSteamID, 'nonAuth404');
	}
});

router.get('/edit/:path(*)', upload.single('file'), (req, res) => {
	authVars.filePath = path.join(rootFolder, req.params.path);

	if (!fs.existsSync(authVars.filePath)) {
		return res.status(404).send('Файл или папка не найдены');
	}

	if (fs.lstatSync(authVars.filePath).isDirectory()) {
		return res.redirect(`/folder/${req.params.path}`);
	}

	fs.readFile(authVars.filePath, 'utf8', (err, data) => {
		if (err) {
			console.error(err);
			return res.status(500).send('Ошибка сервера');
		}

		authVars.highlightedCode = data;
		userSteamID = req.session.steamid;
		if (userSteamID === '76561199219730677') {
			renderPage(req, res, userSteamID, 'admin-files-editor');
		} else {
			renderPage(req, res, userSteamID, 'nonAuth404');
		}
	});
});

router.post('/save/:path(*)', (req, res) => {
	authVars.filePath = path.join(rootFolder, req.params.path);
	const { code } = req.body;

	if (!fs.existsSync(authVars.filePath)) {
		return res.status(404).send('File not found');
	}

	fs.writeFile(authVars.filePath, code, err => {
		if (err) {
			console.error(err);
			return res.status(500).send('Error: ' + err.message);
		}

		res.sendStatus(200);
	});
});

module.exports = router;
