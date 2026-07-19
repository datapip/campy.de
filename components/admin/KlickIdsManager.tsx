"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateSiteVkclkid } from "@/app/actions/admin";
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

type Site = { siteid: number; name: string; vkclkidTemplate: string | null };

export function KlickIdsManager({ rows }: { rows: Site[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTemplate, setEditTemplate] = useState("");
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(
    null,
  );
  const [busyId, setBusyId] = useState<number | null>(null);

  function startEdit(row: Site) {
    setEditingId(row.siteid);
    setEditTemplate(row.vkclkidTemplate ?? "");
    setRowError(null);
  }

  async function saveEdit(siteid: number) {
    setBusyId(siteid);
    setRowError(null);
    try {
      const res = await updateSiteVkclkid(siteid, editTemplate);
      if (!res.ok) {
        setRowError({ id: siteid, message: res.error });
        return;
      }
      setEditingId(null);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Manche Plattformen bieten einen eigenen Klick-ID-Parameter an (z. B.
          Google Ads ValueTrack oder der Facebook-Anzeigenparameter). Ist für
          einen Site ein Template hinterlegt, wird es als zusätzlicher
          „vkclkid“-Parameter an das Ende jeder generierten URL angehängt.
          Platzhalter wie <code className="font-mono">{"{campaignid}"}</code> oder{" "}
          <code className="font-mono">{"{{ad.id}}"}</code> werden unverändert
          übernommen — die jeweilige Plattform ersetzt sie beim Klick.
        </p>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>siteid</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>vkclkid-Template</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const isEditing = editingId === row.siteid;
                return (
                  <TableRow key={row.siteid}>
                    <TableCell>{row.siteid}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {isEditing ? (
                        <Input
                          className="font-mono text-xs"
                          value={editTemplate}
                          onChange={(e) => setEditTemplate(e.target.value)}
                          placeholder="z. B. {campaignid}_{adgroupid}_{creative}"
                        />
                      ) : (
                        row.vkclkidTemplate || "–"
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            disabled={busyId === row.siteid}
                            onClick={() => saveEdit(row.siteid)}
                          >
                            Speichern
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setEditingId(null)}
                          >
                            Abbrechen
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => startEdit(row)}
                        >
                          Bearbeiten
                        </Button>
                      )}
                      {rowError?.id === row.siteid && (
                        <p className="mt-1 text-sm text-destructive">
                          {rowError.message}
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-6 text-center text-muted-foreground"
                  >
                    Keine Sites vorhanden. Zuerst unter „Sites“ einen Site anlegen.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
