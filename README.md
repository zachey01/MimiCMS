# MimiCMS

<img src="https://media.discordapp.net/attachments/1110890217478557726/1118836804183928922/1.png" align="right"
     alt="MimiCMS by Zachey" width="170" height="170">

Modular, fast CMS for CS:GO, CS2 (coming soon) servers. Advantages

- Custom payment methods. You can use any payment system, you just need to rewrite the API request template for the official payment system documentation.
- Custom autodonate (i.e. you can use any plugin to issue donations, just specify the command to issue the privilege in the _givecmd_ field).
- Convenient admin panel for managing the site and the server itself via _RCON_.
- Protection against DDOS attacks. IP addresses with suspicious activity will be added to the blacklist.
- Easy to modify. In the admin panel, you can edit each page to your requirements.
- Fast and resource-efficient. CMS can even run on the cheapest VPS (P.S: CMS weighs only _~45mb_.).
- Full logging. If an error occurs in the CMS, you can easily find out the reasons and fix it, and you can also track the actions of a banned player.
- Possibility of creating backups.
- Price. MimiCMS is completely free!

## Installation

### 1. Cloning the repository

Clone this repository:

```bash
git clone https://github.com/zachey01/MimiCMS.git
```

And go to the cloned directory:

```bash
cd MimiCMS
```

### 2. Install dependencies

> P.S: you must have NodeJS and NPM installed

To work with CMS, you need to install the necessary dependencies:

```bash
npm i
```

And if you are using a VPS/VDS, you need to install [forever](https://www.npmjs.com/package/forever) for continuous website operation:

```bash
npm i forever
```

### 3. Setup

First, rename the env.example file to .env and open it in a text editor.

At the beginning, there are variables for connecting to the MySQL database.

`DB_HOST` - this is the location address of the database (usually 127.0.0.1).

`DB_USER` - this is the username to access the database.

`DB_PASSWORD` - this is the user password to access the database.

`DB_NAME` - this is the name of the database.

Next is web server settings:

`PORT` - this is the port on which the site will run (if you want the port not to be displayed in the URL, leave it blank, i.e. port _80_ will be set).

`DOMAIN` - here specify the domain on which the site is hosted, if locally then leave blank

Next are the settings of the site itself.

`STEAM_API_KEY` - This is the web API key for Steam, you can get it [here](https://steamcommunity.com/dev/apikey).

`SECRET` - paste a randomly generated string here (minimum 32 characters).

Other parameters are self-explanatory.

Next is the configuration of the server itself.

`SERVER_IP` - server IP address.

`SERVER_PORT` - server port.
