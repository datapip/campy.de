import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";
import { parseCsv } from "@/lib/csv";
import { TID_START_KEY } from "./schema";

const DEFAULT_TID_START = 12948;
const CONFIG_DIR = path.join(process.cwd(), "config");

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS mandanten (
  mandantid INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS campaigns (
  campid INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  mandantid INTEGER REFERENCES mandanten(mandantid),
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

CREATE TABLE IF NOT EXISTS site_mediums (
  siteid INTEGER NOT NULL REFERENCES sites(siteid),
  meid INTEGER NOT NULL REFERENCES mediums(meid),
  PRIMARY KEY (siteid, meid)
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
 * Reads a seed file from config/ (the Excel-friendly snapshot kept in sync
 * by lib/config-sync.ts). Returns null if the file is missing/empty/invalid
 * so callers can fall back to hardcoded defaults — this is only consulted
 * while seeding an empty table, never during normal reads. Every field
 * comes back as a string (raw CSV); callers parse numbers/lists themselves.
 */
function readConfigSeedRows(filename: string): Record<string, string>[] | null {
  try {
    const raw = fs.readFileSync(path.join(CONFIG_DIR, filename), "utf-8");
    const parsed = parseCsv(raw);
    return parsed.rows.length > 0 ? parsed.rows : null;
  } catch {
    return null;
  }
}

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

  // Migration for DBs created before the mandantid column existed.
  const campaignColumns = sqlite.prepare("PRAGMA table_info(campaigns)").all() as {
    name: string;
  }[];
  if (!campaignColumns.some((c) => c.name === "mandantid")) {
    sqlite.exec(
      "ALTER TABLE campaigns ADD COLUMN mandantid INTEGER REFERENCES mandanten(mandantid)",
    );
  }

  const seedTransaction = sqlite.transaction(() => {
    const mandantCount = sqlite
      .prepare("SELECT COUNT(*) AS c FROM mandanten")
      .get() as { c: number };
    if (mandantCount.c === 0) {
      const configMandanten = readConfigSeedRows("mandanten.csv");
      const insertMandant = sqlite.prepare(
        "INSERT INTO mandanten (mandantid, name) VALUES (?, ?)",
      );
      if (configMandanten) {
        for (const m of configMandanten) {
          insertMandant.run(Number(m.mandantid), m.name);
        }
      } else {
        insertMandant.run(1, "VKB");
        insertMandant.run(2, "UKV");
        insertMandant.run(3, "URV");
        insertMandant.run(4, "AOK NW");
        insertMandant.run(5, "AOK NO");
      }
    }

    const siteCount = sqlite
      .prepare("SELECT COUNT(*) AS c FROM sites")
      .get() as { c: number };
    if (siteCount.c === 0) {
      const configSites = readConfigSeedRows("sites.csv");
      const insertSite = sqlite.prepare(
        "INSERT INTO sites (siteid, name, vkclkid_template) VALUES (?, ?, ?)",
      );
      if (configSites) {
        for (const s of configSites) {
          insertSite.run(Number(s.siteid), s.name, s.vkclkidTemplate || null);
        }
      } else {
        insertSite.run(103, "Google Display", null);
        insertSite.run(104, "Google Search", null);
      }
    }

    const mediumCount = sqlite
      .prepare("SELECT COUNT(*) AS c FROM mediums")
      .get() as { c: number };
    if (mediumCount.c === 0) {
      const configMediums = readConfigSeedRows("mediums.csv");
      const insertMedium = sqlite.prepare(
        "INSERT INTO mediums (meid, name) VALUES (?, ?)",
      );
      const insertSiteMedium = sqlite.prepare(
        "INSERT INTO site_mediums (siteid, meid) VALUES (?, ?)",
      );
      if (configMediums) {
        for (const m of configMediums) {
          const meid = Number(m.meid);
          insertMedium.run(meid, m.name);
          const siteIds = (m.siteIds || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map(Number);
          for (const siteid of siteIds) {
            insertSiteMedium.run(siteid, meid);
          }
        }
      } else {
        insertMedium.run(11, "QR-Code");
        insertMedium.run(29, "Text Ad");
      }
    }

    const campaignCount = sqlite
      .prepare("SELECT COUNT(*) AS c FROM campaigns")
      .get() as { c: number };
    if (campaignCount.c === 0) {
      const configCampaigns = readConfigSeedRows("campaigns.csv");
      const insertCampaign = sqlite.prepare(
        "INSERT INTO campaigns (campid, name, date, mandantid) VALUES (?, ?, ?, ?)",
      );
      if (configCampaigns) {
        for (const c of configCampaigns) {
          const mandantid = c.mandantid?.trim() ? Number(c.mandantid) : null;
          insertCampaign.run(Number(c.campid), c.name, c.date, mandantid);
        }
      } else {
        insertCampaign.run(1203, "PHV Sommer", "08.2026", null);
      }
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
