"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createMedium, deleteMedium, updateMedium } from "@/app/actions/admin";
import { unparseCsv } from "@/lib/csv";
import { downloadTextFile } from "@/lib/download";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function MedienManager({ rows }: { rows: Medium[] }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(
    null,
  );
  const [busyId, setBusyId] = useState<number | null>(null);

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
      setNewName("");
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  function startEdit(row: Medium) {
    setEditingId(row.meid);
    setEditName(row.name);
    setRowError(null);
  }

  async function saveEdit(meid: number) {
    setBusyId(meid);
    setRowError(null);
    try {
      const res = await updateMedium(meid, editName);
      if (!res.ok) {
        setRowError({ id: meid, message: res.error });
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
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>meid</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Erstellt</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const isEditing = editingId === row.meid;
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
                      colSpan={4}
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
