import { SitesManager } from "@/components/admin/SitesManager";
import { WarningBanner } from "@/components/admin/WarningBanner";
import { getMaxIds, getSites } from "@/lib/db/queries";
import { getExhaustionWarnings } from "@/lib/id-limits";

export const dynamic = "force-dynamic";

export default function SitesPage() {
  const rows = getSites();
  const warnings = getExhaustionWarnings(getMaxIds());

  return (
    <div className="space-y-4">
      <WarningBanner messages={warnings} />
      <SitesManager rows={rows} />
    </div>
  );
}
