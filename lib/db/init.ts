import type Database from "better-sqlite3";
import { TID_START_KEY } from "./schema";

const DEFAULT_TID_START = 12948;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS campaigns (
  campid INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sites (
  siteid INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  vkclkid_template TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mediums (
  meid INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tids (
  tid INTEGER PRIMARY KEY,
  note TEXT,
  campid INTEGER NOT NULL REFERENCES campaigns(campid),
  siteid INTEGER NOT NULL REFERENCES sites(siteid),
  meid INTEGER NOT NULL REFERENCES mediums(meid),
  base_url TEXT NOT NULL,
  generated_url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

/**
 * Idempotent bootstrap: creates tables (if missing) and seeds baseline
 * master data. Safe to call on every process start.
 */
export function ensureSchemaAndSeed(sqlite: Database.Database): void {
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(SCHEMA_SQL);

  // Migration for DBs created before the vkclkid column existed.
  const siteColumns = sqlite.prepare("PRAGMA table_info(sites)").all() as {
    name: string;
  }[];
  if (!siteColumns.some((c) => c.name === "vkclkid_template")) {
    sqlite.exec("ALTER TABLE sites ADD COLUMN vkclkid_template TEXT");
  }

  const seedTransaction = sqlite.transaction(() => {
    const siteCount = sqlite
      .prepare("SELECT COUNT(*) AS c FROM sites")
      .get() as { c: number };
    if (siteCount.c === 0) {
      const insertSite = sqlite.prepare(
        "INSERT INTO sites (siteid, name) VALUES (?, ?)",
      );
      insertSite.run(103, "Google Display");
      insertSite.run(104, "Google Search");
    }

    const mediumCount = sqlite
      .prepare("SELECT COUNT(*) AS c FROM mediums")
      .get() as { c: number };
    if (mediumCount.c === 0) {
      const insertMedium = sqlite.prepare(
        "INSERT INTO mediums (meid, name) VALUES (?, ?)",
      );
      insertMedium.run(11, "QR-Code");
      insertMedium.run(29, "Text Ad");
    }

    const campaignCount = sqlite
      .prepare("SELECT COUNT(*) AS c FROM campaigns")
      .get() as { c: number };
    if (campaignCount.c === 0) {
      sqlite
        .prepare(
          "INSERT INTO campaigns (campid, name, date) VALUES (?, ?, ?)",
        )
        .run(1203, "PHV Sommer", "08.2026");
    }

    const settingRow = sqlite
      .prepare("SELECT value FROM settings WHERE key = ?")
      .get(TID_START_KEY);
    if (!settingRow) {
      sqlite
        .prepare("INSERT INTO settings (key, value) VALUES (?, ?)")
        .run(TID_START_KEY, String(DEFAULT_TID_START));
    }
  });

  seedTransaction();
}
