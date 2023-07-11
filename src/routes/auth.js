const express = require("express");
const passport = require("passport");

const router = express.Router();

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
  userSteamID = null; // Сбрасываем steam id пользователя
  req.session.steamid = null;
  res.redirect("/"); // Перенаправляем на главную страницу
});

module.exports = router;
