"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createMandant,
  deleteMandant,
  updateMandant,
} from "@/app/actions/admin";
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

type Mandant = { mandantid: number; name: string; createdAt: string };

export function MandantenManager({ rows }: { rows: Mandant[] }) {
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
      const res = await createMandant(newName);
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

  function startEdit(row: Mandant) {
    setEditingId(row.mandantid);
    setEditName(row.name);
    setRowError(null);
  }

  async function saveEdit(mandantid: number) {
    setBusyId(mandantid);
    setRowError(null);
    try {
      const res = await updateMandant(mandantid, editName);
      if (!res.ok) {
        setRowError({ id: mandantid, message: res.error });
        return;
      }
      setEditingId(null);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(mandantid: number) {
    setBusyId(mandantid);
    setRowError(null);
    try {
      const res = await deleteMandant(mandantid);
      if (!res.ok) {
        setRowError({ id: mandantid, message: res.error });
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  function handleExport() {
    const csv = unparseCsv(
      ["mandantid", "name", "createdAt"],
      rows.map((r) => [r.mandantid, r.name, r.createdAt]),
    );
    downloadTextFile("mandanten.csv", csv);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Neuer Mandant</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input
                placeholder="Name (z. B. VKB)"
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
          <CardTitle className="text-sm">Mandanten ({rows.length})</CardTitle>
          <Button type="button" variant="outline" onClick={handleExport}>
            Als CSV exportieren
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>mandantid</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Erstellt</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const isEditing = editingId === row.mandantid;
                  return (
                    <TableRow key={row.mandantid}>
                      <TableCell>{row.mandantid}</TableCell>
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
                              disabled={busyId === row.mandantid}
                              onClick={() => saveEdit(row.mandantid)}
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
                              disabled={busyId === row.mandantid}
                              onClick={() => handleDelete(row.mandantid)}
                            >
                              Löschen
                            </Button>
                          </div>
                        )}
                        {rowError?.id === row.mandantid && (
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
                      Keine Mandanten vorhanden.
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
