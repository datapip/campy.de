import { MandantenManager } from "@/components/admin/MandantenManager";
import { getMandanten } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default function MandantenPage() {
  const rows = getMandanten();

  return <MandantenManager rows={rows} />;
}
