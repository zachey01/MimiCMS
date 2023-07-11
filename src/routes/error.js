let // Modules
  express = require("express"),
  router = express.Router();
require("dotenv").config();

router.get("/", function (req, res) {
  res.send("12773");
});

module.exports = router;
