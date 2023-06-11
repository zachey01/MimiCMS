let express = require("express"),
  passport = require("passport"),
  SteamStrategy = require("passport-steam").Strategy,
  SteamWebAPI = require("steam-web"),
  mysql = require("mysql"),
  session = require("express-session"),
  app = express(),
  path = require("path"),
  // http = require("http").createServer(app),
  // io = require("socket.io")(http),
  ejs = require("ejs");
// Routes
require("dotenv").config();
var router = express.Router();
const pool = require("../config/db");
let userAvatar;
let userName;
const { userSteamID } = require("../app.js");

// middleware that is specific to this router
router.use(function timeLog(req, res, next) {
  console.log("Time: ", Date.now());
  next();
});
router.get("/profile", function (req, res) {
  res.send("j");
  console.log(userSteamID);
});
module.exports = router;
