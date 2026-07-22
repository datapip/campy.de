import { desc, eq, max } from "drizzle-orm";
import type { MediumSiteMap } from "@/lib/site-mediums";
import { db } from "./client";
import { campaigns, mandanten, mediums, siteMediums, sites, tids } from "./schema";

export type CampaignWithMandant = {
  campid: number;
  name: string;
  date: string;
  mandantid: number | null;
  mandantName: string | null;
  createdAt: string;
};

const campaignWithMandantSelection = {
  campid: campaigns.campid,
  name: campaigns.name,
  date: campaigns.date,
  mandantid: campaigns.mandantid,
  mandantName: mandanten.name,
  createdAt: campaigns.createdAt,
};

export function getCampaigns(): CampaignWithMandant[] {
  return db
    .select(campaignWithMandantSelection)
    .from(campaigns)
    .leftJoin(mandanten, eq(campaigns.mandantid, mandanten.mandantid))
    .orderBy(desc(campaigns.campid))
    .all();
}

export function getMandanten() {
  return db.select().from(mandanten).orderBy(desc(mandanten.mandantid)).all();
}

export function getSites() {
  return db.select().from(sites).orderBy(desc(sites.siteid)).all();
}

export function getMediums() {
  return db.select().from(mediums).orderBy(desc(mediums.meid)).all();
}

export function getCampaignById(campid: number): CampaignWithMandant | undefined {
  return db
    .select(campaignWithMandantSelection)
    .from(campaigns)
    .leftJoin(mandanten, eq(campaigns.mandantid, mandanten.mandantid))
    .where(eq(campaigns.campid, campid))
    .get();
}

export function getMandantById(mandantid: number) {
  return db.select().from(mandanten).where(eq(mandanten.mandantid, mandantid)).get();
}

export function getSiteById(siteid: number) {
  return db.select().from(sites).where(eq(sites.siteid, siteid)).get();
}

export function getMediumById(meid: number) {
  return db.select().from(mediums).where(eq(mediums.meid, meid)).get();
}

export type TidWithRelations = {
  tid: number;
  note: string | null;
  baseUrl: string;
  generatedUrl: string;
  createdAt: string;
  campid: number;
  campaignName: string;
  campaignDate: string;
  campaignMandantName: string | null;
  siteid: number;
  siteName: string;
  meid: number;
  mediumName: string;
};

export function getTidsWithRelations(): TidWithRelations[] {
  return db
    .select({
      tid: tids.tid,
      note: tids.note,
      baseUrl: tids.baseUrl,
      generatedUrl: tids.generatedUrl,
      createdAt: tids.createdAt,
      campid: campaigns.campid,
      campaignName: campaigns.name,
      campaignDate: campaigns.date,
      campaignMandantName: mandanten.name,
      siteid: sites.siteid,
      siteName: sites.name,
      meid: mediums.meid,
      mediumName: mediums.name,
    })
    .from(tids)
    .innerJoin(campaigns, eq(tids.campid, campaigns.campid))
    .innerJoin(sites, eq(tids.siteid, sites.siteid))
    .innerJoin(mediums, eq(tids.meid, mediums.meid))
    .leftJoin(mandanten, eq(campaigns.mandantid, mandanten.mandantid))
    .orderBy(desc(tids.tid))
    .all();
}

export function countTidsForCampaign(campid: number): number {
  return db.select({ tid: tids.tid }).from(tids).where(eq(tids.campid, campid)).all()
    .length;
}

export function countCampaignsForMandant(mandantid: number): number {
  return db
    .select({ campid: campaigns.campid })
    .from(campaigns)
    .where(eq(campaigns.mandantid, mandantid))
    .all().length;
}

export function countTidsForSite(siteid: number): number {
  return db.select({ tid: tids.tid }).from(tids).where(eq(tids.siteid, siteid)).all()
    .length;
}

export function countTidsForMedium(meid: number): number {
  return db.select({ tid: tids.tid }).from(tids).where(eq(tids.meid, meid)).all()
    .length;
}

/** Groups site_mediums rows by meid for the whole table in one query. */
export function getMediumSiteMap(): MediumSiteMap {
  const rows = db.select().from(siteMediums).all();
  const map: MediumSiteMap = {};
  for (const row of rows) {
    (map[row.meid] ??= []).push(row.siteid);
  }
  return map;
}

export function getSiteIdsForMedium(meid: number): number[] {
  return db
    .select({ siteid: siteMediums.siteid })
    .from(siteMediums)
    .where(eq(siteMediums.meid, meid))
    .all()
    .map((r) => r.siteid);
}

export function getMaxIds() {
  const campRow = db.select({ max: max(campaigns.campid) }).from(campaigns).get();
  const siteRow = db.select({ max: max(sites.siteid) }).from(sites).get();
  const mediumRow = db.select({ max: max(mediums.meid) }).from(mediums).get();
  const tidRow = db.select({ max: max(tids.tid) }).from(tids).get();
  return {
    campid: campRow?.max ?? 0,
    siteid: siteRow?.max ?? 0,
    meid: mediumRow?.max ?? 0,
    tid: tidRow?.max ?? 0,
  };
}
