let // Modules
	express = require('express'),
	router = express.Router();
require('dotenv').config();

router.get('/discord', function (req, res) {
	res.redirect('https://discord.com/invite/GgrMK8YHS6');
});

router.get('/vk', function (req, res) {
	res.redirect('https://vk.com/shadowseek');
});

router.get('/tg', function (req, res) {
	res.redirect('https://t.me/shadowseekcsgo');
});

router.get('/youtube', function (req, res) {
	res.redirect('https://www.youtube.com/@ShadowSeekCSGO');
});

router.get('/github', function (req, res) {
	res.redirect('https://github.com/ShadowSeekCSGO');
});

module.exports = router;
