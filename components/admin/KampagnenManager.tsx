"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createCampaign,
  deleteCampaign,
  updateCampaign,
} from "@/app/actions/admin";
import { unparseCsv } from "@/lib/csv";
import { downloadTextFile } from "@/lib/download";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

type Campaign = {
  campid: number;
  name: string;
  date: string;
  mandantid: number | null;
  mandantName: string | null;
  createdAt: string;
};
type Mandant = { mandantid: number; name: string };

export function KampagnenManager({
  rows,
  mandanten,
}: {
  rows: Campaign[];
  mandanten: Mandant[];
}) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newMandantId, setNewMandantId] = useState(
    String(mandanten[0]?.mandantid ?? ""),
  );
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editMandantId, setEditMandantId] = useState("");
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(
    null,
  );
  const [busyId, setBusyId] = useState<number | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const res = await createCampaign(newName, newDate, Number(newMandantId));
      if (!res.ok) {
        setCreateError(res.error);
        return;
      }
      setNewName("");
      setNewDate("");
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  function startEdit(row: Campaign) {
    setEditingId(row.campid);
    setEditName(row.name);
    setEditDate(row.date);
    setEditMandantId(String(row.mandantid ?? ""));
    setRowError(null);
  }

  async function saveEdit(campid: number) {
    setBusyId(campid);
    setRowError(null);
    try {
      const res = await updateCampaign(
        campid,
        editName,
        editDate,
        Number(editMandantId),
      );
      if (!res.ok) {
        setRowError({ id: campid, message: res.error });
        return;
      }
      setEditingId(null);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(campid: number) {
    setBusyId(campid);
    setRowError(null);
    try {
      const res = await deleteCampaign(campid);
      if (!res.ok) {
        setRowError({ id: campid, message: res.error });
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  function handleExport() {
    const csv = unparseCsv(
      ["campid", "mandant", "name", "date", "createdAt"],
      rows.map((r) => [r.campid, r.mandantName ?? "", r.name, r.date, r.createdAt]),
    );
    downloadTextFile("kampagnen.csv", csv);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Neue Kampagne</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[160px_1fr_160px_auto]">
              <Select value={newMandantId} onValueChange={setNewMandantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Mandant" />
                </SelectTrigger>
                <SelectContent>
                  {mandanten.map((m) => (
                    <SelectItem key={m.mandantid} value={String(m.mandantid)}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Name (z. B. PHV Sommer)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Input
                placeholder="MM.JJJJ"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
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
          <CardTitle className="text-sm">Kampagnen ({rows.length})</CardTitle>
          <Button type="button" variant="outline" onClick={handleExport}>
            Als CSV exportieren
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>campid</TableHead>
                  <TableHead>Mandant</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Erstellt</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const isEditing = editingId === row.campid;
                  return (
                    <TableRow key={row.campid}>
                      <TableCell>{row.campid}</TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select value={editMandantId} onValueChange={setEditMandantId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Mandant" />
                            </SelectTrigger>
                            <SelectContent>
                              {mandanten.map((m) => (
                                <SelectItem key={m.mandantid} value={String(m.mandantid)}>
                                  {m.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          row.mandantName ?? "–"
                        )}
                      </TableCell>
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
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                          />
                        ) : (
                          row.date
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
                              disabled={busyId === row.campid}
                              onClick={() => saveEdit(row.campid)}
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
                              disabled={busyId === row.campid}
                              onClick={() => handleDelete(row.campid)}
                            >
                              Löschen
                            </Button>
                          </div>
                        )}
                        {rowError?.id === row.campid && (
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
                      colSpan={6}
                      className="py-6 text-center text-muted-foreground"
                    >
                      Keine Kampagnen vorhanden.
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
