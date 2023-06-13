let express = require("express"),
  mysql = require("mysql"),
  session = require("express-session"),
  path = require("path"),
  ejs = require("ejs"),
  { Server, RCON, MasterServer } = require("@fabricio-191/valve-server-query"),
  router = express.Router();
require("dotenv").config();

const pool = require("../config/db");

let authVars = {
  logo: process.env.LOGO,
  currency: process.env.CURRENCY,
  slide_1: process.env.SLIDE_1,
  slide_2: process.env.SLIDE_2,
  slide_3: process.env.SLIDE_3,
  tg_channel: process.env.TG_CHANNEL,
  discord_server_id: process.env.DISCORD_SERVER_ID,
  name: process.env.NAME,
  tg_token: process.env.TG_BOT_TOKEN,
  tg_group: process.env.TG_GROUP_ID,
  steamid: "",
  avatar: "",
  balance: "",
  userName: "",
  steamLink: "",
};

function renderPage(req, res, userSteamID, fileName) {
  if (userSteamID) {
    console.log(userSteamID);
    pool.query(
      `SELECT * FROM users WHERE steamid = '${userSteamID}'`,
      (error, results, fields) => {
        if (error) throw error;
        const avatar = results[0].avatar;
        const balance = results[0].balance;
        const userName = results[0].name;
        authVars.avatar = avatar;
        authVars.balance = balance;
        authVars.steamid = userSteamID;
        authVars.userName = userName;
        authVars.steamLink = `https://steamcommunity.com/profiles/${userSteamID}`;
        res.render(
          path.join(__dirname, "../views", `./${fileName}.ejs`),
          authVars
        );
      }
    );
  } else {
    res.render(
      path.join(__dirname, "../views", `./${fileName}NonAuth.ejs`),
      authVars
    );
  }
}

router.get("/", function (req, res) {
  // userSteamID = req.session.steamid;
  userSteamID = "76561199219730677";
  renderPage(req, res, userSteamID, "index");
});

router.get("/shop", function (req, res) {
  // userSteamID = req.session.steamid;
  userSteamID = "76561199219730677";
  renderPage(req, res, userSteamID, "products");
});

router.get("/tickets", function (req, res) {
  // userSteamID = req.session.steamid;
  userSteamID = "76561199219730677";
  renderPage(req, res, userSteamID, "tickets");
});

router.get("/rules", function (req, res) {
  // userSteamID = req.session.steamid;
  userSteamID = "76561199219730677";
  renderPage(req, res, userSteamID, "rules");
});

// 404 page
router.get("*", function (req, res) {
  // userSteamID = req.session.steamid;
  userSteamID = "76561199219730677";
  renderPage(req, res, userSteamID, "404");
});

module.exports = router;
