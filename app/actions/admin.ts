"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import {
  campaigns,
  mandanten,
  mediums,
  siteMediums,
  sites,
  tids,
} from "@/lib/db/schema";
import {
  insertCampaignWithNextId,
  insertMandantWithNextId,
  insertMediumWithNextId,
  insertSiteWithNextId,
} from "@/lib/db/ids";
import {
  countCampaignsForMandant,
  countTidsForCampaign,
  countTidsForMedium,
  countTidsForSite,
  getCampaignById,
  getMandantById,
  getMediumById,
  getSiteById,
  getSites,
} from "@/lib/db/queries";
import { syncConfigSnapshot } from "@/lib/config-sync";
import { SESSION_COOKIE } from "@/lib/auth";
import { isValidCampaignDate } from "@/lib/format";
import type { ActionResult } from "./types";

function revalidateAdmin() {
  syncConfigSnapshot();
  revalidatePath("/admin");
  revalidatePath("/");
}

// ---------- Mandanten ----------

export async function createMandant(
  name: string,
): Promise<ActionResult<{ mandantid: number }>> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { ok: false, error: "Bitte einen Namen angeben." };
  }
  const mandantid = insertMandantWithNextId(trimmedName);
  revalidateAdmin();
  return { ok: true, data: { mandantid } };
}

export async function updateMandant(
  mandantid: number,
  name: string,
): Promise<ActionResult<null>> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { ok: false, error: "Bitte einen Namen angeben." };
  }
  if (!getMandantById(mandantid)) {
    return { ok: false, error: "Mandant wurde nicht gefunden." };
  }
  db.update(mandanten)
    .set({ name: trimmedName })
    .where(eq(mandanten.mandantid, mandantid))
    .run();
  revalidateAdmin();
  return { ok: true, data: null };
}

export async function deleteMandant(mandantid: number): Promise<ActionResult<null>> {
  const count = countCampaignsForMandant(mandantid);
  if (count > 0) {
    return {
      ok: false,
      error: `Mandant kann nicht gelöscht werden: ${count} Kampagne(n) verweisen noch darauf.`,
    };
  }
  db.delete(mandanten).where(eq(mandanten.mandantid, mandantid)).run();
  revalidateAdmin();
  return { ok: true, data: null };
}

// ---------- Kampagnen ----------

export async function createCampaign(
  name: string,
  date: string,
  mandantid: number,
): Promise<ActionResult<{ campid: number }>> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { ok: false, error: "Bitte einen Namen angeben." };
  }
  if (!isValidCampaignDate(date)) {
    return {
      ok: false,
      error: 'Bitte das Datum im Format MM.JJJJ angeben (z. B. "08.2026").',
    };
  }
  if (!mandantid || !getMandantById(mandantid)) {
    return { ok: false, error: "Bitte einen Mandanten auswählen." };
  }
  const campid = insertCampaignWithNextId(trimmedName, date.trim(), mandantid);
  revalidateAdmin();
  return { ok: true, data: { campid } };
}

export async function updateCampaign(
  campid: number,
  name: string,
  date: string,
  mandantid: number,
): Promise<ActionResult<null>> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { ok: false, error: "Bitte einen Namen angeben." };
  }
  if (!isValidCampaignDate(date)) {
    return {
      ok: false,
      error: 'Bitte das Datum im Format MM.JJJJ angeben (z. B. "08.2026").',
    };
  }
  if (!mandantid || !getMandantById(mandantid)) {
    return { ok: false, error: "Bitte einen Mandanten auswählen." };
  }
  if (!getCampaignById(campid)) {
    return { ok: false, error: "Kampagne wurde nicht gefunden." };
  }
  db.update(campaigns)
    .set({ name: trimmedName, date: date.trim(), mandantid })
    .where(eq(campaigns.campid, campid))
    .run();
  revalidateAdmin();
  return { ok: true, data: null };
}

export async function deleteCampaign(campid: number): Promise<ActionResult<null>> {
  const count = countTidsForCampaign(campid);
  if (count > 0) {
    return {
      ok: false,
      error: `Kampagne kann nicht gelöscht werden: ${count} Tracking-ID(s) verweisen noch darauf.`,
    };
  }
  db.delete(campaigns).where(eq(campaigns.campid, campid)).run();
  revalidateAdmin();
  return { ok: true, data: null };
}

// ---------- Sites ----------

export async function createSite(
  name: string,
): Promise<ActionResult<{ siteid: number }>> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { ok: false, error: "Bitte einen Namen angeben." };
  }
  const siteid = insertSiteWithNextId(trimmedName);
  revalidateAdmin();
  return { ok: true, data: { siteid } };
}

