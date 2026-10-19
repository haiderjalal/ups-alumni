// Starts a local PostgreSQL server for development and end-to-end tests when Docker is unavailable.
// Use `docker compose up postgres` instead when Docker is installed. Production uses a managed PostgreSQL.
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const DATA_DIR = path.resolve(".local-postgres");
const PORT = 5432;
const USER = "ups_app";
const PASSWORD = "ups_local_only";
const DATABASE = "ups_alumni";

const server = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: USER,
  password: PASSWORD,
  port: PORT,
  persistent: true,
  onError: (message) => console.error("[postgres]", message),
});

const isInitialised = await import("node:fs")
  .then((fs) => fs.existsSync(path.join(DATA_DIR, "PG_VERSION")))
  .catch(() => false);

if (!isInitialised) {
  await server.initialise();
}

await server.start();

try {
  await server.createDatabase(DATABASE);
} catch (error) {
  // The database already exists after the first run.
  if (!String(error?.message ?? error).includes("already exists")) {
    throw error;
  }
}

console.log(`PostgreSQL is listening on localhost:${PORT} (database ${DATABASE}). Press Ctrl+C to stop.`);

const shutdown = async () => {
  await server.stop();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
