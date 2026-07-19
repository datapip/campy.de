import { VerlaufTable } from "@/components/VerlaufTable";
import { getTidsWithRelations } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default function VerlaufPage() {
  const rows = getTidsWithRelations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Verlauf</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Alle bisher generierten Tracking-URLs, neueste zuerst.
        </p>
      </div>
      <VerlaufTable rows={rows} />
    </div>
  );
}
