// This script automates the creation of a local PostgreSQL database
// for a development environment.
// It's a great practice to ensure all developers have a consistent setup.

const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '.env'),
});
const pg = require('pg');

const { Client } = pg;

const DB_NAME = process.env.DB_NAME || 'blog_db';

const pgConfig = {
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_NAME,
  port: process.env.PG_PORT,
};

async function main() {
  const isDev = process.env.NODE_ENV === 'development';

  if (!isDev) {
    console.log(
      'Skipping database creation. Not in a development environment.'
    );
    return;
  }

  let client;
  try {
    // Attempt to connect to the default 'postgres' database.
    client = new Client(pgConfig);
    await client.connect();

    console.log('Successfully connected to the database server.');

    const res = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [DB_NAME]
    );

    if (res.rowCount === 0) {
      console.log(
        `The database '${DB_NAME}' was not found. Creating it now...`
      );
      await client.query(`CREATE DATABASE "${DB_NAME}";`);
      console.log(`Successfully created database '${DB_NAME}'.`);
    } else {
      console.log(
        `The database '${DB_NAME}' already exists. Skipping creation.`
      );
    }
  } catch (error) {
    console.error('An error occurred during database setup:', error);
    process.exit(1); // Exit with a non-zero code to indicate an error
  } finally {
    // Always ensure the client connection is closed.
    if (client) {
      await client.end();
      console.log('Connection to the database server closed.');
    }
  }
}

main();
