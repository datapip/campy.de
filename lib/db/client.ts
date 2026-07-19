import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { ensureSchemaAndSeed } from "./init";

declare global {
  // eslint-disable-next-line no-var
  var __sqlite: Database.Database | undefined;
}

function createConnection(): Database.Database {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const sqlite = new Database(path.join(dataDir, "app.db"));
  sqlite.pragma("journal_mode = WAL");
  ensureSchemaAndSeed(sqlite);
  return sqlite;
}

// Reuse the connection across Next.js dev hot-reloads.
const sqlite = globalThis.__sqlite ?? createConnection();
if (process.env.NODE_ENV !== "production") {
  globalThis.__sqlite = sqlite;
}

export const db = drizzle(sqlite, { schema });
export const rawSqlite = sqlite;
