const CHECK_TIMEOUT_MS = 8000;

export type UrlCheckResult = {
  ok: boolean;
  status: number | null;
  error?: string;
};

/**
 * Probes a generated tracking URL server-side so the user can see immediately
 * whether it resolves. Tries HEAD first (cheaper, no body download); some
 * landing-page servers reject HEAD (405 or a network-level refusal), so we
 * fall back to GET in that case. Never throws — failures are reported as
 * `{ ok: false, error }` so a broken target site can't break URL generation.
 */
export async function checkUrlStatus(url: string): Promise<UrlCheckResult> {
  const head = await probe(url, "HEAD");
  if (head.ok || (head.status !== null && head.status !== 405)) {
    return head;
  }
  return probe(url, "GET");
}

async function probe(url: string, method: "HEAD" | "GET"): Promise<UrlCheckResult> {
  try {
    const res = await fetch(url, {
      method,
      redirect: "follow",
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });
    // Drain/cancel the body so Node doesn't keep the connection open for GET checks.
    await res.body?.cancel();
    return { ok: res.ok, status: res.status };
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return { ok: false, status: null, error: "Zeitüberschreitung bei der Prüfung." };
    }
    return {
      ok: false,
      status: null,
      error: "URL konnte nicht erreicht werden.",
    };
  }
}
