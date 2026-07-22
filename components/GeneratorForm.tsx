"use client";

import { useEffect, useMemo, useState } from "react";
import { checkTargetUrl, generateUrl } from "@/app/actions/generator";
import { formatCampaign, formatMedium, formatSite } from "@/lib/format";
import type { UrlCheckResult } from "@/lib/http-check";
import { filterMediumsForSite, type MediumSiteMap } from "@/lib/site-mediums";
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

type Campaign = {
  campid: number;
  name: string;
  date: string;
  mandantName: string | null;
};
type Site = { siteid: number; name: string };
type Medium = { meid: number; name: string };

export function GeneratorForm({
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
  const [campid, setCampid] = useState(String(campaigns[0]?.campid ?? ""));
  const [siteid, setSiteid] = useState(String(sites[0]?.siteid ?? ""));

  const allowedMediums = useMemo(
    () =>
      siteid ? filterMediumsForSite(mediums, mediumSiteMap, Number(siteid)) : mediums,
    [siteid, mediums, mediumSiteMap],
  );

  const [meid, setMeid] = useState(String(allowedMediums[0]?.meid ?? ""));

  useEffect(() => {
    if (!allowedMediums.some((m) => String(m.meid) === meid)) {
      setMeid(String(allowedMediums[0]?.meid ?? ""));
    }
    // Only re-run when the allowed set changes, not on every meid edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedMediums]);

  const [note, setNote] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<UrlCheckResult | null>(null);
  const [result, setResult] = useState<{
    tid: number;
    generatedUrl: string;
    urlCheck: UrlCheckResult;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setPendingConfirm(null);

    if (!campid || !siteid || !meid) {
      setError("Bitte Kampagne, Site und Medium auswählen.");
      return;
    }

    setChecking(true);
    try {
      const check = await checkTargetUrl({
        campid: Number(campid),
        siteid: Number(siteid),
        meid: Number(meid),
        baseUrl,
      });
      if (!check.ok) {
        setError(check.error);
        return;
      }
      if (check.data.ok) {
        await doGenerate(check.data);
      } else {
        setPendingConfirm(check.data);
      }
    } finally {
      setChecking(false);
    }
  }

  async function doGenerate(urlCheck: UrlCheckResult) {
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
      setPendingConfirm(null);
      setResult({ ...res.data, urlCheck });
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
                    <SelectValue
                      placeholder={
                        allowedMediums.length === 0
                          ? "Keine Medien für diese Site"
                          : "Keine Medien"
                      }
                    />
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

            {pendingConfirm ? (
              <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                <p>
                  Die Ziel-URL scheint nicht erreichbar zu sein
                  {pendingConfirm.status !== null
                    ? ` (Status ${pendingConfirm.status})`
                    : ""}
                  {pendingConfirm.error ? `: ${pendingConfirm.error}` : ""}. Trotzdem
                  eine Tracking-ID dafür generieren?
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    disabled={submitting}
                    onClick={() => doGenerate(pendingConfirm)}
                  >
                    {submitting ? "Wird generiert…" : "Trotzdem generieren"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={submitting}
                    onClick={() => setPendingConfirm(null)}
                  >
                    Abbrechen
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <Button type="submit" disabled={checking || submitting}>
                  {checking
                    ? "Ziel-URL wird geprüft…"
                    : submitting
                      ? "Wird generiert…"
                      : "URL generieren"}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="pt-8 space-y-3">
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
            <UrlCheckStatus urlCheck={result.urlCheck} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function UrlCheckStatus({ urlCheck }: { urlCheck: UrlCheckResult }) {
  if (urlCheck.ok) {
    return (
      <p className="text-sm text-green-700 dark:text-green-400">
        Ziel-URL erreichbar ({urlCheck.status} OK)
      </p>
    );
  }

  return (
    <p className="text-sm text-destructive">
      Ziel-URL nicht erreichbar
      {urlCheck.status !== null ? ` (Status ${urlCheck.status})` : ""}
      {urlCheck.error ? `: ${urlCheck.error}` : ""}
    </p>
  );
}
