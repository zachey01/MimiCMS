const axios = require('axios');

module.exports = async function (userSteamID) {
	const apiKey = process.env.STEAM_API_KEY;
	const url = `https://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key=${apiKey}&steamid=${userSteamID}&relationship=friend&format=json`;

	try {
		const response = await axios.get(url);
		const friendsList = response.data.friendslist.friends;
		return friendsList;
	} catch (error) {
		throw error;
	}
};
