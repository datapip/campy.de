/**
 * Maps a medium ID to the site IDs it's restricted to. A meid with no entry
 * (or an empty array) is unrestricted and stays selectable for every site.
 */
export type MediumSiteMap = Record<number, number[]>;

export function isMediumAllowedForSite(
  meid: number,
  siteid: number,
  map: MediumSiteMap,
): boolean {
  const allowed = map[meid];
  if (!allowed || allowed.length === 0) return true;
  return allowed.includes(siteid);
}

export function filterMediumsForSite<M extends { meid: number }>(
  mediums: M[],
  map: MediumSiteMap,
  siteid: number,
): M[] {
  return mediums.filter((m) => isMediumAllowedForSite(m.meid, siteid, map));
}
