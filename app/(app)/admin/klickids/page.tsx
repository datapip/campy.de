import { KlickIdsManager } from "@/components/admin/KlickIdsManager";
import { getSites } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default function KlickIdsPage() {
  const rows = getSites();

  return <KlickIdsManager rows={rows} />;
}
