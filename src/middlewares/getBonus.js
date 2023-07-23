const axios = require('axios');
const cfg = require('../config/config');

module.exports = async function (userSteamID) {
	const apiKey = cfg.SteamWebAPIkey;
	const url = `https://api.steampowered.com/ISteamUser/GetUserGroupList/v1/?key=${apiKey}&steamid=${userSteamID}&relationship=friend&format=json`;

	try {
		const response = await axios.get(url);
		const groupList = response.data.response.groups;

		let hasValue = false;
		for (let i = 0; i < groupList.length; i++) {
			const group = groupList[i];
			if (group.gid === cfg.SteamGroup) {
				hasValue = true;
				break;
			}
		}

		return hasValue;
	} catch (error) {
		throw error;
	}
};
