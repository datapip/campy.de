"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { campaigns, mediums, sites } from "@/lib/db/schema";
import {
  insertCampaignWithNextId,
  insertMediumWithNextId,
  insertSiteWithNextId,
} from "@/lib/db/ids";
import {
  countTidsForCampaign,
  countTidsForMedium,
  countTidsForSite,
  getCampaignById,
  getMediumById,
  getSiteById,
} from "@/lib/db/queries";
import { isValidCampaignDate } from "@/lib/format";
import type { ActionResult } from "./types";

function revalidateAdmin() {
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/verlauf");
}

// ---------- Kampagnen ----------

export async function createCampaign(
  name: string,
  date: string,
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
  const campid = insertCampaignWithNextId(trimmedName, date.trim());
  revalidateAdmin();
  return { ok: true, data: { campid } };
}

export async function updateCampaign(
  campid: number,
  name: string,
  date: string,
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
  if (!getCampaignById(campid)) {
    return { ok: false, error: "Kampagne wurde nicht gefunden." };
  }
  db.update(campaigns)
    .set({ name: trimmedName, date: date.trim() })
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
  db.delete(sites).where(eq(sites.siteid, siteid)).run();
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
  db.delete(mediums).where(eq(mediums.meid, meid)).run();
  revalidateAdmin();
  return { ok: true, data: null };
}
