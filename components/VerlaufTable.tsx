"use client";

import { useMemo, useState } from "react";
import type { TidWithRelations } from "@/lib/db/queries";
import { unparseCsv } from "@/lib/csv";
import { downloadTextFile } from "@/lib/download";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CopyButton } from "./CopyButton";

export function VerlaufTable({ rows }: { rows: TidWithRelations[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        String(r.tid).includes(q) ||
        (r.note ?? "").toLowerCase().includes(q) ||
        r.generatedUrl.toLowerCase().includes(q),
    );
  }, [rows, search]);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          type="text"
          className="max-w-sm"
          placeholder="Suche nach tid, Notiz oder URL…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button type="button" variant="outline" onClick={handleExport}>
          Export CSV
        </Button>
      </div>

      <Card className="overflow-x-auto p-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>tid</TableHead>
                <TableHead>Notiz</TableHead>
                <TableHead>Kampagne</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Medium</TableHead>
                <TableHead>Generierte URL</TableHead>
                <TableHead>Erstellt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.tid}>
                  <TableCell>{r.tid}</TableCell>
                  <TableCell>{r.note ?? ""}</TableCell>
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
                    colSpan={7}
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
    </div>
  );
}
