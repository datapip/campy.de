"use server";

import { revalidatePath } from "next/cache";
import { parseCsv } from "@/lib/csv";
import {
  getCampaigns,
  getMediums,
  getMediumSiteMap,
  getSites,
} from "@/lib/db/queries";
import { insertTidsBulk } from "@/lib/db/ids";
import { syncConfigSnapshot } from "@/lib/config-sync";
import { isMediumAllowedForSite } from "@/lib/site-mediums";
import { buildTrackingUrl, validateBaseUrl } from "@/lib/url-builder";
import type { ActionResult } from "./types";

export type BulkDefaults = {
  campid: number | null;
  siteid: number | null;
  meid: number | null;
};

export type BulkPreviewRow = {
  rowIndex: number;
  url: string;
  note: string | null;
  campid: number | null;
  siteid: number | null;
  meid: number | null;
  errors: string[];
};

export type BulkValidateResult = {
  rows: BulkPreviewRow[];
  hasErrors: boolean;
};

function parseIdField(
  raw: string | undefined,
  fallback: number | null,
): { value: number | null; invalid: boolean } {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { value: fallback, invalid: false };
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n <= 0) return { value: null, invalid: true };
  return { value: n, invalid: false };
}

function validateRows(
  rows: Record<string, string>[],
  defaults: BulkDefaults,
): BulkPreviewRow[] {
  const campaignIds = new Set(getCampaigns().map((c) => c.campid));
  const siteIds = new Set(getSites().map((s) => s.siteid));
  const mediumIds = new Set(getMediums().map((m) => m.meid));
  const mediumSiteMap = getMediumSiteMap();

  return rows.map((row, i): BulkPreviewRow => {
    const errors: string[] = [];
    const url = (row.url ?? "").trim();
    const note = (row.note ?? "").trim() || null;

    const campidField = parseIdField(row.campid, defaults.campid);
    const siteidField = parseIdField(row.siteid, defaults.siteid);
    const meidField = parseIdField(row.meid, defaults.meid);

    if (campidField.invalid) errors.push('Ungültige "campid".');
    if (siteidField.invalid) errors.push('Ungültige "siteid".');
    if (meidField.invalid) errors.push('Ungültige "meid".');

    if (campidField.value == null && !campidField.invalid) {
      errors.push("Keine Kampagne angegeben (Spalte campid oder Vorauswahl).");
    } else if (campidField.value != null && !campaignIds.has(campidField.value)) {
      errors.push(`Kampagne ${campidField.value} existiert nicht.`);
    }

    if (siteidField.value == null && !siteidField.invalid) {
      errors.push("Kein Site angegeben (Spalte siteid oder Vorauswahl).");
    } else if (siteidField.value != null && !siteIds.has(siteidField.value)) {
      errors.push(`Site ${siteidField.value} existiert nicht.`);
    }

    if (meidField.value == null && !meidField.invalid) {
      errors.push("Kein Medium angegeben (Spalte meid oder Vorauswahl).");
    } else if (meidField.value != null && !mediumIds.has(meidField.value)) {
      errors.push(`Medium ${meidField.value} existiert nicht.`);
    } else if (
      meidField.value != null &&
      siteidField.value != null &&
      siteIds.has(siteidField.value) &&
      !isMediumAllowedForSite(meidField.value, siteidField.value, mediumSiteMap)
    ) {
      errors.push(
        `Medium ${meidField.value} ist für Site ${siteidField.value} nicht zulässig.`,
      );
    }

    const validated = validateBaseUrl(url);
    if (!validated.ok) {
      errors.push(validated.error);
    }

    return {
      rowIndex: i,
      url,
      note,
      campid: campidField.value,
      siteid: siteidField.value,
      meid: meidField.value,
      errors,
    };
  });
}

export async function bulkValidate(
  csvText: string,
  defaults: BulkDefaults,
): Promise<ActionResult<BulkValidateResult>> {
  const parsed = parseCsv(csvText);

  if (!parsed.headers.includes("url")) {
    return {
      ok: false,
      error: 'Die CSV-Datei benötigt mindestens eine Spalte "url".',
    };
  }
  if (parsed.rows.length === 0) {
    return { ok: false, error: "Die CSV-Datei enthält keine Datenzeilen." };
  }

  const rows = validateRows(parsed.rows, defaults);
  const hasErrors = parsed.errors.length > 0 || rows.some((r) => r.errors.length > 0);

  if (parsed.errors.length > 0) {
    rows.unshift({
      rowIndex: -1,
      url: "",
      note: null,
      campid: null,
      siteid: null,
      meid: null,
      errors: parsed.errors,
    });
  }

  return { ok: true, data: { rows, hasErrors } };
}

export type BulkGenerateResultRow = {
  url: string;
  note: string | null;
  campid: number;
  siteid: number;
  meid: number;
  tid: number;
  generatedUrl: string;
};

export async function bulkGenerate(
  rows: BulkPreviewRow[],
): Promise<ActionResult<BulkGenerateResultRow[]>> {
  if (rows.length === 0) {
    return { ok: false, error: "Keine Zeilen zum Generieren vorhanden." };
  }

  // Defensive re-validation in case master data changed since the preview.
  const revalidated = validateRows(
    rows.map((r) => ({
      url: r.url,
      note: r.note ?? "",
      campid: String(r.campid ?? ""),
      siteid: String(r.siteid ?? ""),
      meid: String(r.meid ?? ""),
    })),
    { campid: null, siteid: null, meid: null },
  );
  if (revalidated.some((r) => r.errors.length > 0)) {
    return {
      ok: false,
      error:
        "Die Daten haben sich geändert. Bitte die CSV-Datei erneut hochladen und prüfen.",
    };
  }

  const sitesById = new Map(getSites().map((s) => [s.siteid, s]));

  const inserted = insertTidsBulk(
    rows.map((r) => ({
      note: r.note,
      campid: r.campid as number,
      siteid: r.siteid as number,
      meid: r.meid as number,
      baseUrl: r.url,
      buildUrl: (tid: number) =>
        buildTrackingUrl(r.url, {
          tid,
          campid: r.campid as number,
          siteid: r.siteid as number,
          meid: r.meid as number,
          vkclkidTemplate: sitesById.get(r.siteid as number)?.vkclkidTemplate,
        }),
    })),
  );

  syncConfigSnapshot();
  revalidatePath("/");
  revalidatePath("/admin");

  const results: BulkGenerateResultRow[] = rows.map((r, i) => ({
    url: r.url,
    note: r.note,
    campid: r.campid as number,
    siteid: r.siteid as number,
    meid: r.meid as number,
    tid: inserted[i].tid,
    generatedUrl: inserted[i].generatedUrl,
  }));

  return { ok: true, data: results };
}
