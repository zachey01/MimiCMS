const passport = require("passport");
const SteamStrategy = require("passport-steam").Strategy;
let SteamWebAPI = require("steam-web"),
  winston = require("winston"),
  moment = require("moment"),
  expressWinston = require("express-winston"),
  session = require("express-session");
require("dotenv").config();
const pool = require("./config/db");

let userSteamID, userAvatar, userName;
// Logger configuration
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { time: `${moment().format("YYYY-MM-DD-HH-mm-ss")}` },
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

module.exports = passport;
