// TODO: Create other tables here
const express = require("express");
const app = express();
const mysql = require("mysql");
require("dotenv").config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

connection.connect((err) => {
  const products = `CREATE TABLE ${process.env.PRODUCTS_TABLE} ( id INT NOT NULL AUTO_INCREMENT, 
        name letCHAR(255) NOT NULL, 
        price DECIMAL(10, 2) NOT NULL, 
        PRIMARY KEY (id) )`;
  connection.query(products, (err, result) => {
    if (err) {
      console.log(`Table ${process.env.PRODUCTS_TABLE} not is created`);
    } else {
      console.log(`Table ${process.env.PRODUCTS_TABLE} created!`);
    }
  });

  const users = `CREATE TABLE ${process.env.USERS_TABLE} ( id INT NOT NULL AUTO_INCREMENT, 
    name letCHAR(255) NOT NULL, 
    steamid DECIMAL(10, 2) NOT NULL, 
    PRIMARY KEY (id) )`;
  connection.query(userss, (err, result) => {
    if (err) {
      console.log(`Table ${process.env.USERS_TABLE} not is created`);
    } else {
      console.log(`Table ${process.env.USERS_TABLE} created!`);
    }
  });
});
connection.end();
