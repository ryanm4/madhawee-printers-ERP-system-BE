// Runs every .sql file in db-migrations/ in name order against the database in config.env.
// Each migration is written to be safe to run again, so this can be run after every pull.
const fs = require("fs");
const path = require("path");
const pool = require("../sql-connection");

const dir = path.join(__dirname, "..", "db-migrations");

/** Split a file into statements on semicolons that end a line, ignoring comment lines */
function statements(sql) {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function run() {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const db = pool.promise();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    for (const statement of statements(sql)) {
      await db.query(statement);
    }
    console.log(`Applied ${file}`);
  }
}

run()
  .then(() => pool.end())
  .catch((error) => {
    console.error("Migration failed:", error.message);
    pool.end();
    process.exit(1);
  });
