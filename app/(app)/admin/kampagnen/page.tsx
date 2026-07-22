import { KampagnenManager } from "@/components/admin/KampagnenManager";
import { WarningBanner } from "@/components/admin/WarningBanner";
import { getCampaigns, getMandanten, getMaxIds } from "@/lib/db/queries";
import { getExhaustionWarnings } from "@/lib/id-limits";

export const dynamic = "force-dynamic";

export default function KampagnenPage() {
  const rows = getCampaigns();
  const mandanten = getMandanten();
  const warnings = getExhaustionWarnings(getMaxIds());

  return (
    <div className="space-y-4">
      <WarningBanner messages={warnings} />
      <KampagnenManager rows={rows} mandanten={mandanten} />
    </div>
  );
}
