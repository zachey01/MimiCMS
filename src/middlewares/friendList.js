const axios = require('axios');
const cfg = require('../config/config');

module.exports = async function (userSteamID) {
	const apiKey = cfg.SteamWebAPIkey;
	const url = `https://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key=${apiKey}&steamid=${userSteamID}&relationship=friend&format=json`;

	try {
		const response = await axios.get(url);
		const friendsList = response.data.friendslist.friends;
		return friendsList;
	} catch (error) {
		throw error;
	}
};
