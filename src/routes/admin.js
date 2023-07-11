let // Modules
  express = require("express"),
  passport = require("passport"),
  SteamStrategy = require("passport-steam").Strategy,
  SteamWebAPI = require("steam-web"),
  mysql = require("mysql"),
  session = require("express-session"),
  app = express(),
  router = express.Router(),
  moment = require("moment"),
  path = require("path"),
  ejs = require("ejs"),
  { Server, RCON, MasterServer } = require("@fabricio-191/valve-server-query"),
  winston = require("winston"),
  fs = require("fs"),
  expressWinston = require("express-winston");
require("dotenv").config();
const logger = require("../middlewares/logger");
const pool = require("../config/db");
const { renderPage, authVars } = require("../middlewares/renderPage");

router.get("/", function (req, res) {
  userSteamID = req.session.steamid;

  if (userSteamID === "76561199219730677") {
    renderPage(req, res, userSteamID, "admin-main", "nonAuthErr");
  } else {
    renderPage(req, res, userSteamID, "nonAuth404", "404");
  }
});

module.exports = router;
