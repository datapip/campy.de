"use client";

import { useEffect, useMemo, useState } from "react";
import type { TidWithRelations } from "@/lib/db/queries";
import { unparseCsv } from "@/lib/csv";
import { downloadTextFile } from "@/lib/download";
import { formatDateTime } from "@/lib/format";
import { buildSaintExport } from "@/lib/saint";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CopyButton } from "./CopyButton";
import { QrCodeButton } from "./QrCodeButton";

const PAGE_SIZE = 50;

export function VerlaufTable({
  rows,
  isAdmin,
}: {
  rows: TidWithRelations[];
  isAdmin: boolean;
}) {
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q) {
        const matches =
          String(r.tid).includes(q) ||
          (r.note ?? "").toLowerCase().includes(q) ||
          r.generatedUrl.toLowerCase().includes(q);
        if (!matches) return false;
      }
      // createdAt is stored as "YYYY-MM-DD HH:MM:SS" (UTC); comparing the
      // date portion lexicographically against the YYYY-MM-DD range inputs
      // is sufficient for this internal tool's day-granularity filtering.
      const datePart = r.createdAt.slice(0, 10);
      if (fromDate && datePart < fromDate) return false;
      if (toDate && datePart > toDate) return false;
      return true;
    });
  }, [rows, search, fromDate, toDate]);

  useEffect(() => {
    setPage(1);
  }, [search, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function handleExport() {
    const csv = unparseCsv(
      [
        "tid",
        "note",
        "campid",
        "campaignName",
        "siteid",
        "siteName",
        "meid",
        "mediumName",
        "baseUrl",
        "generatedUrl",
        "createdAt",
      ],
      filtered.map((r) => [
        r.tid,
        r.note,
        r.campid,
        r.campaignName,
        r.siteid,
        r.siteName,
        r.meid,
        r.mediumName,
        r.baseUrl,
        r.generatedUrl,
        r.createdAt,
      ]),
    );
    downloadTextFile("verlauf.csv", csv);
  }

  function handleSaintExport() {
    const tab = buildSaintExport(filtered);
    downloadTextFile(
      "saint-export.tab",
      tab,
      "text/tab-separated-values;charset=utf-8;",
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Input
          type="text"
          className="max-w-sm"
          placeholder="Suche nach tid, Notiz oder URL…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="verlauf-from">Von</Label>
            <Input
              id="verlauf-from"
              type="date"
              className="w-auto"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="verlauf-to">Bis</Label>
            <Input
              id="verlauf-to"
              type="date"
              className="w-auto"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <Button type="button" variant="outline" onClick={handleExport}>
            Export CSV
          </Button>
          {isAdmin && (
            <Button type="button" variant="outline" onClick={handleSaintExport}>
              Export SAINT
            </Button>
          )}
        </div>
      </div>

      <Card className="overflow-x-auto">
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tracking ID</TableHead>
                <TableHead>Kampagnen ID</TableHead>
                <TableHead>Seiten ID</TableHead>
                <TableHead>Medium ID</TableHead>
                <TableHead>Generierte URL</TableHead>
                <TableHead>Erstellt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((r) => (
                <TableRow key={r.tid}>
                  <TableCell>
                    {r.tid}
                    {r.note ? ` / ${r.note}` : ""}
                  </TableCell>
                  <TableCell>
                    {r.campid} / {r.campaignName} - {r.campaignDate}
                  </TableCell>
                  <TableCell>
                    {r.siteid} / {r.siteName}
                  </TableCell>
                  <TableCell>
                    {r.meid} / {r.mediumName}
                  </TableCell>
                  <TableCell>
                    <div className="flex max-w-md items-center gap-2">
                      <span className="truncate font-mono text-xs">
                        {r.generatedUrl}
                      </span>
                      <CopyButton text={r.generatedUrl} label="Kopieren" />
                      <QrCodeButton
                        url={r.generatedUrl}
                        filename={`qr-tid-${r.tid}.png`}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(r.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-6 text-center text-muted-foreground"
                  >
                    Keine Einträge gefunden.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {filtered.length === 0
            ? "0 Einträge"
            : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} von ${filtered.length} Einträgen`}
        </p>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Zurück
          </Button>
          <span className="text-sm text-muted-foreground">
            Seite {currentPage} von {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Weiter
          </Button>
        </div>
      </div>
    </div>
  );
}
