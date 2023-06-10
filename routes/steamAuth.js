let SteamWebAPI = require("steam-web"),
  mysql = require("mysql"),
  express = require("express"),
  app = express();

const pool = require("../config/db");

module.exports = {
  // Authenticate user via Steam
  auth(req, res) {
    if (req.isAuthenticated()) {
      res.redirect("/");
    } else {
      passport.authenticate("steam", { failureRedirect: "/login" })(req, res);
    }
  },

  // Handle user return after Steam authentication
  returnPage(req, res) {
    if (req.isAuthenticated()) {
      res.redirect("/");
    } else {
      passport.authenticate("steam", { failureRedirect: "/login" })(req, res);
    }
  },
};
