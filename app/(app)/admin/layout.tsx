import { AdminNav } from "@/components/admin/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Verwaltung</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stammdaten für Kampagnen, Sites und Medien pflegen.
        </p>
      </div>
      <AdminNav />
      {children}
    </div>
  );
}
