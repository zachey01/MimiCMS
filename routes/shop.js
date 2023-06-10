const express = require("express");
const router = express.Router();
const path = require("path");

const vars = {
  logo: process.env.LOGO,
  currency: process.env.CURRENCY,
  slide_1: process.env.SLIDE_1,
  slide_2: process.env.SLIDE_2,
  slide_3: process.env.SLIDE_3,
  tg_channel: process.env.TG_CHANNEL,
  discord_server_id: process.env.DISCORD_SERVER_ID,
  name: process.env.NAME,
};

const pool = require("../config/db");

router.get("*", function (req, res) {
  let avatar = "";
  if (userSteamID) {
    pool.query(
      `SELECT avatar, balance FROM users WHERE steamid = '${userSteamID}'`,
      (error, results, fields) => {
        if (error) throw error;
        avatar = results[0].avatar;
        balance = results[0].balance;
        const authVars = {
          logo: process.env.LOGO,
          currency: process.env.CURRENCY,
          slide_1: process.env.SLIDE_1,
          slide_2: process.env.SLIDE_2,
          slide_3: process.env.SLIDE_3,
          tg_channel: process.env.TG_CHANNEL,
          discord_server_id: process.env.DISCORD_SERVER_ID,
          name: process.env.NAME,
          avatar: avatar,
          balance: balance,
          userName: userName,
          steamLink: `https://steamcommunity.com/profiles/${userSteamID}`,
        };
        res.render(path.join(__dirname, "../views", "./shop.ejs"), authVars);
      }
    );
  } else {
    res.send("Вы не авторизованы");
  }
});

module.exports = router;
