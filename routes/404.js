const express = require("express");
const router = express.Router();
const path = require("path");

router.get("*", function (req, res) {
  res.render(path.join(__dirname, "../views", "./404.ejs"));
});

module.exports = router;
