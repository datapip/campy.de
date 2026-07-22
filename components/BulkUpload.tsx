"use client";

import { useMemo, useRef, useState } from "react";
import {
  bulkGenerate,
  bulkValidate,
  type BulkGenerateResultRow,
  type BulkPreviewRow,
} from "@/app/actions/bulk";
import { buildBulkUploadTemplate, unparseCsv } from "@/lib/csv";
import { downloadTextFile } from "@/lib/download";
import { formatCampaign, formatMedium, formatSite } from "@/lib/format";
import { filterMediumsForSite, type MediumSiteMap } from "@/lib/site-mediums";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Campaign = {
  campid: number;
  name: string;
  date: string;
  mandantName: string | null;
};
type Site = { siteid: number; name: string };
type Medium = { meid: number; name: string };

export function BulkUpload({
  campaigns,
  sites,
  mediums,
  mediumSiteMap,
}: {
  campaigns: Campaign[];
  sites: Site[];
  mediums: Medium[];
  mediumSiteMap: MediumSiteMap;
}) {
  const [campid, setCampid] = useState("");
  const [siteid, setSiteid] = useState("");
  const [meid, setMeid] = useState("");

  const allowedMediums = useMemo(
    () =>
      siteid ? filterMediumsForSite(mediums, mediumSiteMap, Number(siteid)) : mediums,
    [siteid, mediums, mediumSiteMap],
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<BulkPreviewRow[] | null>(null);
  const [results, setResults] = useState<BulkGenerateResultRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleTemplateDownload() {
    downloadTextFile("vorlage_bulk_upload.csv", buildBulkUploadTemplate());
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResults(null);
    setPreview(null);
    setFileName(file.name);
    setLoading(true);
    try {
      const text = await file.text();
      const res = await bulkValidate(text, {
        campid: campid ? Number(campid) : null,
        siteid: siteid ? Number(siteid) : null,
        meid: meid ? Number(meid) : null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPreview(res.data.rows);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    if (!preview) return;
    setError(null);
    setLoading(true);
    try {
      const res = await bulkGenerate(preview);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResults(res.data);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }

  function handleResultsDownload() {
    if (!results) return;
    const csv = unparseCsv(
      ["url", "note", "campid", "siteid", "meid", "tid", "generatedUrl"],
      results.map((r) => [
        r.url,
        r.note,
        r.campid,
        r.siteid,
        r.meid,
        r.tid,
        r.generatedUrl,
      ]),
    );
    downloadTextFile("bulk_ergebnis.csv", csv);
  }

  function reset() {
    setFileName(null);
    setPreview(null);
    setResults(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const hasErrors = preview?.some((r) => r.errors.length > 0) ?? false;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Standardwerte für Zeilen, die keine eigene Kampagne/Site/Medium angeben.
            Diese können pro Zeile in der CSV-Datei überschrieben werden.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-campid">Kampagne (Standard)</Label>
              <Select value={campid} onValueChange={setCampid}>
                <SelectTrigger id="bulk-campid" className="w-full">
                  <SelectValue placeholder="(aus Datei)" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => (
                    <SelectItem key={c.campid} value={String(c.campid)}>
                      {formatCampaign(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bulk-siteid">Site (Standard)</Label>
              <Select
                value={siteid}
                onValueChange={(value) => {
                  setSiteid(value);
                  const stillAllowed = filterMediumsForSite(
                    mediums,
                    mediumSiteMap,
                    Number(value),
                  ).some((m) => String(m.meid) === meid);
                  if (!stillAllowed) setMeid("");
                }}
              >
                <SelectTrigger id="bulk-siteid" className="w-full">
                  <SelectValue placeholder="(aus Datei)" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.siteid} value={String(s.siteid)}>
                      {formatSite(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bulk-meid">Medium (Standard)</Label>
              <Select value={meid} onValueChange={setMeid}>
                <SelectTrigger id="bulk-meid" className="w-full">
                  <SelectValue placeholder="(aus Datei)" />
                </SelectTrigger>
                <SelectContent>
                  {allowedMediums.map((m) => (
                    <SelectItem key={m.meid} value={String(m.meid)}>
                      {formatMedium(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={handleTemplateDownload}>
              Vorlage herunterladen
            </Button>
            <Button type="button" variant="outline" asChild>
              <label className="cursor-pointer">
                CSV-Datei auswählen
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </Button>
            {fileName && (
              <span className="text-sm text-muted-foreground">{fileName}</span>
            )}
            {(preview || results) && (
              <Button type="button" variant="outline" onClick={reset}>
                Zurücksetzen
              </Button>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {loading && (
            <p className="text-sm text-muted-foreground">Wird verarbeitet…</p>
          )}
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">
              Vorschau ({preview.length} Zeile{preview.length === 1 ? "" : "n"})
            </CardTitle>
            <Button
              type="button"
              disabled={hasErrors || loading}
              onClick={handleGenerate}
            >
              Alle URLs generieren
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasErrors && (
              <p className="text-sm text-destructive">
                Es wurden Fehler gefunden. Bitte die Datei korrigieren und erneut
                hochladen — es wird nichts importiert, solange Fehler bestehen.
              </p>
            )}
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Notiz</TableHead>
                    <TableHead>Kampagne</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Medium</TableHead>
                    <TableHead>Fehler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row) => (
                    <TableRow
                      key={row.rowIndex}
                      className={cn(row.errors.length && "bg-destructive/5")}
                    >
                      <TableCell>{row.rowIndex + 1}</TableCell>
                      <TableCell className="max-w-xs truncate font-mono text-xs">
                        {row.url}
                      </TableCell>
                      <TableCell>{row.note ?? ""}</TableCell>
                      <TableCell>{row.campid ?? "–"}</TableCell>
                      <TableCell>{row.siteid ?? "–"}</TableCell>
                      <TableCell>{row.meid ?? "–"}</TableCell>
                      <TableCell className="text-destructive">
                        {row.errors.join(" ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {results && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">
              {results.length} URL{results.length === 1 ? "" : "s"} generiert
            </CardTitle>
            <Button type="button" variant="outline" onClick={handleResultsDownload}>
              Ergebnisse als CSV herunterladen
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>tid</TableHead>
                    <TableHead>Notiz</TableHead>
                    <TableHead>Generierte URL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((row) => (
                    <TableRow key={row.tid}>
                      <TableCell>{row.tid}</TableCell>
                      <TableCell>{row.note ?? ""}</TableCell>
                      <TableCell className="max-w-md truncate font-mono text-xs">
                        {row.generatedUrl}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
