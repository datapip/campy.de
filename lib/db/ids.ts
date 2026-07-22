import { eq, max } from "drizzle-orm";
import { db } from "./client";
import {
  campaigns,
  mandanten,
  mediums,
  settings,
  sites,
  tids,
  TID_START_KEY,
} from "./schema";

/**
 * All ID assignments run max(existing)+1 and the insert inside a single
 * better-sqlite3 transaction. better-sqlite3 executes synchronously and
 * Node is single-threaded, so no other request can interleave between the
 * read and the write — two concurrent callers can never receive the same ID.
 */

export type NewTidInput = {
  note: string | null;
  campid: number;
  siteid: number;
  meid: number;
  baseUrl: string;
  /** Builds the final URL from the atomically-assigned tid. */
  buildUrl: (tid: number) => string;
};

export function insertTidWithNextId(input: NewTidInput): {
  tid: number;
  generatedUrl: string;
} {
  return db.transaction((tx) => {
    const row = tx.select({ max: max(tids.tid) }).from(tids).get();
    const startRow = tx
      .select()
      .from(settings)
      .where(eq(settings.key, TID_START_KEY))
      .get();
    const start = startRow ? Number(startRow.value) : 0;
    const next = Math.max(row?.max ?? 0, start) + 1;
    const generatedUrl = input.buildUrl(next);

    tx.insert(tids)
      .values({
        tid: next,
        note: input.note,
        campid: input.campid,
        siteid: input.siteid,
        meid: input.meid,
        baseUrl: input.baseUrl,
        generatedUrl,
      })
      .run();

    return { tid: next, generatedUrl };
  });
}

export type BulkTidInput = NewTidInput;

/** Assigns sequential tids to a whole batch inside one transaction. */
export function insertTidsBulk(
  rows: BulkTidInput[],
): { tid: number; generatedUrl: string }[] {
  return db.transaction((tx) => {
    const row = tx.select({ max: max(tids.tid) }).from(tids).get();
    const startRow = tx
      .select()
      .from(settings)
      .where(eq(settings.key, TID_START_KEY))
      .get();
    const start = startRow ? Number(startRow.value) : 0;
    let next = Math.max(row?.max ?? 0, start) + 1;

    const results: { tid: number; generatedUrl: string }[] = [];
    const insert = tx.insert(tids);
    for (const input of rows) {
      const tid = next;
      next += 1;
      const generatedUrl = input.buildUrl(tid);
      insert
        .values({
          tid,
          note: input.note,
          campid: input.campid,
          siteid: input.siteid,
          meid: input.meid,
          baseUrl: input.baseUrl,
          generatedUrl,
        })
        .run();
      results.push({ tid, generatedUrl });
    }
    return results;
  });
}

export function insertCampaignWithNextId(
  name: string,
  date: string,
  mandantid: number,
): number {
  return db.transaction((tx) => {
    const row = tx.select({ max: max(campaigns.campid) }).from(campaigns).get();
    const next = (row?.max ?? 0) + 1;
    tx.insert(campaigns).values({ campid: next, name, date, mandantid }).run();
    return next;
  });
}

export function insertMandantWithNextId(name: string): number {
  return db.transaction((tx) => {
    const row = tx.select({ max: max(mandanten.mandantid) }).from(mandanten).get();
    const next = (row?.max ?? 0) + 1;
    tx.insert(mandanten).values({ mandantid: next, name }).run();
    return next;
  });
}

export function insertSiteWithNextId(name: string): number {
  return db.transaction((tx) => {
    const row = tx.select({ max: max(sites.siteid) }).from(sites).get();
    const next = (row?.max ?? 0) + 1;
    tx.insert(sites).values({ siteid: next, name }).run();
    return next;
  });
}

export function insertMediumWithNextId(name: string): number {
  return db.transaction((tx) => {
    const row = tx.select({ max: max(mediums.meid) }).from(mediums).get();
    const next = (row?.max ?? 0) + 1;
    tx.insert(mediums).values({ meid: next, name }).run();
    return next;
  });
}
