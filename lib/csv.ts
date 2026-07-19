import Papa from "papaparse";

const BOM = "﻿";

export type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
  errors: string[];
};

/**
 * Parses CSV text, auto-detecting `;` or `,` as the delimiter (German Excel
 * exports use `;`). Uses papaparse rather than hand-rolled splitting so
 * quoted fields are handled correctly.
 */
export function parseCsv(text: string): ParsedCsv {
  const withoutBom = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const result = Papa.parse<Record<string, string>>(withoutBom, {
    header: true,
    skipEmptyLines: true,
    delimitersToGuess: [";", ",", "\t"],
  });

  return {
    headers: result.meta.fields ?? [],
    rows: result.data,
    errors: result.errors.map(
      (e) => `Zeile ${e.row != null ? e.row + 2 : "?"}: ${e.message}`,
    ),
  };
}

/**
 * Builds a semicolon-separated CSV string with a UTF-8 BOM, for German
 * Excel compatibility.
 */
export function unparseCsv(
  fields: string[],
  rows: (string | number | null | undefined)[][],
): string {
  const csv = Papa.unparse(
    { fields, data: rows.map((r) => r.map((v) => (v == null ? "" : v))) },
    { delimiter: ";" },
  );
  return BOM + csv;
}

export const BULK_UPLOAD_TEMPLATE_COLUMNS = [
  "url",
  "note",
  "campid",
  "siteid",
  "meid",
] as const;

export function buildBulkUploadTemplate(): string {
  return unparseCsv(
    [...BULK_UPLOAD_TEMPLATE_COLUMNS],
    [
      [
        "https://www.example.de/lp/hochwasser.html",
        "Motiv spielende Kinder",
        "1203",
        "104",
        "29",
      ],
    ],
  );
}
