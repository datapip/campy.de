import Papa from "papaparse";
import type { TidWithRelations } from "@/lib/db/queries";

const SAINT_COLUMNS = [
  "Key",
  "tid",
  "tid^Tracking ID - named",
  "campid",
  "campid^Kampagnen ID - named",
  "siteid",
  "siteid^Site ID - named",
  "meid",
  "meid^Medium ID - named",
] as const;

// Only the "named" classification columns are quoted; raw IDs and the tid's
// note (which follows its own underscore-slug convention, not free text)
// are left unquoted, matching Adobe's SAINT export samples.
const SAINT_QUOTES = [false, false, false, false, true, false, true, false, true];

function formatSaintTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Converts the app's "MM.YYYY" campaign date to SAINT's "MM/YYYY". */
function toSaintCampaignPeriod(date: string): string {
  return date.replace(".", "/");
}

/**
 * Builds a SiteCatalyst SAINT classification import file (tab-separated,
 * `.tab`) for the given tids, so it can be uploaded directly as an Adobe
 * Analytics classification import.
 */
export function buildSaintExport(
  rows: TidWithRelations[],
  generatedAt: Date = new Date(),
): string {
  const preHeader = [
    ["## SC", "SiteCatalyst SAINT Import File", "v:2.1"],
    [
      "## SC",
      "'## SC' indicates a SiteCatalyst pre-process header. Please do not remove these lines.",
    ],
    ["## SC", `D:${formatSaintTimestamp(generatedAt)}`, "A:0:0"],
  ]
    .map((line) => line.join("\t"))
    .join("\r\n");

  const header = SAINT_COLUMNS.join("\t");

  const body = Papa.unparse(
    rows.map((r) => [
      `${r.tid}:${r.campid}:${r.siteid}:${r.meid}`,
      r.tid,
      r.note ?? "",
      r.campid,
      `${r.campaignName} - ${toSaintCampaignPeriod(r.campaignDate)}`,
      r.siteid,
      r.siteName,
      r.meid,
      r.mediumName,
    ]),
    { delimiter: "\t", quotes: SAINT_QUOTES },
  );

  return `${preHeader}\r\n${header}\r\n${body}\r\n`;
}
