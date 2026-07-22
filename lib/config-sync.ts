import fs from "node:fs";
import path from "node:path";
import { unparseCsv } from "./csv";
import { db } from "./db/client";
import { campaigns, mandanten, mediums, siteMediums, sites, tids } from "./db/schema";

const CONFIG_DIR = path.join(process.cwd(), "config");

function writeCsv(
  filename: string,
  fields: string[],
  rows: (string | number | null | undefined)[][],
): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(path.join(CONFIG_DIR, filename), unparseCsv(fields, rows), "utf-8");
}

/**
 * Re-exports current master data to config/*.csv so the folder always
 * mirrors live state — semicolon-separated with a UTF-8 BOM, same as every
 * other export in this app, so it opens directly in (German) Excel for
 * manual review/editing. SQLite stays the source of truth for every read
 * and write in the app (see the transactional ID-assignment invariant in
 * lib/db/ids.ts); this is a generated snapshot that also doubles as the
 * initial seed source on first boot (lib/db/init.ts). Called after every
 * admin mutation, tid generation (single + bulk), and tid deletion —
 * best-effort, a write failure here must never fail the caller's DB
 * mutation. `tids.csv` is the one exception to the seed-source rule: it's
 * written for audit/review only and is never read back by lib/db/init.ts —
 * a fresh DB always starts with zero generated tracking-IDs.
 */
export function syncConfigSnapshot(): void {
  try {
    const mandantRows = db
      .select({ mandantid: mandanten.mandantid, name: mandanten.name })
      .from(mandanten)
      .orderBy(mandanten.mandantid)
      .all();
    writeCsv(
      "mandanten.csv",
      ["mandantid", "name"],
      mandantRows.map((m) => [m.mandantid, m.name]),
    );

    const siteRows = db
      .select({
        siteid: sites.siteid,
        name: sites.name,
        vkclkidTemplate: sites.vkclkidTemplate,
      })
      .from(sites)
      .orderBy(sites.siteid)
      .all();
    writeCsv(
      "sites.csv",
      ["siteid", "name", "vkclkidTemplate"],
      siteRows.map((s) => [s.siteid, s.name, s.vkclkidTemplate]),
    );

    const mediumRows = db
      .select({ meid: mediums.meid, name: mediums.name })
      .from(mediums)
      .orderBy(mediums.meid)
      .all();
    const siteMediumRows = db.select().from(siteMediums).all();
    const siteIdsByMedium = new Map<number, number[]>();
    for (const row of siteMediumRows) {
      const list = siteIdsByMedium.get(row.meid) ?? [];
      list.push(row.siteid);
      siteIdsByMedium.set(row.meid, list);
    }
    writeCsv(
      "mediums.csv",
      ["meid", "name", "siteIds"],
      mediumRows.map((m) => [
        m.meid,
        m.name,
        (siteIdsByMedium.get(m.meid) ?? []).sort((a, b) => a - b).join(","),
      ]),
    );

    const campaignRows = db
      .select({
        campid: campaigns.campid,
        name: campaigns.name,
        date: campaigns.date,
        mandantid: campaigns.mandantid,
      })
      .from(campaigns)
      .orderBy(campaigns.campid)
      .all();
    writeCsv(
      "campaigns.csv",
      ["campid", "name", "date", "mandantid"],
      campaignRows.map((c) => [c.campid, c.name, c.date, c.mandantid]),
    );

    const tidRows = db
      .select({
        tid: tids.tid,
        note: tids.note,
        campid: tids.campid,
        siteid: tids.siteid,
        meid: tids.meid,
        baseUrl: tids.baseUrl,
        generatedUrl: tids.generatedUrl,
        createdAt: tids.createdAt,
      })
      .from(tids)
      .orderBy(tids.tid)
      .all();
    writeCsv(
      "tids.csv",
      [
        "tid",
        "note",
        "campid",
        "siteid",
        "meid",
        "baseUrl",
        "generatedUrl",
        "createdAt",
      ],
      tidRows.map((t) => [
        t.tid,
        t.note,
        t.campid,
        t.siteid,
        t.meid,
        t.baseUrl,
        t.generatedUrl,
        t.createdAt,
      ]),
    );
  } catch (err) {
    console.error("Failed to sync config/ snapshot:", err);
  }
}
