import { GeneratorTabs } from "@/components/GeneratorTabs";
import { VerlaufTable } from "@/components/VerlaufTable";
import {
  getCampaigns,
  getMediums,
  getSites,
  getTidsWithRelations,
} from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default function GeneratorPage() {
  const campaigns = getCampaigns();
  const sites = getSites();
  const mediums = getMediums();
  const rows = getTidsWithRelations();

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Ziel-URL Generator</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Erstellt Kampagnen-Tracking-URLs mit automatisch vergebener Tracking-ID.
          </p>
        </div>
        <GeneratorTabs campaigns={campaigns} sites={sites} mediums={mediums} />
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Verlauf</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Alle bisher generierten Tracking-URLs, neueste zuerst.
          </p>
        </div>
        <VerlaufTable rows={rows} />
      </div>
    </div>
  );
}
