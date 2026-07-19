"use server";

import { revalidatePath } from "next/cache";
import { getCampaignById, getMediumById, getSiteById } from "@/lib/db/queries";
import { insertTidWithNextId } from "@/lib/db/ids";
import { buildTrackingUrl, validateBaseUrl } from "@/lib/url-builder";
import type { ActionResult } from "./types";

export type GenerateUrlInput = {
  campid: number;
  siteid: number;
  meid: number;
  note: string;
  baseUrl: string;
};

export type GenerateUrlResult = {
  tid: number;
  generatedUrl: string;
};

export async function generateUrl(
  input: GenerateUrlInput,
): Promise<ActionResult<GenerateUrlResult>> {
  if (!input.campid) {
    return { ok: false, error: "Bitte eine Kampagne auswählen." };
  }
  if (!input.siteid) {
    return { ok: false, error: "Bitte einen Site auswählen." };
  }
  if (!input.meid) {
    return { ok: false, error: "Bitte ein Medium auswählen." };
  }

  const campaign = getCampaignById(input.campid);
  if (!campaign) {
    return { ok: false, error: "Die gewählte Kampagne existiert nicht mehr." };
  }
  const site = getSiteById(input.siteid);
  if (!site) {
    return { ok: false, error: "Der gewählte Site existiert nicht mehr." };
  }
  const medium = getMediumById(input.meid);
  if (!medium) {
    return { ok: false, error: "Das gewählte Medium existiert nicht mehr." };
  }

  const validated = validateBaseUrl(input.baseUrl);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const note = input.note.trim() || null;
  const baseUrl = validated.url.toString();

  const { tid, generatedUrl } = insertTidWithNextId({
    note,
    campid: campaign.campid,
    siteid: site.siteid,
    meid: medium.meid,
    baseUrl,
    buildUrl: (assignedTid) =>
      buildTrackingUrl(baseUrl, {
        tid: assignedTid,
        campid: campaign.campid,
        siteid: site.siteid,
        meid: medium.meid,
        vkclkidTemplate: site.vkclkidTemplate,
      }),
  });

  revalidatePath("/");
  revalidatePath("/verlauf");
  revalidatePath("/admin");

  return { ok: true, data: { tid, generatedUrl } };
}
