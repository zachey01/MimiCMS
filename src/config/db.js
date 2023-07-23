const mysql = require('mysql');
const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = require('../config/config');

const pool = mysql.createPool({
	connectionLimit: 10,
	host: DB_HOST,
	user: DB_USER,
	password: DB_PASSWORD,
	database: DB_NAME
});

module.exports = pool;
