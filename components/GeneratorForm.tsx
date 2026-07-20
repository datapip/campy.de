"use client";

import { useState } from "react";
import { generateUrl } from "@/app/actions/generator";
import { formatCampaign, formatMedium, formatSite } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopyButton } from "./CopyButton";

type Campaign = { campid: number; name: string; date: string };
type Site = { siteid: number; name: string };
type Medium = { meid: number; name: string };

export function GeneratorForm({
  campaigns,
  sites,
  mediums,
}: {
  campaigns: Campaign[];
  sites: Site[];
  mediums: Medium[];
}) {
  const [campid, setCampid] = useState(String(campaigns[0]?.campid ?? ""));
  const [siteid, setSiteid] = useState(String(sites[0]?.siteid ?? ""));
  const [meid, setMeid] = useState(String(mediums[0]?.meid ?? ""));
  const [note, setNote] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    tid: number;
    generatedUrl: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!campid || !siteid || !meid) {
      setError("Bitte Kampagne, Site und Medium auswählen.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await generateUrl({
        campid: Number(campid),
        siteid: Number(siteid),
        meid: Number(meid),
        note,
        baseUrl,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(res.data);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="campid">Kampagne</Label>
                <Select value={campid} onValueChange={setCampid}>
                  <SelectTrigger id="campid" className="w-full">
                    <SelectValue placeholder="Keine Kampagnen" />
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
                <Label htmlFor="siteid">Site</Label>
                <Select value={siteid} onValueChange={setSiteid}>
                  <SelectTrigger id="siteid" className="w-full">
                    <SelectValue placeholder="Keine Sites" />
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
                <Label htmlFor="meid">Medium</Label>
                <Select value={meid} onValueChange={setMeid}>
                  <SelectTrigger id="meid" className="w-full">
                    <SelectValue placeholder="Keine Medien" />
                  </SelectTrigger>
                  <SelectContent>
                    {mediums.map((m) => (
                      <SelectItem key={m.meid} value={String(m.meid)}>
                        {formatMedium(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="note">Notiz zur Tracking-ID (optional)</Label>
              <Input
                id="note"
                type="text"
                placeholder="z. B. Motiv spielende Kinder"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="baseUrl">Ziel-URL</Label>
              <Input
                id="baseUrl"
                type="text"
                placeholder="https://www.example.de/lp/seite.html"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Wird generiert…" : "URL generieren"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-primary/20 bg-accent/40">
          <CardContent className="space-y-3">
            <p className="text-sm font-medium">
              Zugewiesene Tracking-ID:{" "}
              <span className="font-semibold">{result.tid}</span>
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                className="font-mono text-xs sm:text-sm"
                readOnly
                value={result.generatedUrl}
                onFocus={(e) => e.currentTarget.select()}
              />
              <CopyButton text={result.generatedUrl} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
