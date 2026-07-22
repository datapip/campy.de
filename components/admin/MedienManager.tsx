"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createMedium,
  deleteMedium,
  setMediumSites,
  updateMedium,
} from "@/app/actions/admin";
import { unparseCsv } from "@/lib/csv";
import { downloadTextFile } from "@/lib/download";
import { formatDateTime, formatSite } from "@/lib/format";
import type { MediumSiteMap } from "@/lib/site-mediums";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Medium = { meid: number; name: string; createdAt: string };
type Site = { siteid: number; name: string };

export function MedienManager({
  rows,
  sites,
  mediumSiteMap,
}: {
  rows: Medium[];
  sites: Site[];
  mediumSiteMap: MediumSiteMap;
}) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [newSiteIds, setNewSiteIds] = useState<number[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editSiteIds, setEditSiteIds] = useState<number[]>([]);
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(
    null,
  );
  const [busyId, setBusyId] = useState<number | null>(null);

  function toggleNewSite(siteid: number, checked: boolean) {
    setNewSiteIds((prev) =>
      checked ? [...prev, siteid] : prev.filter((id) => id !== siteid),
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const res = await createMedium(newName);
      if (!res.ok) {
        setCreateError(res.error);
        return;
      }
      if (newSiteIds.length > 0) {
        const sitesRes = await setMediumSites(res.data.meid, newSiteIds);
        if (!sitesRes.ok) {
          setCreateError(
            `Medium wurde angelegt, aber Sites konnten nicht zugeordnet werden: ${sitesRes.error}`,
          );
          return;
        }
      }
      setNewName("");
      setNewSiteIds([]);
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  function startEdit(row: Medium) {
    setEditingId(row.meid);
    setEditName(row.name);
    setEditSiteIds(mediumSiteMap[row.meid] ?? []);
    setRowError(null);
  }

  function toggleEditSite(siteid: number, checked: boolean) {
    setEditSiteIds((prev) =>
      checked ? [...prev, siteid] : prev.filter((id) => id !== siteid),
    );
  }

  async function saveEdit(meid: number) {
    setBusyId(meid);
    setRowError(null);
    try {
      const [nameRes, sitesRes] = await Promise.all([
        updateMedium(meid, editName),
        setMediumSites(meid, editSiteIds),
      ]);
      if (!nameRes.ok) {
        setRowError({ id: meid, message: nameRes.error });
        return;
      }
      if (!sitesRes.ok) {
        setRowError({ id: meid, message: sitesRes.error });
        return;
      }
      setEditingId(null);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(meid: number) {
    setBusyId(meid);
    setRowError(null);
    try {
      const res = await deleteMedium(meid);
      if (!res.ok) {
        setRowError({ id: meid, message: res.error });
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  function handleExport() {
    const csv = unparseCsv(
      ["meid", "name", "createdAt"],
      rows.map((r) => [r.meid, r.name, r.createdAt]),
    );
    downloadTextFile("medien.csv", csv);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Neues Medium</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input
                placeholder="Name (z. B. Text Ad)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Button type="submit" disabled={creating}>
                Hinzufügen
              </Button>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm text-muted-foreground">
                Zugeordnete Sites (optional — leer lassen für &quot;Alle Sites&quot;)
              </p>
              <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border p-2">
                {sites.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Keine Sites vorhanden.
                  </p>
                )}
                {sites.map((s) => (
                  <label key={s.siteid} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={newSiteIds.includes(s.siteid)}
                      onCheckedChange={(checked) =>
                        toggleNewSite(s.siteid, checked === true)
                      }
                    />
                    {formatSite(s)}
                  </label>
                ))}
              </div>
            </div>
            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Medien ({rows.length})</CardTitle>
          <Button type="button" variant="outline" onClick={handleExport}>
            Als CSV exportieren
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>meid</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Zugeordnete Sites</TableHead>
                  <TableHead>Erstellt</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const isEditing = editingId === row.meid;
                  const assignedSiteIds = mediumSiteMap[row.meid] ?? [];
                  return (
                    <TableRow key={row.meid}>
                      <TableCell>{row.meid}</TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                          />
                        ) : (
                          row.name
                        )}
                      </TableCell>
                      <TableCell className="min-w-[14rem]">
                        {isEditing ? (
                          <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border p-2">
                            {sites.length === 0 && (
                              <p className="text-sm text-muted-foreground">
                                Keine Sites vorhanden.
                              </p>
                            )}
                            {sites.map((s) => (
                              <label
                                key={s.siteid}
                                className="flex items-center gap-2 text-sm"
                              >
                                <Checkbox
                                  checked={editSiteIds.includes(s.siteid)}
                                  onCheckedChange={(checked) =>
                                    toggleEditSite(s.siteid, checked === true)
                                  }
                                />
                                {formatSite(s)}
                              </label>
                            ))}
                          </div>
                        ) : assignedSiteIds.length === 0 ? (
                          <span className="text-sm text-muted-foreground">
                            Alle Sites
                          </span>
                        ) : (
                          <span className="text-sm">
                            {sites
                              .filter((s) => assignedSiteIds.includes(s.siteid))
                              .map((s) => formatSite(s))
                              .join(", ")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(row.createdAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              disabled={busyId === row.meid}
                              onClick={() => saveEdit(row.meid)}
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
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => startEdit(row)}
                            >
                              Bearbeiten
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              disabled={busyId === row.meid}
                              onClick={() => handleDelete(row.meid)}
                            >
                              Löschen
                            </Button>
                          </div>
                        )}
                        {rowError?.id === row.meid && (
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
                      colSpan={5}
                      className="py-6 text-center text-muted-foreground"
                    >
                      Keine Medien vorhanden.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
