"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BulkUpload } from "./BulkUpload";
import { GeneratorForm } from "./GeneratorForm";

type Campaign = { campid: number; name: string; date: string };
type Site = { siteid: number; name: string };
type Medium = { meid: number; name: string };

export function GeneratorTabs({
  campaigns,
  sites,
  mediums,
}: {
  campaigns: Campaign[];
  sites: Site[];
  mediums: Medium[];
}) {
  return (
    <Tabs defaultValue="single" className="space-y-6">
      <TabsList>
        <TabsTrigger value="single">Einzeln generieren</TabsTrigger>
        <TabsTrigger value="bulk">Bulk-Upload</TabsTrigger>
      </TabsList>

      <TabsContent value="single">
        <GeneratorForm campaigns={campaigns} sites={sites} mediums={mediums} />
      </TabsContent>
      <TabsContent value="bulk">
        <BulkUpload campaigns={campaigns} sites={sites} mediums={mediums} />
      </TabsContent>
    </Tabs>
  );
}
