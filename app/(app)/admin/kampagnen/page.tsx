import { KampagnenManager } from "@/components/admin/KampagnenManager";
import { WarningBanner } from "@/components/admin/WarningBanner";
import { getCampaigns, getMaxIds } from "@/lib/db/queries";
import { getExhaustionWarnings } from "@/lib/id-limits";

export const dynamic = "force-dynamic";

export default function KampagnenPage() {
  const rows = getCampaigns();
  const warnings = getExhaustionWarnings(getMaxIds());

  return (
    <div className="space-y-4">
      <WarningBanner messages={warnings} />
      <KampagnenManager rows={rows} />
    </div>
  );
}
