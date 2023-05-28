const express = require("express");

const app = express();
const path = require("path");
const port = 80;
app.use(express.static("dist"));
app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "./dist/pages/main.html"));
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
