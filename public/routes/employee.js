exports.findAll = function (req, res) {
  res.render("index");
};

exports.findById = function (req, res) {
  res.send({ id: req.params.id, name: "The Name", description: "description" });
};
