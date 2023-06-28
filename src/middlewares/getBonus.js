const axios = require("axios");

module.exports = async function (userSteamID) {
  const apiKey = process.env.STEAM_API_KEY;
  const url = `https://api.steampowered.com/ISteamUser/GetUserGroupList/v1/?key=${apiKey}&steamid=${userSteamID}&relationship=friend&format=json`;

  try {
    const response = await axios.get(url);
    const groupList = response.data.response.groups;

    // Проверяем наличие значения 43827492 в groupList
    let hasValue = false;
    for (let i = 0; i < groupList.length; i++) {
      const group = groupList[i];
      if (group.gid === "43827492") {
        hasValue = true;
        break;
      }
    }

    return hasValue;
  } catch (error) {
    throw error;
  }
};
