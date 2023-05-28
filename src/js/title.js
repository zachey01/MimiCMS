const list = document.getElementById("title");

fetch("./config.json")
  .then((response) => response.json())
  .then((json) => (title.innerHTML = `${json.name}`));
