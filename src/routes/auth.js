const express = require("express");
const passport = require("passport");
const SteamStrategy = require("passport-steam").Strategy;
const SteamWebAPI = require("steam-web");
const session = require("express-session");
const port = process.env.PORT || 3000;
const pool = require("../config/db");
const router = express.Router();
const logger = require("../middlewares/logger");

// Passport configuration
passport.use(
  new SteamStrategy(
    {
      returnURL: `http://${
        process.env.DOMAIN || "localhost"
      }:${port}/auth/steam/return`,
      realm: `http://${process.env.DOMAIN || "localhost"}:${port}/`,
      apiKey: process.env.STEAM_API_KEY,
    },
    (identifier, profile, done) => {
      const steam = new SteamWebAPI({ apiKey: process.env.STEAM_API_KEY });
      steam.getPlayerSummaries({
        steamids: profile.id,
        callback: (err, data) => {
          if (err) {
            logger.error("Failed to retrieve user data:" + err.stack);
            return done(err);
          }
          pool.query(
            "INSERT IGNORE INTO users SET ?",
            {
              steamid: profile.id,
              name: profile.displayName,
              avatar: data.response.players[0].avatarfull,
            },
            (err, result) => {
              if (err) {
                logger.error(
                  "Error writing data about the user to the database:" +
                    err.stack
                );
                return done(err);
              }
              logger.info(
                "Data about " +
                  profile.displayName +
                  " successfully written to the database"
              );
              userSteamID = profile.id;
              userName = profile.displayName;
              return done(null, profile);
            }
          );
        },
      });
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((id, done) => {
  done(null, user);
});

passport.deserializeUser((id, done) => {
  pool.query("SELECT * FROM users WHERE steamid = ?", [id], (err, results) => {
    if (err) {
      logger.error("User search error in the database: " + err.stack);
      return done(err);
    }
    if (results.length === 0) {
      return done(null, null);
    }
    return done(null, results[0]);
  });
});

router.get(
  "/steam",
  passport.authenticate("steam", { failureRedirect: "/login" }),
  (req, res) => {
    if (req.isAuthenticated()) {
      res.redirect("/");
    } else {
      passport.authenticate("steam", { failureRedirect: "/login" })(req, res);
    }
  }
);

router.get(
  "/steam/return",
  passport.authenticate("steam", { failureRedirect: "/login" }),
  (req, res) => {
    if (req.isAuthenticated()) {
      req.session.steamid = userSteamID;
      res.redirect("/");
    } else {
      passport.authenticate("steam", { failureRedirect: "/login" })(req, res);
    }
  }
);

router.get("/logout", (req, res) => {
  userSteamID = null;
  req.session.steamid = null;
  res.redirect("/");
});

module.exports = router;
