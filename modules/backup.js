const mysqldump = require("mysqldump");
const moment = require("moment");
require("dotenv").config();

async function backupDatabase() {
  try {
    // dump the result straight to a file
    await mysqldump({
      connection: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      },
      dumpToFile: `./backup/dump-${moment().format("YYYY-MM-DD-HH-mm-ss")}.sql`,
    });

    // return the dump from the function and not to a file
    const result = await mysqldump({
      connection: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      },
    });

    console.log("Backup completed successfully");
  } catch (error) {
    console.error(`Backup error: ${error.message}`);
  }
}

backupDatabase();
