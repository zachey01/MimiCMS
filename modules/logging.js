let // Modules
  express = require("express"),
  passport = require("passport"),
  SteamStrategy = require("passport-steam").Strategy,
  SteamWebAPI = require("steam-web"),
  mysql = require("mysql"),
  session = require("express-session"),
  app = express(),
  path = require("path"),
  ejs = require("ejs"),
  { Server, RCON, MasterServer } = require("@fabricio-191/valve-server-query"),
  winston = require("winston"),
  expressWinston = require("express-winston"),
  port = process.env.PORT || 80;
require("dotenv").config();

// Logger configuration

module.exports = function logger() {
  winston.createLogger({
    level: "info",
    format: winston.format.json(),
    defaultMeta: { ip: "123" },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      }),
      new winston.transports.File({ filename: "error.log", level: "error" }),
      new winston.transports.File({ filename: "combined.log" }),
    ],
  });
};
