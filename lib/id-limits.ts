export const ID_LIMITS = {
  meid: 89,
  siteid: 899,
  campid: 8999,
  tid: 89999,
} as const;

export function getExhaustionWarnings(max: {
  campid: number;
  siteid: number;
  meid: number;
  tid: number;
}): string[] {
  const warnings: string[] = [];
  if (max.meid > ID_LIMITS.meid) {
    warnings.push(
      `Die Medium-ID nähert sich dem Maximum (aktuell höchste meid: ${max.meid}, 2-stellig).`,
    );
  }
  if (max.siteid > ID_LIMITS.siteid) {
    warnings.push(
      `Die Site-ID nähert sich dem Maximum (aktuell höchste siteid: ${max.siteid}, 3-stellig).`,
    );
  }
  if (max.campid > ID_LIMITS.campid) {
    warnings.push(
      `Die Kampagnen-ID nähert sich dem Maximum (aktuell höchste campid: ${max.campid}, 4-stellig).`,
    );
  }
  if (max.tid > ID_LIMITS.tid) {
    warnings.push(
      `Die Tracking-ID nähert sich dem Maximum (aktuell höchste tid: ${max.tid}, 5-stellig).`,
    );
  }
  return warnings;
}
