export type CampaignLike = { campid: number; name: string; date: string };
export type SiteLike = { siteid: number; name: string };
export type MediumLike = { meid: number; name: string };

export function formatCampaign(c: CampaignLike): string {
  return `${c.campid} / ${c.name} - ${c.date}`;
}

export function formatSite(s: SiteLike): string {
  return `${s.siteid} / ${s.name}`;
}

export function formatMedium(m: MediumLike): string {
  return `${m.meid} / ${m.name}`;
}

export function formatDateTime(iso: string): string {
  // Stored as SQLite `datetime('now')`: "YYYY-MM-DD HH:MM:SS" (UTC).
  const normalized = iso.includes("T") ? iso : iso.replace(" ", "T") + "Z";
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const CAMPAIGN_DATE_RE = /^(0[1-9]|1[0-2])\.\d{4}$/;

export function isValidCampaignDate(value: string): boolean {
  return CAMPAIGN_DATE_RE.test(value.trim());
}
