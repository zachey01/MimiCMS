const mysql = require('mysql');
require('dotenv').config();
const pool = require('../config/db');
module.exports = function createTables() {
	// Products table
	pool.getConnection((err, connection) => {
		if (err) throw err;
		connection.query('SELECT 1 FROM products LIMIT 1', (err, result) => {
			if (err) {
				const products = `CREATE TABLE products (
          id INT NOT NULL AUTO_INCREMENT,
          name VARCHAR(255) NOT NULL,
          price DECIMAL(10, 2) NOT NULL,
          description VARCHAR(255) NOT NULL,
          givecmd VARCHAR(255) NOT NULL,
          img VARCHAR(255) NOT NULL,
          tags VARCHAR(255) NOT NULL,
          PRIMARY KEY (id)
        )`;
				connection.query(products, (err, result) => {
					if (err) throw err;
					console.log('Table products created ✅');
				});
			} else {
			}
			connection.release();
		});
	});

	// User table
	pool.getConnection((err, connection) => {
		if (err) throw err;
		connection.query('SELECT 1 FROM users LIMIT 1', (err, result) => {
			if (err) {
				const users = `CREATE TABLE users (
          steamid VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          avatar VARCHAR(255),
          purchases VARCHAR(255) NOT NULL,
          balance INT NOT NULL DEFAULT 0,
          PRIMARY KEY (steamid)
        )`;
				connection.query(users, (err, result) => {
					if (err) throw err;
					console.log('Table users created ✅');
				});
			} else {
			}
			connection.release();
		});
	});
};