export async function updateSite(
  siteid: number,
  name: string,
): Promise<ActionResult<null>> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { ok: false, error: "Bitte einen Namen angeben." };
  }
  if (!getSiteById(siteid)) {
    return { ok: false, error: "Site wurde nicht gefunden." };
  }
  db.update(sites).set({ name: trimmedName }).where(eq(sites.siteid, siteid)).run();
  revalidateAdmin();
  return { ok: true, data: null };
}

export async function deleteSite(siteid: number): Promise<ActionResult<null>> {
  const count = countTidsForSite(siteid);
  if (count > 0) {
    return {
      ok: false,
      error: `Site kann nicht gelöscht werden: ${count} Tracking-ID(s) verweisen noch darauf.`,
    };
  }
  db.transaction((tx) => {
    tx.delete(siteMediums).where(eq(siteMediums.siteid, siteid)).run();
    tx.delete(sites).where(eq(sites.siteid, siteid)).run();
  });
  revalidateAdmin();
  return { ok: true, data: null };
}

export async function updateSiteVkclkid(
  siteid: number,
  vkclkidTemplate: string,
): Promise<ActionResult<null>> {
  if (!getSiteById(siteid)) {
    return { ok: false, error: "Site wurde nicht gefunden." };
  }
  db.update(sites)
    .set({ vkclkidTemplate: vkclkidTemplate.trim() || null })
    .where(eq(sites.siteid, siteid))
    .run();
  revalidateAdmin();
  return { ok: true, data: null };
}

// ---------- Medien ----------

export async function createMedium(
  name: string,
): Promise<ActionResult<{ meid: number }>> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { ok: false, error: "Bitte einen Namen angeben." };
  }
  const meid = insertMediumWithNextId(trimmedName);
  revalidateAdmin();
  return { ok: true, data: { meid } };
}

export async function updateMedium(
  meid: number,
  name: string,
): Promise<ActionResult<null>> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { ok: false, error: "Bitte einen Namen angeben." };
  }
  if (!getMediumById(meid)) {
    return { ok: false, error: "Medium wurde nicht gefunden." };
  }
  db.update(mediums).set({ name: trimmedName }).where(eq(mediums.meid, meid)).run();
  revalidateAdmin();
  return { ok: true, data: null };
}

export async function deleteMedium(meid: number): Promise<ActionResult<null>> {
  const count = countTidsForMedium(meid);
  if (count > 0) {
    return {
      ok: false,
      error: `Medium kann nicht gelöscht werden: ${count} Tracking-ID(s) verweisen noch darauf.`,
    };
  }
  db.transaction((tx) => {
    tx.delete(siteMediums).where(eq(siteMediums.meid, meid)).run();
    tx.delete(mediums).where(eq(mediums.meid, meid)).run();
  });
  revalidateAdmin();
  return { ok: true, data: null };
}

export async function setMediumSites(
  meid: number,
  siteIds: number[],
): Promise<ActionResult<null>> {
  if (!getMediumById(meid)) {
    return { ok: false, error: "Medium wurde nicht gefunden." };
  }
  const validSiteIds = new Set(getSites().map((s) => s.siteid));
  const uniqueSiteIds = Array.from(new Set(siteIds));
  for (const id of uniqueSiteIds) {
    if (!validSiteIds.has(id)) {
      return { ok: false, error: `Site ${id} existiert nicht.` };
    }
  }
  db.transaction((tx) => {
    tx.delete(siteMediums).where(eq(siteMediums.meid, meid)).run();
    if (uniqueSiteIds.length > 0) {
      tx.insert(siteMediums)
        .values(uniqueSiteIds.map((siteid) => ({ siteid, meid })))
        .run();
    }
  });
  revalidateAdmin();
  return { ok: true, data: null };
}

// ---------- Tracking-IDs ----------

/**
 * Unlike the other admin.ts actions, this is reachable from "/" (the
 * Generator + Verlauf page), which middleware.ts leaves open to both
 * roles — so the admin check has to happen in here, not just in the UI
 * that hides the delete button for non-admins.
 */
export async function deleteTid(tid: number): Promise<ActionResult<null>> {
  const role = (await cookies()).get(SESSION_COOKIE)?.value;
  if (role !== "admin") {
    return { ok: false, error: "Nicht berechtigt." };
  }
  db.delete(tids).where(eq(tids.tid, tid)).run();
  revalidateAdmin();
  return { ok: true, data: null };
}
