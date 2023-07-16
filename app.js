const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const https = require('https');
const jsonParser = bodyParser.json({ limit: '10mb' });
const fs = require('fs');
const app = express();
const expressWinston = require('express-winston');
const compress = require('compression');
const port = process.env.PORT || 3000;
const logger = require('./src/middlewares/logger');
require('dotenv').config();

const createTables = require('./src/middlewares/createTables');
createTables();

const mainRoutes = require('./src/routes/route');
const linkRoute = require('./src/routes/links');
const authRoutes = require('./src/routes/auth');
const errorRoutes = require('./src/routes/error');
const ticketRoutes = require('./src/routes/tickets');
const shopRoute = require('./src/routes/shop');
const adminRoute = require('./src/routes/admin');

// ExpressJS configuration
app.use(compress());
app.use(jsonParser);
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('./src/public'));
app.set('view engine', 'ejs');
app.use(express.static('./src/public'));
app.use(
	expressWinston.errorLogger({
		winstonInstance: logger
	})
);
app.use(
	session({
		secret: process.env.SECRET,
		resave: false,
		saveUninitialized: false
	})
);
app.use(
	expressWinston.logger({
		winstonInstance: logger,
		level: 'info',
		meta: false,
		msg: 'HTTP {{req.method}} {{req.url}}',
		expressFormat: true,
		colorize: false,
		ignoreRoute: function (req, res) {
			return false;
		}
	})
);

// Routes
app.use('/', mainRoutes);
app.use('/links', linkRoute);
app.use('/auth', authRoutes);
app.use('/tickets', ticketRoutes);
app.use('/shop', shopRoute);
app.use('/admin', adminRoute);
app.use('*', errorRoutes);

app.listen(port, () => logger.info('Server started on port ' + port));
