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
const multer = require('multer');
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

		renderPage(req, res, userSteamID, 'index', 'nonAuthIndex');
	}
});

router.get('/profile', function (req, res) {
	userSteamID = req.session.steamid;
	renderPage(req, res, userSteamID, 'user-profile', 'nonAuthErr');
});

router.get('/purchases', function (req, res) {
	userSteamID = req.session.steamid;
	renderPage(req, res, userSteamID, '404', 'nonAuthErr');
});

router.get('/balance', function (req, res) {
	userSteamID = req.session.steamid;
	renderPage(req, res, userSteamID, 'balance', 'nonAuthErr');
});

router.get('/rules', function (req, res) {
	userSteamID = req.session.steamid;
	renderPage(req, res, userSteamID, 'rules', 'nonAuthrules');
});

router.get('/privacy', function (req, res) {
	res.sendFile(path.join(__dirname, '../public/other/privacy.pdf'));
});

router.get('/oferts', function (req, res) {
	res.sendFile(path.join(__dirname, '../public/other/oferts.pdf'));
});

router.get('/contacts', function (req, res) {
	userSteamID = req.session.steamid;
	renderPage(req, res, userSteamID, 'contacts', 'nonAuthcontacts');
});

router.get('/mapViewer', function (req, res) {
	userSteamID = req.session.steamid;
	renderPage(req, res, userSteamID, 'mapViewer', 'mapViewerNonAuth');
});

const CryptoJS = require('crypto-js');

// Генерируем пароль из 128 символов
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

const jwt = require('jsonwebtoken');

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

router.get('/folder/:path(*)', (req, res) => {
	const rootFolder = './';
	const folderPath = path.join(rootFolder, req.params.path);

	// Проверка существования папки
	if (!fs.existsSync(folderPath) || !fs.lstatSync(folderPath).isDirectory()) {
		return res.status(404).send('Папка не найдена');
	}

	// Чтение содержимого папки
	fs.readdir(folderPath, { withFileTypes: true }, (err, files) => {
		if (err) {
			console.error(err);
			return res.status(500).send('Ошибка сервера');
		}

		// Фильтрация папок и файлов
		const folders = files
			.filter(file => file.isDirectory())
			.map(folder => folder.name);
		const filesList = files
			.filter(file => file.isFile())
			.map(file => file.name);

		// Отправка шаблона с данными
		res.send(`
		<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-9ndCyUaIbzAi2FUVXJi0CjmCapSmO7SnpJef0486qhLnuZ2cdeRhO02iuK6FUUVM" crossorigin="anonymous">
		<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" crossorigin="anonymous" referrerpolicy="no-referrer" />
		<h3><kbd>${req.params.path}</kbd></h3>
		${folders
			.map(
				folder =>
					`<i class="fa-solid fa-folder" style="margin: 5px"></i><a href="/folder/${req.params.path}/${folder}">${folder}</a><br>`
			)
			.join('')}
		${filesList
			.map(
				file =>
					`<i class="fa-solid fa-file" style="margin: 5px"></i><a href="/edit/${req.params.path}/${file}">${file}</a><br>`
			)
			.join('')}
		<form action="/upload/${
			req.params.path
		}" method="post" enctype="multipart/form-data">
		  <input type="file" name="file" />
		  <button type="submit">Загрузить</button>
		</form>
		<br>
		<a href="/">Назад</a>
	  `);
	});
});

module.exports = router;
