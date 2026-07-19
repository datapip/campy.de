import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { ensureSchemaAndSeed } from "../lib/db/init";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "app.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
ensureSchemaAndSeed(sqlite);
sqlite.close();

console.log(`Datenbank initialisiert und Seed-Daten geprüft: ${dbPath}`);
