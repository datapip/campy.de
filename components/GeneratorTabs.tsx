"use client";

import type { MediumSiteMap } from "@/lib/site-mediums";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BulkUpload } from "./BulkUpload";
import { GeneratorForm } from "./GeneratorForm";

type Campaign = {
  campid: number;
  name: string;
  date: string;
  mandantName: string | null;
};
type Site = { siteid: number; name: string };
type Medium = { meid: number; name: string };

export function GeneratorTabs({
  campaigns,
  sites,
  mediums,
  mediumSiteMap,
}: {
  campaigns: Campaign[];
  sites: Site[];
  mediums: Medium[];
  mediumSiteMap: MediumSiteMap;
}) {
  return (
    <Tabs defaultValue="single" className="space-y-6">
      <TabsList>
        <TabsTrigger value="single">Einzeln generieren</TabsTrigger>
        <TabsTrigger value="bulk">Bulk-Upload</TabsTrigger>
      </TabsList>

      <TabsContent value="single">
        <GeneratorForm
          campaigns={campaigns}
          sites={sites}
          mediums={mediums}
          mediumSiteMap={mediumSiteMap}
        />
      </TabsContent>
      <TabsContent value="bulk">
        <BulkUpload
          campaigns={campaigns}
          sites={sites}
          mediums={mediums}
          mediumSiteMap={mediumSiteMap}
        />
      </TabsContent>
    </Tabs>
  );
}
