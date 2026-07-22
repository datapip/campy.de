"use server";

import { revalidatePath } from "next/cache";
import {
  getCampaignById,
  getMediumById,
  getMediumSiteMap,
  getSiteById,
} from "@/lib/db/queries";
import { insertTidWithNextId } from "@/lib/db/ids";
import { syncConfigSnapshot } from "@/lib/config-sync";
import { checkUrlStatus, type UrlCheckResult } from "@/lib/http-check";
import { isMediumAllowedForSite } from "@/lib/site-mediums";
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

type ResolvedContext = {
  campaign: { campid: number };
  site: { siteid: number; vkclkidTemplate: string | null };
  medium: { meid: number };
};

/** Shared validation for campid/siteid/meid, used by both the preflight check and the actual generation. */
function resolveContext(input: {
  campid: number;
  siteid: number;
  meid: number;
}): ActionResult<ResolvedContext> {
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
  if (!isMediumAllowedForSite(medium.meid, site.siteid, getMediumSiteMap())) {
    return {
      ok: false,
      error: "Das gewählte Medium ist für diesen Site nicht zulässig.",
    };
  }

  return { ok: true, data: { campaign, site, medium } };
}

export type CheckTargetUrlInput = {
  campid: number;
  siteid: number;
  meid: number;
  baseUrl: string;
};

/**
 * Preflight check run when the user clicks "URL generieren", before any tid
 * is assigned. Builds a preview of the tracking URL (with a placeholder tid,
 * since the real one is only assigned transactionally at insert time) and
 * probes it, so the client can warn the user and ask for confirmation before
 * actually consuming a tid for a target that doesn't respond.
 */
export async function checkTargetUrl(
  input: CheckTargetUrlInput,
): Promise<ActionResult<UrlCheckResult>> {
  const context = resolveContext(input);
  if (!context.ok) {
    return context;
  }
  const { campaign, site, medium } = context.data;

  const validated = validateBaseUrl(input.baseUrl);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const previewUrl = buildTrackingUrl(validated.url.toString(), {
    tid: 0,
    campid: campaign.campid,
    siteid: site.siteid,
    meid: medium.meid,
    vkclkidTemplate: site.vkclkidTemplate,
  });

  const urlCheck = await checkUrlStatus(previewUrl);
  return { ok: true, data: urlCheck };
}

export async function generateUrl(
  input: GenerateUrlInput,
): Promise<ActionResult<GenerateUrlResult>> {
  const context = resolveContext(input);
  if (!context.ok) {
    return context;
  }
  const { campaign, site, medium } = context.data;

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

  syncConfigSnapshot();
  revalidatePath("/");
  revalidatePath("/admin");

  return { ok: true, data: { tid, generatedUrl } };
}
