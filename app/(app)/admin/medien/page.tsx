import { MedienManager } from "@/components/admin/MedienManager";
import { WarningBanner } from "@/components/admin/WarningBanner";
import { getMaxIds, getMediums, getMediumSiteMap, getSites } from "@/lib/db/queries";
import { getExhaustionWarnings } from "@/lib/id-limits";

export const dynamic = "force-dynamic";

export default function MedienPage() {
  const rows = getMediums();
  const sites = getSites();
  const mediumSiteMap = getMediumSiteMap();
  const warnings = getExhaustionWarnings(getMaxIds());

  return (
    <div className="space-y-4">
      <WarningBanner messages={warnings} />
      <MedienManager rows={rows} sites={sites} mediumSiteMap={mediumSiteMap} />
    </div>
  );
}
