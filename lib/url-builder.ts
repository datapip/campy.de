export const TRACKING_PARAMS = ["tid", "campid", "siteid", "meid"] as const;

/** Params our app owns end-to-end; a base URL may not already contain any of these. */
export const RESERVED_QUERY_PARAMS = [...TRACKING_PARAMS, "vkclkid"] as const;

export type ValidateBaseUrlResult =
  | { ok: true; url: URL }
  | { ok: false; error: string };

/**
 * Validates a user-supplied base URL: must be an absolute http(s) URL and
 * must not already carry any of our tracking query parameters.
 */
export function validateBaseUrl(raw: string): ValidateBaseUrlResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Bitte eine Ziel-URL angeben." };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return {
      ok: false,
      error:
        "Bitte eine gültige absolute URL eingeben (z. B. https://www.beispiel.de/seite.html).",
    };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Nur http(s)-URLs sind erlaubt." };
  }

  const existing = RESERVED_QUERY_PARAMS.filter((p) => url.searchParams.has(p));
  if (existing.length > 0) {
    return {
      ok: false,
      error: `Die URL enthält bereits den/die Parameter "${existing.join(
        '", "',
      )}". Bitte eine URL ohne Tracking-Parameter verwenden.`,
    };
  }

  return { ok: true, url };
}

export type TrackingParams = {
  tid: number;
  campid: number;
  siteid: number;
  meid: number;
  /**
   * Optional platform click-ID template configured for the site (e.g.
   * "{campaignid}_{adgroupid}_{creative}" for Google, "{{ad.id}}" for
   * Facebook). Appended last, as `&vkclkid=...`.
   */
  vkclkidTemplate?: string | null;
};

/**
 * Percent-encodes a vkclkid template while preserving literal `{`/`}`
 * placeholders, which ad platforms substitute at click time and therefore
 * must remain unencoded in the final URL.
 */
function encodeVkclkidTemplate(template: string): string {
  return encodeURIComponent(template).replace(/%7B/g, "{").replace(/%7D/g, "}");
}

/**
 * Appends tracking parameters (in fixed order tid, campid, siteid, meid,
 * then vkclkid if configured) to a base URL using the URL API, so existing
 * query strings are handled correctly. The fragment (`#...`) is set aside
 * before appending and re-attached last, since vkclkid's placeholder braces
 * must bypass the URL API's automatic percent-encoding.
 */
export function buildTrackingUrl(baseUrl: string, params: TrackingParams): string {
  const url = new URL(baseUrl);
  const hash = url.hash;
  url.hash = "";

  url.searchParams.append("tid", String(params.tid));
  url.searchParams.append("campid", String(params.campid));
  url.searchParams.append("siteid", String(params.siteid));
  url.searchParams.append("meid", String(params.meid));

  let result = url.toString();

  if (params.vkclkidTemplate) {
    result += `&vkclkid=${encodeVkclkidTemplate(params.vkclkidTemplate)}`;
  }

  return result + hash;
}
