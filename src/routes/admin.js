const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const logger = require('../middlewares/logger');
const pool = require('../config/db');
const { renderPage, authVars } = require('../middlewares/renderPage');
const cfg = require('../config/config');
const rootFolder = './';

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

	if (userSteamID === cfg.OwnerID) {
		renderPage(req, res, userSteamID, 'admin-main');
	} else {
		renderPage(req, res, userSteamID, '404');
	}
});

router.get('/constructor', async function (req, res) {
	userSteamID = req.session.steamid;
	if (userSteamID === cfg.OwnerID) {
		renderPage(req, res, userSteamID, 'constructor-list');
	} else {
		renderPage(req, res, userSteamID, '404');
	}
});

router.get('/constructor/:file', function (req, res) {
	userSteamID = req.session.steamid;
	const file = req.params.file;
	authVars.constructorPageName = file;
	const pagesInfo = JSON.parse(
		fs.readFileSync('./src/public/data/pages.json')
	);
	authVars.constructorPageInfo = pagesInfo[file].id;
	if (userSteamID === cfg.OwnerID) {
		renderPage(req, res, userSteamID, 'constructor');
	} else {
		renderPage(req, res, userSteamID, '404');
	}
});

router.get('/constructor/:file/:id', function (req, res) {
	const filePath = './src/public/data/pages.json';
	const file = req.params.file;
	const id = req.params.id;
	fs.readFile(filePath, 'utf8', (err, data) => {
		if (err) {
			logger.error('Error to read file:', err);
			return;
		}

		const json = JSON.parse(data);
		json[file] = id;
		const updatedJson = JSON.stringify(json, null, 2);

		fs.writeFile(filePath, updatedJson, 'utf8', err => {
			if (err) {
				logger.error('Error write to file:', err);
				return;
			}
		});
	});
	res.json('OK');
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
			return res.status(500).send('Server error: ' + err);
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
		if (userSteamID === cfg.OwnerID) {
			renderPage(req, res, userSteamID, 'admin-files-main');
		} else {
			renderPage(req, res, userSteamID, '404');
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
	if (userSteamID === cfg.OwnerID) {
		renderPage(req, res, userSteamID, 'admin-tickets');
	} else {
		renderPage(req, res, userSteamID, '404');
	}
});

router.get('/edit/:path(*)', upload.single('file'), (req, res) => {
	authVars.filePath = path.join(rootFolder, req.params.path);

	if (!fs.existsSync(authVars.filePath)) {
		return res.status(404).send('File or folder not found');
	}

	if (fs.lstatSync(authVars.filePath).isDirectory()) {
		return res.redirect(`/folder/${req.params.path}`);
	}

	fs.readFile(authVars.filePath, 'utf8', (err, data) => {
		if (err) {
			console.error(err);
			return res.status(500).send('Server error: ' + err);
		}

		authVars.highlightedCode = data;
		userSteamID = req.session.steamid;
		if (userSteamID === cfg.OwnerID) {
			renderPage(req, res, userSteamID, 'admin-files-editor');
		} else {
			renderPage(req, res, userSteamID, '404');
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
