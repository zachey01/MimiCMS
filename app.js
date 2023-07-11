const express = require("express");
const passport = require("passport");
const SteamStrategy = require("passport-steam").Strategy;
const SteamWebAPI = require("steam-web");
const session = require("express-session");
const app = express();
const {
  Server,
  RCON,
  MasterServer,
} = require("@fabricio-191/valve-server-query");
const expressWinston = require("express-winston");
const compress = require("compression");
const pool = require("./src/config/db");
const port = process.env.PORT || 3000;
const logger = require("./src/middlewares/logger");
require("dotenv").config();

const mainRoutes = require("./src/routes/route");
const linkRoute = require("./src/routes/links");
const authRoutes = require("./src/routes/auth");
const errorRoutes = require("./src/routes/error");
const ticketRoutes = require("./src/routes/tickets");
const shopRoute = require("./src/routes/shop");
const adminRoute = require("./src/routes/admin");

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

// ExpressJS configuration
app.use(compress());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("./src/public"));
app.set("view engine", "ejs");
app.use(express.static("./src/public"));
app.use(
  expressWinston.errorLogger({
    winstonInstance: logger,
  })
);
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(
  expressWinston.logger({
    winstonInstance: logger,
    level: "info",
    meta: false,
    msg: "HTTP {{req.method}} {{req.url}}",
    expressFormat: true,
    colorize: false,
    ignoreRoute: function (req, res) {
      return false;
    },
  })
);

// Routes
app.use("/", mainRoutes);
app.use("/links", linkRoute);
app.use("/auth", authRoutes);
app.use("/tickets", ticketRoutes);
app.use("/shop", shopRoute);
app.use("/admin", adminRoute);
app.use("*", errorRoutes);

app.listen(port, () => logger.info("Server started on port " + port));
