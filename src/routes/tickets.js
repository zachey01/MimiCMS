let // Modules
  express = require("express"),
  router = express.Router();
require("dotenv").config();
const { renderPage, authVars } = require("../middlewares/renderPage");
const { stringify } = require("querystring");

router.get("/", function (req, res) {
  userSteamID = req.session.steamid;
  renderPage(req, res, userSteamID, "tickets", "nonAuthErr");
});

router.post("/send", (req, res) => {
  const ticketText = decodeURIComponent(
    stringify(req.body)
      .replace(/[\s{}':]/g, "")
      .slice(0, -1)
  );

  console.log(ticketText);
});

module.exports = router;
