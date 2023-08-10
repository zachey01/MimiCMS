const mysqldump = require('mysqldump');
const moment = require('moment');
const fs = require('fs');
const cfg = require('../src/config/config');

async function backupDatabase() {
	try {
		// create backup directory if it doesn't exist
		if (!fs.existsSync('./backup')) {
			fs.mkdirSync('./backup');
		}

		// dump the result straight to a file
		await mysqldump({
			connection: {
				host: cfg.DB_HOST,
				user: cfg.DB_USER,
				password: cfg.DB_PASSWORD,
				database: cfg.DB_NAME
			},
			dumpToFile: `./backup/dump-${moment().format(
				'YYYY-MM-DD-HH-mm-ss'
			)}.sql`
		});

		// return the dump from the function and not to a file
		const result = await mysqldump({
			connection: {
				host: cfg.DB_HOST,
				user: cfg.DB_USER,
				password: cfg.DB_PASSWORD,
				database: cfg.DB_NAME
			}
		});

		console.log('Backup completed successfully');
	} catch (error) {
		console.error('Backup error: ' + error.message);
	}
}

backupDatabase();
