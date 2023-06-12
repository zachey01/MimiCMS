const express = require("express");
const router = express.Router();
const path = require("path");

const pool = require("../config/db");

router.post("/debit", (req, res) => {
  pool.query(
    `UPDATE users SET balance = balance - 10  WHERE steamid = ${userSteamID}`,
    (err, result) => {
      if (err) throw err;
      res.send("Success");
    }
  );
});

module.exports = router;
