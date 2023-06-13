//TODO: сделать страниу /balance и добавить оплату на киви через генерацию url для succesUrl qiwi
//TODO: реализовать списание с баланса с помощью debit
let express = require("express"),
  passport = require("passport"),
  SteamStrategy = require("passport-steam").Strategy,
  SteamWebAPI = require("steam-web"),
  mysql = require("mysql"),
  session = require("express-session"),
  app = express(),
  path = require("path"),
  ejs = require("ejs"),
  { Server, RCON, MasterServer } = require("@fabricio-191/valve-server-query");
require("dotenv").config();
var router = express.Router();

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
  avatar: "",
  balance: "",
  userName: "",
  steamLink: "",
};

function renderPage(req, res, userSteamID, filen) {
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
        authVars.userName = userName;
        authVars.steamLink = `https://steamcommunity.com/profiles/${userSteamID}`;
        res.render(
          path.join(__dirname, "../views", `./${filen}.ejs`),
          authVars
        );
      }
    );
  } else {
    res.send("ff");
  }
}

router.get("/", function (req, res) {
  userSteamID = req.session.steamid;
  renderPage(req, res, userSteamID, "user-profile");
});

module.exports = router;
